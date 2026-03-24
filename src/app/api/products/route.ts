import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const productSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(5),
  category: z.string().optional(),
  price: z.number().min(0),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

const updateSchema = productSchema.partial().extend({
  id: z.string().min(1),
});

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function GET() {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.product.findMany({
    where: user.role === "ADMIN" ? {} : { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ products: rows });
}

export async function POST(request: Request) {
  await ensureBootstrapData();
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const baseSlug = slugify(parsed.data.name);
  const conflictCount = await prisma.product.count({
    where: { slug: { startsWith: baseSlug } },
  });
  const slug = conflictCount > 0 ? `${baseSlug}-${conflictCount + 1}` : baseSlug;

  const created = await prisma.product.create({
    data: {
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      category: parsed.data.category,
      price: parsed.data.price,
      imageUrl: parsed.data.imageUrl,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "product.create",
    targetType: "Product",
    targetId: created.id,
    metadata: { slug: created.slug, price: created.price },
  });

  return NextResponse.json(created);
}

export async function PATCH(request: Request) {
  await ensureBootstrapData();
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { id: parsed.data.id } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const data: {
    name?: string;
    slug?: string;
    description?: string;
    category?: string | null;
    price?: number;
    imageUrl?: string | null;
    isActive?: boolean;
  } = {};

  if (parsed.data.name && parsed.data.name !== existing.name) {
    const baseSlug = slugify(parsed.data.name);
    const conflictCount = await prisma.product.count({
      where: { slug: { startsWith: baseSlug }, NOT: { id: existing.id } },
    });
    data.name = parsed.data.name;
    data.slug = conflictCount > 0 ? `${baseSlug}-${conflictCount + 1}` : baseSlug;
  }
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.category !== undefined) data.category = parsed.data.category ?? null;
  if (parsed.data.price !== undefined) data.price = parsed.data.price;
  if (parsed.data.imageUrl !== undefined) data.imageUrl = parsed.data.imageUrl ?? null;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const updated = await prisma.product.update({
    where: { id: existing.id },
    data,
  });

  await createAuditLog({
    actorUserId: admin.id,
    action: "product.update",
    targetType: "Product",
    targetId: updated.id,
    metadata: { isActive: updated.isActive, price: updated.price },
  });

  return NextResponse.json(updated);
}
