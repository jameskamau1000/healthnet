import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { sendSmsSafe } from "@/lib/sms";

const approveSchema = z.object({
  memberId: z.string().min(1),
});

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const member = await prisma.member.update({
    where: { id: parsed.data.memberId },
    data: {
      councilStatus: "APPROVED",
      rank: "COUNCIL",
    },
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "council.approve",
    targetType: "Member",
    targetId: member.id,
  });

  if (member.userId) {
    await createNotification({
      userId: member.userId,
      title: "Council approved",
      message: "Your council application has been approved.",
      link: "/?tab=members",
    });
  }
  await sendSmsSafe({
    to: member.phoneNumber,
    message: "Ayur Health International: Your council application has been approved.",
    userId: member.userId,
    memberId: member.id,
  });

  return NextResponse.json({
    id: member.id,
    rank: member.rank,
    councilStatus: member.councilStatus,
  });
}
