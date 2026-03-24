import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { notifyAdmins } from "@/lib/notifications";

const createSchema = z.object({
  subject: z.string().min(3).max(120),
  message: z.string().min(3).max(2000),
});

const updateSchema = z.object({
  ticketId: z.string().min(1),
  status: z.enum(["OPEN", "PENDING", "CLOSED"]),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const where =
    user.role === "ADMIN"
      ? {}
      : {
          member: {
            userId: user.id,
          },
        };

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      member: true,
      replies: {
        orderBy: { createdAt: "asc" },
        include: { user: true },
      },
    },
  });

  return NextResponse.json(
    tickets.map((ticket) => ({
      id: ticket.id,
      memberId: ticket.memberId,
      memberName: ticket.member.name,
      subject: ticket.subject,
      message: ticket.message,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
      replies: ticket.replies.map((reply) => ({
        id: reply.id,
        userName: reply.user.name,
        message: reply.message,
        createdAt: reply.createdAt.toISOString(),
      })),
    })),
  );
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const member = await prisma.member.findFirst({ where: { userId: user.id } });
  if (!member) {
    return NextResponse.json({ error: "Member profile not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      memberId: member.id,
      subject: parsed.data.subject,
      message: parsed.data.message,
      status: "OPEN",
    },
    include: { member: true },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "support.ticket.create",
    targetType: "SupportTicket",
    targetId: ticket.id,
  });

  await notifyAdmins({
    title: "New support ticket",
    message: `${member.name}: ${ticket.subject}`,
    link: "/?tab=support",
  });

  return NextResponse.json({
    id: ticket.id,
    memberId: ticket.memberId,
    memberName: ticket.member.name,
    subject: ticket.subject,
    message: ticket.message,
    status: ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    replies: [],
  });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await prisma.supportTicket.update({
    where: { id: parsed.data.ticketId },
    data: { status: parsed.data.status },
    include: { member: true },
  });

  await createAuditLog({
    actorUserId: user.id,
    action: "support.ticket.status",
    targetType: "SupportTicket",
    targetId: updated.id,
    metadata: { status: parsed.data.status },
  });

  return NextResponse.json({
    id: updated.id,
    memberId: updated.memberId,
    memberName: updated.member.name,
    subject: updated.subject,
    message: updated.message,
    status: updated.status,
    createdAt: updated.createdAt.toISOString(),
    replies: [],
  });
}
