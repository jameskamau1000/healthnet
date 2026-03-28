import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Walk up binary parents until null; true if `viewerRootMemberId` appears on the path from target (inclusive). */
async function memberIsInViewerTree(viewerRootMemberId: string, targetMemberId: string): Promise<boolean> {
  let cur: string | null = targetMemberId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    if (cur === viewerRootMemberId) return true;
    const next: { binaryParentId: string | null } | null = await prisma.member.findUnique({
      where: { id: cur },
      select: { binaryParentId: true },
    });
    cur = next?.binaryParentId ?? null;
  }
  return false;
}

/** All member ids in the binary subtree rooted at `rootId` (including root). */
async function collectSubtreeMemberIds(rootId: string): Promise<string[]> {
  const ids: string[] = [];
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    ids.push(id);
    const children = await prisma.member.findMany({
      where: { binaryParentId: id },
      select: { id: true },
    });
    for (const c of children) queue.push(c.id);
  }
  return ids;
}

async function legAggregates(legRootId: string | null): Promise<{
  totalPv: number;
  paidMembers: number;
  freeMembers: number;
}> {
  if (!legRootId) {
    return { totalPv: 0, paidMembers: 0, freeMembers: 0 };
  }
  const ids = await collectSubtreeMemberIds(legRootId);
  if (ids.length === 0) {
    return { totalPv: 0, paidMembers: 0, freeMembers: 0 };
  }
  const members = await prisma.member.findMany({
    where: { id: { in: ids } },
    include: { package: true },
  });
  let totalPv = 0;
  let paidMembers = 0;
  let freeMembers = 0;
  for (const m of members) {
    totalPv += m.personalVolume;
    const price = m.package?.price ?? 0;
    if (price > 0) paidMembers += 1;
    else freeMembers += 1;
  }
  return { totalPv, paidMembers, freeMembers };
}

function rankLabel(rank: string, packagePrice: number): string {
  const paid = packagePrice > 0 ? "Paid " : "Free ";
  const map: Record<string, string> = {
    STARTER: "Starter",
    FAIR: "Fair",
    GOOD: "Good",
    BETTER: "Better",
    BEST: "Best",
    COUNCIL: "Council",
  };
  return paid + (map[rank] ?? rank);
}

export async function GET(request: Request) {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId")?.trim();
  if (!memberId) {
    return NextResponse.json({ error: "memberId required" }, { status: 400 });
  }

  const viewer = await prisma.user.findUnique({
    where: { id: user.id },
    include: { memberProfile: true },
  });
  if (!viewer?.memberProfile) {
    return NextResponse.json({ error: "Member profile required" }, { status: 403 });
  }

  const viewerRootId = viewer.memberProfile.id;
  const allowed = await memberIsInViewerTree(viewerRootId, memberId);
  if (!allowed) {
    return NextResponse.json({ error: "Not in your tree" }, { status: 403 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      package: true,
      user: {
        include: {
          referredBy: { select: { name: true } },
        },
      },
    },
  });
  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const children = await prisma.member.findMany({
    where: { binaryParentId: memberId },
    select: { id: true, binaryPosition: true },
  });
  const leftChildId = children.find((c) => c.binaryPosition === "LEFT")?.id ?? null;
  const rightChildId = children.find((c) => c.binaryPosition === "RIGHT")?.id ?? null;

  const [leftLeg, rightLeg] = await Promise.all([
    legAggregates(leftChildId),
    legAggregates(rightChildId),
  ]);

  const pkgPrice = member.package?.price ?? 0;

  return NextResponse.json({
    memberId: member.id,
    name: member.name,
    displayUsername: member.user?.referralCode ?? member.name,
    email: member.user?.email ?? null,
    rankLabel: rankLabel(member.rank, pkgPrice),
    rank: member.rank,
    packageName: member.package?.name ?? null,
    referredByName: member.user?.referredBy?.name ?? null,
    leftVolume: member.leftVolume,
    rightVolume: member.rightVolume,
    personalVolume: member.personalVolume,
    left: {
      currentBv: member.leftVolume,
      currentPv: leftLeg.totalPv,
      totalBv: member.leftVolume,
      totalPv: leftLeg.totalPv,
      paidMembers: leftLeg.paidMembers,
      freeMembers: leftLeg.freeMembers,
    },
    right: {
      currentBv: member.rightVolume,
      currentPv: rightLeg.totalPv,
      totalBv: member.rightVolume,
      totalPv: rightLeg.totalPv,
      paidMembers: rightLeg.paidMembers,
      freeMembers: rightLeg.freeMembers,
    },
  });
}
