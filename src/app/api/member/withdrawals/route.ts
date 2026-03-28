import { NextResponse } from "next/server";
import { z } from "zod";
import { OtpPurpose } from "@prisma/client";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMemberAvailableBalance } from "@/lib/wallet";
import { createAuditLog } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";
import { otpEmailErrorResponse } from "@/lib/email";
import { issueEmailOtp, verifyEmailOtp } from "@/lib/otp";

const createSchema = z.object({
  amount: z.number().positive(),
  phoneNumber: z.string().min(10).max(20),
  note: z.string().max(200).optional(),
});
const verifySchema = z.object({
  challengeId: z.string().min(1),
  otpCode: z.string().length(6),
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
  let amount: number;
  let phoneNumber: string;
  let note: string | undefined;

  if (body?.challengeId && body?.otpCode) {
    const parsedVerify = verifySchema.safeParse(body);
    if (!parsedVerify.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const verified = await verifyEmailOtp({
      challengeId: parsedVerify.data.challengeId,
      code: parsedVerify.data.otpCode,
      purpose: OtpPurpose.WITHDRAWAL,
      actorUserId: user.id,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }
    if (verified.challenge.memberId !== member.id) {
      return NextResponse.json({ error: "OTP challenge does not match this member." }, { status: 403 });
    }
    const payload = verified.challenge.payload as { amount?: number; phoneNumber?: string; note?: string } | null;
    amount = Number(payload?.amount ?? 0);
    phoneNumber = String(payload?.phoneNumber ?? "");
    note = payload?.note;
    if (!amount || !phoneNumber) {
      return NextResponse.json({ error: "Withdrawal payload missing from challenge." }, { status: 400 });
    }
  } else {
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const balance = await getMemberAvailableBalance(member.id);
    if (parsed.data.amount > balance) {
      return NextResponse.json({ error: "Amount exceeds available balance" }, { status: 400 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "Cannot send OTP for this account." }, { status: 400 });
    }

    let issued;
    try {
      issued = await issueEmailOtp({
        purpose: OtpPurpose.WITHDRAWAL,
        recipientEmail: user.email,
        actorUserId: user.id,
        userId: user.id,
        memberId: member.id,
        payload: parsed.data,
      });
    } catch (err) {
      const { body, status } = otpEmailErrorResponse(err);
      return NextResponse.json(body, { status });
    }
    if (!issued.ok) {
      return NextResponse.json({ error: issued.error }, { status: 429 });
    }

    return NextResponse.json({
      otpRequired: true,
      challengeId: issued.challengeId,
      expiresAt: issued.expiresAt,
      resendAvailableAt: issued.resendAvailableAt,
    });
  }

  const balance = await getMemberAvailableBalance(member.id);
  if (amount > balance) {
    return NextResponse.json({ error: "Amount exceeds available balance" }, { status: 400 });
  }

  const row = await prisma.withdrawalRequest.create({
    data: {
      memberId: member.id,
      amount,
      phoneNumber,
      note,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "withdrawal.request",
    targetType: "WithdrawalRequest",
    targetId: row.id,
    metadata: {
      amount: row.amount,
      otpVerified: true,
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
