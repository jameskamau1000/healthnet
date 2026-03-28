import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";
import { viewerIsBinaryAncestorOf } from "@/lib/binary-tree-guard";
import { prisma } from "@/lib/prisma";
import { getPublicSiteUrl } from "@/lib/public-url";

export async function GET(request: Request) {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const viewer = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      memberProfile: {
        include: { package: true },
      },
    },
  });

  if (!viewer || !viewer.memberProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const viewerMemberId = viewer.memberProfile.id;
  const { searchParams } = new URL(request.url);
  const rootMemberIdParam = searchParams.get("rootMemberId")?.trim() ?? null;

  let rootMember = viewer.memberProfile;
  let rootUser = viewer;

  if (rootMemberIdParam) {
    const allowed = await viewerIsBinaryAncestorOf(viewerMemberId, rootMemberIdParam);
    if (!allowed) {
      return NextResponse.json({ error: "Not in your tree" }, { status: 403 });
    }
    const target = await prisma.member.findUnique({
      where: { id: rootMemberIdParam },
      include: { user: true, package: true },
    });
    if (!target?.user || !target.package) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    rootMember = target as typeof rootMember;
    rootUser = target.user as typeof rootUser;
  }

  const maxDepth = 4;
  const nodes: Array<{
    id: string;
    memberId: string | null;
    parentMemberId: string | null;
    position: "LEFT" | "RIGHT" | null;
    depth: number;
    name: string;
    email: string | null;
    referralCode: string | null;
    packageName: string | null;
    rank: string | null;
    councilStatus: string | null;
    isPlaceholder: boolean;
    createdAt: string;
  }> = [
    {
      id: rootMember.id,
      memberId: rootMember.id,
      parentMemberId: null,
      position: null,
      depth: 0,
      name: rootUser.name,
      email: rootUser.email,
      referralCode: rootUser.referralCode,
      packageName: rootMember.package.name,
      rank: rootMember.rank,
      councilStatus: rootMember.councilStatus,
      isPlaceholder: false,
      createdAt: rootUser.createdAt.toISOString(),
    },
  ];

  let frontier: string[] = [rootMember.id];
  let depth = 1;

  while (frontier.length > 0 && depth <= maxDepth) {
    const levelMembers = await prisma.member.findMany({
      where: { binaryParentId: { in: frontier } },
      orderBy: { createdAt: "asc" },
      include: {
        user: true,
        package: true,
      },
    });

    const byParent = new Map<string, typeof levelMembers>();
    for (const row of levelMembers) {
      const parentId = row.binaryParentId as string;
      const arr = byParent.get(parentId) ?? [];
      arr.push(row);
      byParent.set(parentId, arr);
    }

    const nextFrontier: string[] = [];
    for (const parentId of frontier) {
      const childRows = byParent.get(parentId) ?? [];
      const left = childRows.find((row) => row.binaryPosition === "LEFT");
      const right = childRows.find((row) => row.binaryPosition === "RIGHT");

      for (const slot of [
        { side: "LEFT" as const, row: left },
        { side: "RIGHT" as const, row: right },
      ]) {
        if (slot.row) {
          nodes.push({
            id: slot.row.id,
            memberId: slot.row.id,
            parentMemberId: parentId,
            position: slot.side,
            depth,
            name: slot.row.name,
            email: slot.row.user?.email ?? null,
            referralCode: slot.row.user?.referralCode ?? null,
            packageName: slot.row.package?.name ?? null,
            rank: slot.row.rank,
            councilStatus: slot.row.councilStatus,
            isPlaceholder: false,
            createdAt: slot.row.createdAt.toISOString(),
          });
          nextFrontier.push(slot.row.id);
        } else {
          nodes.push({
            id: `${parentId}-${slot.side}-${depth}-placeholder`,
            memberId: null,
            parentMemberId: parentId,
            position: slot.side,
            depth,
            name: "No User",
            email: null,
            referralCode: null,
            packageName: null,
            rank: null,
            councilStatus: null,
            isPlaceholder: true,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    frontier = nextFrontier;
    depth += 1;
  }

  const directReferrals = await prisma.user.findMany({
    where: { referredById: rootUser.id },
    orderBy: { createdAt: "asc" },
    include: {
      memberProfile: {
        include: { package: true },
      },
    },
  });

  const totalDownline = nodes.filter((n) => !n.isPlaceholder && n.depth > 0).length;
  const base = getPublicSiteUrl(request);
  const leftLink = `${base}/?ref=${encodeURIComponent(rootUser.referralCode)}&position=left`;
  const rightLink = `${base}/?ref=${encodeURIComponent(rootUser.referralCode)}&position=right`;

  return NextResponse.json({
    rootUserId: rootUser.id,
    viewRootMemberId: rootMember.id,
    viewingOwnTree: rootMember.id === viewerMemberId,
    viewerMemberId,
    referralCode: rootUser.referralCode,
    referralLinks: { leftLink, rightLink },
    directReferralsCount: directReferrals.length,
    totalDownline,
    nodes,
    directReferrals: directReferrals.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      packageName: row.memberProfile?.package.name ?? null,
      rank: row.memberProfile?.rank ?? null,
      joinedAt: row.createdAt.toISOString(),
    })),
  });
}
