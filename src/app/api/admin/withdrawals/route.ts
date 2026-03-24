import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberAvailableBalance } from "@/lib/wallet";
import { createAuditLog } from "@/lib/audit";
import { initiateB2CPayout } from "@/lib/mpesa";
import { createNotification } from "@/lib/notifications";
import { sendSmsSafe } from "@/lib/sms";

const reviewSchema = z.object({
  withdrawalId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED"]),
  payoutReference: z.string().max(100).optional(),
  payoutChannel: z.string().max(50).optional(),
});

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.withdrawalRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { member: true },
    take: 200,
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      memberName: row.member.name,
      amount: row.amount,
      phoneNumber: row.phoneNumber,
      status: row.status,
      note: row.note,
      payoutReference: row.payoutReference,
      payoutChannel: row.payoutChannel,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    })),
  );
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.withdrawalRequest.findUnique({
    where: { id: parsed.data.withdrawalId },
    include: { member: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Withdrawal not found" }, { status: 404 });
  }
  if (existing.status !== "PENDING") {
    return NextResponse.json({ error: "Withdrawal already reviewed" }, { status: 400 });
  }

  let payoutReference = parsed.data.payoutReference ?? null;
  let payoutChannel = parsed.data.payoutChannel ?? null;

  if (parsed.data.decision === "APPROVED") {
    if (!existing.phoneNumber) {
      return NextResponse.json({ error: "Withdrawal phone number is required for B2C" }, { status: 400 });
    }
    const balance = await getMemberAvailableBalance(existing.memberId);
    if (existing.amount > balance) {
      return NextResponse.json({ error: "Insufficient member balance at review time" }, { status: 400 });
    }

    try {
      const b2c = await initiateB2CPayout({
        amount: existing.amount,
        phoneNumber: existing.phoneNumber,
        withdrawalId: existing.id,
        remarks: `HealthNet withdrawal ${existing.id}`,
      });
      payoutReference =
        ((b2c.ConversationID as string | undefined) ??
          (b2c.OriginatorConversationID as string | undefined) ??
          parsed.data.payoutReference ??
          null);
      payoutChannel = "mpesa_b2c";
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `B2C initiation failed: ${error.message}`
              : "B2C initiation failed",
        },
        { status: 400 },
      );
    }
  }

  const updatedCount = await prisma.withdrawalRequest.updateMany({
    where: { id: existing.id, status: "PENDING" },
    data: {
      status: parsed.data.decision,
      reviewedAt: new Date(),
      reviewedBy: admin.id,
      payoutReference,
      payoutChannel,
    },
  });
  if (updatedCount.count === 0) {
    return NextResponse.json({ error: "Withdrawal was already reviewed by another action" }, { status: 409 });
  }

  const refreshed = await prisma.withdrawalRequest.findUnique({ where: { id: existing.id } });
  if (!refreshed) {
    return NextResponse.json({ error: "Withdrawal update failed" }, { status: 500 });
  }

  await createAuditLog({
    actorUserId: admin.id,
    action: `withdrawal.${parsed.data.decision.toLowerCase()}`,
    targetType: "WithdrawalRequest",
    targetId: refreshed.id,
    metadata: {
      memberId: refreshed.memberId,
      amount: refreshed.amount,
      payoutReference: refreshed.payoutReference,
      payoutChannel: refreshed.payoutChannel,
    },
  });

  if (existing.member.userId) {
    await createNotification({
      userId: existing.member.userId,
      title: `Withdrawal ${parsed.data.decision.toLowerCase()}`,
      message: `Your withdrawal request of ${refreshed.amount.toFixed(2)} is ${refreshed.status.toLowerCase()}.`,
      link: "/?tab=withdrawals",
    });
  }
  await sendSmsSafe({
    to: refreshed.phoneNumber,
    message: `HealthNet: Withdrawal ${refreshed.status.toLowerCase()} for ${refreshed.amount.toFixed(2)}.`,
    userId: existing.member.userId,
    memberId: refreshed.memberId,
  });

  return NextResponse.json({
    id: refreshed.id,
    memberId: refreshed.memberId,
    memberName: existing.member.name,
    amount: refreshed.amount,
    phoneNumber: refreshed.phoneNumber,
    status: refreshed.status,
    note: refreshed.note,
    payoutReference: refreshed.payoutReference,
    payoutChannel: refreshed.payoutChannel,
    createdAt: refreshed.createdAt.toISOString(),
    reviewedAt: refreshed.reviewedAt?.toISOString() ?? null,
  });
}
