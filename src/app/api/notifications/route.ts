import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  notificationId: z.string().optional(),
  all: z.boolean().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: rows.map((row) => ({
      id: row.id,
      title: row.title,
      message: row.message,
      link: row.link,
      isRead: row.isRead,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (parsed.data.all) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (!parsed.data.notificationId) {
    return NextResponse.json({ error: "notificationId or all is required" }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { id: parsed.data.notificationId, userId: user.id },
    data: { isRead: true },
  });

  return NextResponse.json({ ok: true });
}
