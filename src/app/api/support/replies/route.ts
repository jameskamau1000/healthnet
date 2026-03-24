import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { createNotification, notifyAdmins } from "@/lib/notifications";

const replySchema = z.object({
  ticketId: z.string().min(1),
  message: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.findUnique({
    where: { id: parsed.data.ticketId },
    include: { member: true },
  });
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (user.role !== "ADMIN") {
    const member = await prisma.member.findFirst({ where: { userId: user.id } });
    if (!member || member.id !== ticket.memberId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const reply = await prisma.supportReply.create({
    data: {
      ticketId: ticket.id,
      userId: user.id,
      message: parsed.data.message,
    },
    include: { user: true },
  });

  // Any reply re-opens conversation unless ticket is explicitly closed later by admin.
  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: ticket.status === "CLOSED" ? "PENDING" : ticket.status },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "support.ticket.reply",
    targetType: "SupportTicket",
    targetId: ticket.id,
  });

  if (user.role === "ADMIN") {
    const ticketOwner = await prisma.member.findUnique({
      where: { id: ticket.memberId },
      include: { user: true },
    });
    if (ticketOwner?.userId) {
      await createNotification({
        userId: ticketOwner.userId,
        title: "Support replied",
        message: `Your ticket "${ticket.subject}" has a new reply.`,
        link: "/?tab=support",
      });
    }
  } else {
    await notifyAdmins({
      title: "Member replied to support ticket",
      message: `${ticket.member.name} replied on "${ticket.subject}".`,
      link: "/?tab=support",
    });
  }

  return NextResponse.json({
    id: reply.id,
    userName: reply.user.name,
    message: reply.message,
    createdAt: reply.createdAt.toISOString(),
  });
}
