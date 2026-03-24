import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const transactions = await prisma.walletTransaction.findMany({
    orderBy: { createdAt: "desc" },
    include: { member: true },
    take: 100,
  });

  return NextResponse.json(
    transactions.map((tx) => ({
      id: tx.id,
      memberId: tx.memberId,
      memberName: tx.member.name,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    })),
  );
}
