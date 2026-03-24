import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const root = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      memberProfile: {
        include: { package: true },
      },
    },
  });

  if (!root || !root.memberProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
      id: root.memberProfile.id,
      memberId: root.memberProfile.id,
      parentMemberId: null,
      position: null,
      depth: 0,
      name: root.name,
      email: root.email,
      referralCode: root.referralCode,
      packageName: root.memberProfile.package.name,
      rank: root.memberProfile.rank,
      councilStatus: root.memberProfile.councilStatus,
      isPlaceholder: false,
      createdAt: root.createdAt.toISOString(),
    },
  ];

  let frontier: string[] = [root.memberProfile.id];
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
    where: { referredById: root.id },
    orderBy: { createdAt: "asc" },
    include: {
      memberProfile: {
        include: { package: true },
      },
    },
  });

  const totalDownline = nodes.filter((n) => !n.isPlaceholder && n.depth > 0).length;

  return NextResponse.json({
    rootUserId: root.id,
    referralCode: root.referralCode,
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
