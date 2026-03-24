import { Prisma } from "@prisma/client";

export type JoinSide = "left" | "right";

const sideOrderMap: Record<JoinSide, Array<"LEFT" | "RIGHT">> = {
  left: ["LEFT", "RIGHT"],
  right: ["RIGHT", "LEFT"],
};

export async function findBinaryPlacement(
  tx: Prisma.TransactionClient,
  rootMemberId: string,
  preferredSide: JoinSide,
): Promise<{ binaryParentId: string; binaryPosition: "LEFT" | "RIGHT" }> {
  const queue: string[] = [rootMemberId];

  while (queue.length > 0) {
    const parentId = queue.shift() as string;
    const childRows = await tx.member.findMany({
      where: { binaryParentId: parentId },
      select: { id: true, binaryPosition: true },
    });

    const childMap = new Map(childRows.map((row) => [row.binaryPosition, row]));
    const sideOrder = parentId === rootMemberId ? sideOrderMap[preferredSide] : ["LEFT", "RIGHT"];

    for (const side of sideOrder) {
      if (!childMap.has(side)) {
        return { binaryParentId: parentId, binaryPosition: side };
      }
    }

    const leftChild = childMap.get("LEFT");
    const rightChild = childMap.get("RIGHT");
    if (leftChild) queue.push(leftChild.id);
    if (rightChild) queue.push(rightChild.id);
  }

  // Fallback should never happen because every visited node is either open or has children.
  return { binaryParentId: rootMemberId, binaryPosition: preferredSide === "left" ? "LEFT" : "RIGHT" };
}
