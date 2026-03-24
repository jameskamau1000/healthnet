import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const settingsSchema = z.object({
  referralPercent: z.number().min(0).max(100),
  binaryPercent: z.number().min(0).max(100),
});

export async function PATCH(request: Request) {
  await ensureBootstrapData();
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await prisma.compensationSetting.update({
    where: { id: "default" },
    data: parsed.data,
  });

  return NextResponse.json({
    referralPercent: updated.referralPercent,
    binaryPercent: updated.binaryPercent,
  });
}
