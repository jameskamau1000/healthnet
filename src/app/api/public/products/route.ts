import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { prisma } from "@/lib/prisma";

/** Active catalog for marketing homepage (no auth). */
export async function GET() {
  await ensureBootstrapData();
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 8,
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      category: true,
      price: true,
      imageUrl: true,
    },
  });
  return NextResponse.json({ products });
}
