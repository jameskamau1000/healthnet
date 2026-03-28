import { prisma } from "@/lib/prisma";

/** True if walking `binaryParentId` from `targetMemberId` eventually reaches `viewerMemberId` (viewer is on the upline chain). */
export async function viewerIsBinaryAncestorOf(
  viewerMemberId: string,
  targetMemberId: string,
): Promise<boolean> {
  let cur: string | null = targetMemberId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    guard.add(cur);
    if (cur === viewerMemberId) return true;
    const next: { binaryParentId: string | null } | null = await prisma.member.findUnique({
      where: { id: cur },
      select: { binaryParentId: true },
    });
    cur = next?.binaryParentId ?? null;
  }
  return false;
}
