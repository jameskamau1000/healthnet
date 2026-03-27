import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { mapStkCallback } from "@/lib/mpesa";
import { isCallbackAuthorized } from "@/lib/callback-auth";
import { createNotification } from "@/lib/notifications";
import { sendSmsSafe } from "@/lib/sms";

export async function POST(request: Request) {
  if (!isCallbackAuthorized(request)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unauthorized callback" }, { status: 401 });
  }

  const payload = await request.json();
  const callback = mapStkCallback(payload);
  if (!callback.checkoutRequestId && !callback.merchantRequestId) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const deposit = await prisma.depositRequest.findFirst({
    where: {
      OR: [
        callback.checkoutRequestId ? { checkoutRequestId: callback.checkoutRequestId } : undefined,
        callback.merchantRequestId ? { merchantRequestId: callback.merchantRequestId } : undefined,
      ].filter(Boolean) as Array<{ checkoutRequestId?: string; merchantRequestId?: string }>,
    },
  });

  if (!deposit) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  if (callback.resultCode === 0) {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.depositRequest.findUnique({ where: { id: deposit.id } });
      if (!fresh) return;

      await tx.depositRequest.update({
        where: { id: deposit.id },
        data: {
          status: "SUCCESS",
          mpesaReceiptNumber: callback.receiptNumber,
          rawCallback: payload,
        },
      });

      if (fresh.status !== "SUCCESS") {
        await tx.walletTransaction.create({
          data: {
            memberId: fresh.memberId,
            type: "ADJUSTMENT",
            amount: fresh.amount,
            description: `M-Pesa STK deposit ${callback.receiptNumber ?? ""}`.trim(),
          },
        });
      }
    });

    const member = await prisma.member.findUnique({
      where: { id: deposit.memberId },
      include: { user: true },
    });
    if (member?.userId) {
      await createNotification({
        userId: member.userId,
        title: "Deposit successful",
        message: `Your M-Pesa deposit of ${deposit.amount.toFixed(2)} was successful.`,
        link: "/?tab=deposits",
      });
    }
    await sendSmsSafe({
      to: deposit.phoneNumber,
      message: `Ayur Health International: Deposit of ${deposit.amount.toFixed(2)} received successfully.`,
      userId: member?.userId,
      memberId: deposit.memberId,
    });
  } else {
    await prisma.depositRequest.update({
      where: { id: deposit.id },
      data: {
        status: "FAILED",
        rawCallback: payload,
      },
    });
    await sendSmsSafe({
      to: deposit.phoneNumber,
      message: "Ayur Health International: Your M-Pesa deposit failed. Please try again.",
      memberId: deposit.memberId,
    });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
