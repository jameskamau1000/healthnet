import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const packageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
  matchingRatios: z.array(z.number().min(0).max(100)),
});

const payloadSchema = z.object({
  packages: z.array(packageSchema),
});

export async function PATCH(request: Request) {
  await ensureBootstrapData();
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.$transaction(
    parsed.data.packages.map((pkg) =>
      prisma.packageTier.update({
        where: { id: pkg.id },
        data: {
          name: pkg.name,
          price: pkg.price,
          matchingRatios: pkg.matchingRatios,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
