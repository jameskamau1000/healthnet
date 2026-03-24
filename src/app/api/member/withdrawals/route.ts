import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberAvailableBalance } from "@/lib/wallet";
import { createAuditLog } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";

const createSchema = z.object({
  amount: z.number().positive(),
  phoneNumber: z.string().min(10).max(20),
  note: z.string().max(200).optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) {
    return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
  }

  const [rows, availableBalance] = await Promise.all([
    prisma.withdrawalRequest.findMany({
      where: { memberId: member.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    getMemberAvailableBalance(member.id),
  ]);

  return NextResponse.json({
    availableBalance,
    withdrawals: rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      memberName: member.name,
      amount: row.amount,
      phoneNumber: row.phoneNumber,
      status: row.status,
      note: row.note,
      payoutReference: row.payoutReference,
      payoutChannel: row.payoutChannel,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) {
    return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const balance = await getMemberAvailableBalance(member.id);
  if (parsed.data.amount > balance) {
    return NextResponse.json({ error: "Amount exceeds available balance" }, { status: 400 });
  }

  const row = await prisma.withdrawalRequest.create({
    data: {
      memberId: member.id,
      amount: parsed.data.amount,
      phoneNumber: parsed.data.phoneNumber,
      note: parsed.data.note,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "withdrawal.request",
    targetType: "WithdrawalRequest",
    targetId: row.id,
    metadata: {
      amount: row.amount,
    },
  });

  await notifyAdmins({
    title: "New withdrawal request",
    message: `${member.name} requested ${row.amount.toFixed(2)}.`,
    link: "/?tab=withdrawals",
  });

  return NextResponse.json({
    id: row.id,
    memberId: row.memberId,
    memberName: member.name,
    amount: row.amount,
    phoneNumber: row.phoneNumber,
    status: row.status,
    note: row.note,
    payoutReference: row.payoutReference,
    payoutChannel: row.payoutChannel,
    createdAt: row.createdAt.toISOString(),
    reviewedAt: null,
  });
}
