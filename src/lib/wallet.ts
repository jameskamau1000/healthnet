import { prisma } from "@/lib/prisma";

export async function getMemberAvailableBalance(memberId: string): Promise<number> {
  const [income, approvedWithdrawals] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: { memberId },
      _sum: { amount: true },
    }),
    prisma.withdrawalRequest.aggregate({
      where: { memberId, status: "APPROVED" },
      _sum: { amount: true },
    }),
  ]);

  const earned = income._sum.amount ?? 0;
  const paidOut = approvedWithdrawals._sum.amount ?? 0;
  return Math.max(0, earned - paidOut);
}
