import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";
import { processQualifyingVolume } from "@/lib/everhealthy-engine";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).optional().default(1),
});

export async function POST(request: Request) {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.role !== "MEMBER") {
    return NextResponse.json({ error: "Only members can purchase" }, { status: 403 });
  }

  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) {
    return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, isActive: true },
  });
  if (!product) {
    return NextResponse.json({ error: "Product not available" }, { status: 404 });
  }

  const quantity = parsed.data.quantity ?? 1;
  const bv = product.price * quantity;
  const pv = bv;

  await prisma.$transaction(async (tx) => {
    await processQualifyingVolume(tx, {
      originMemberId: member.id,
      bvAmount: bv,
      pvAmount: pv,
      source: { kind: "product", productName: product.name },
      originMemberDisplayName: member.name,
    });
  });

  return NextResponse.json({
    ok: true,
    bv,
    pv,
    productName: product.name,
    quantity,
  });
}
