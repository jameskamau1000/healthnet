import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initiateStkPush } from "@/lib/mpesa";
import { createAuditLog } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";

const depositSchema = z.object({
  amount: z.number().positive(),
  phoneNumber: z.string().min(10).max(20),
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

  const deposits = await prisma.depositRequest.findMany({
    where: { memberId: member.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(
    deposits.map((row) => ({
      id: row.id,
      amount: row.amount,
      phoneNumber: row.phoneNumber,
      status: row.status,
      mpesaReceiptNumber: row.mpesaReceiptNumber,
      merchantRequestId: row.merchantRequestId,
      checkoutRequestId: row.checkoutRequestId,
      customerMessage: row.customerMessage,
      createdAt: row.createdAt.toISOString(),
    })),
  );
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
  const parsed = depositSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let stkResponse: Record<string, unknown>;
  try {
    stkResponse = await initiateStkPush({
      amount: parsed.data.amount,
      phoneNumber: parsed.data.phoneNumber,
      accountReference: `HN-${member.id.slice(-6).toUpperCase()}`,
      transactionDesc: "HealthNet account deposit",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? `STK initiation failed: ${error.message}` : "STK initiation failed",
      },
      { status: 400 },
    );
  }

  const row = await prisma.depositRequest.create({
    data: {
      memberId: member.id,
      amount: parsed.data.amount,
      phoneNumber: parsed.data.phoneNumber,
      status: "PENDING",
      merchantRequestId: (stkResponse.MerchantRequestID as string | undefined) ?? null,
      checkoutRequestId: (stkResponse.CheckoutRequestID as string | undefined) ?? null,
      customerMessage: (stkResponse.CustomerMessage as string | undefined) ?? null,
    },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "deposit.stk.request",
    targetType: "DepositRequest",
    targetId: row.id,
    metadata: {
      amount: row.amount,
      phoneNumber: row.phoneNumber,
      checkoutRequestId: row.checkoutRequestId,
    },
  });

  await notifyAdmins({
    title: "Deposit initiated",
    message: `${member.name} initiated STK deposit of ${row.amount.toFixed(2)}.`,
    link: "/?tab=deposits",
  });

  return NextResponse.json({
    id: row.id,
    amount: row.amount,
    phoneNumber: row.phoneNumber,
    status: row.status,
    merchantRequestId: row.merchantRequestId,
    checkoutRequestId: row.checkoutRequestId,
    customerMessage: row.customerMessage,
    createdAt: row.createdAt.toISOString(),
  });
}
