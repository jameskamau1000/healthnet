import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.smsDeliveryLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: true,
      member: true,
    },
  });

  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      userName: row.user?.name ?? null,
      memberName: row.member?.name ?? null,
      provider: row.provider,
      toPhone: row.toPhone,
      message: row.message,
      status: row.status,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
    })),
  );
}
