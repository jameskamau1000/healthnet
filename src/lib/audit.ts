import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function createAuditLog(input: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      ...(input.metadata ? { metadata: input.metadata } : {}),
    },
  });
}
