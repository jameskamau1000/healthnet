import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [pendingStk, failedDeposits, pendingWithdrawals, approvedWithoutReference] =
    await Promise.all([
      prisma.depositRequest.count({
        where: { status: "PENDING", createdAt: { lt: tenMinutesAgo } },
      }),
      prisma.depositRequest.count({ where: { status: "FAILED" } }),
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.withdrawalRequest.count({
        where: { status: "APPROVED", OR: [{ payoutReference: null }, { payoutChannel: null }] },
      }),
    ]);

  return NextResponse.json({
    pendingStkOlderThan10Min: pendingStk,
    failedDeposits,
    pendingWithdrawals,
    approvedWithdrawalsMissingPayoutMeta: approvedWithoutReference,
  });
}
