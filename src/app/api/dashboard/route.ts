import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [settings, packages, products] = await Promise.all([
    prisma.compensationSetting.findUnique({ where: { id: "default" } }),
    prisma.packageTier.findMany({ orderBy: { price: "asc" } }),
    prisma.product.findMany({
      where: user.role === "ADMIN" ? {} : { isActive: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const [notifications, notificationUnreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  const [members, transactions, auditLogs, withdrawals, deposits, supportTickets, smsLogs] =
    user.role === "ADMIN"
      ? await Promise.all([
          prisma.member.findMany({ orderBy: { createdAt: "asc" } }),
          prisma.walletTransaction.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { member: true },
          }),
          prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 50,
            include: { actorUser: true },
          }),
          prisma.withdrawalRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { member: true },
          }),
          prisma.depositRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { member: true },
          }),
          prisma.supportTicket.findMany({
            orderBy: { updatedAt: "desc" },
            include: {
              member: true,
              replies: {
                orderBy: { createdAt: "asc" },
                include: { user: true },
              },
            },
          }),
          prisma.smsDeliveryLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 200,
            include: {
              user: true,
              member: true,
            },
          }),
        ])
      : await (async () => {
          const member = await prisma.member.findFirst({ where: { userId: user.id } });
          if (!member) return [[], [], [], [], [], [], []] as const;
          const memberTransactions = await prisma.walletTransaction.findMany({
            where: { memberId: member.id },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { member: true },
          });
          const memberWithdrawals = await prisma.withdrawalRequest.findMany({
            where: { memberId: member.id },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { member: true },
          });
          const memberDeposits = await prisma.depositRequest.findMany({
            where: { memberId: member.id },
            orderBy: { createdAt: "desc" },
            take: 100,
            include: { member: true },
          });
          const memberTickets = await prisma.supportTicket.findMany({
            where: { memberId: member.id },
            orderBy: { updatedAt: "desc" },
            include: {
              member: true,
              replies: {
                orderBy: { createdAt: "asc" },
                include: { user: true },
              },
            },
          });
          return [
            [member],
            memberTransactions,
            [],
            memberWithdrawals,
            memberDeposits,
            memberTickets,
            [],
          ] as const;
        })();

  return NextResponse.json({
    user,
    settings: settings
      ? {
          referralPercent: settings.referralPercent,
          binaryPercent: settings.binaryPercent,
        }
      : null,
    packages: packages.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      price: pkg.price,
      matchingRatios: pkg.matchingRatios,
    })),
    products: products.map((product) => ({
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      category: product.category,
      price: product.price,
      imageUrl: product.imageUrl,
      isActive: product.isActive,
      createdAt: product.createdAt.toISOString(),
    })),
    members: members.map((member) => ({
      id: member.id,
      userId: member.userId,
      name: member.name,
      phoneNumber: member.phoneNumber,
      packageId: member.packageId,
      binaryParentId: member.binaryParentId,
      binaryPosition: member.binaryPosition,
      rank: member.rank,
      councilStatus: member.councilStatus,
      directReferralSales: member.directReferralSales,
      leftVolume: member.leftVolume,
      rightVolume: member.rightVolume,
      levelSales: member.levelSales,
    })),
    transactions: transactions.map((tx) => ({
      id: tx.id,
      memberId: tx.memberId,
      memberName: tx.member.name,
      type: tx.type,
      amount: tx.amount,
      description: tx.description,
      createdAt: tx.createdAt.toISOString(),
    })),
    auditLogs: auditLogs.map((entry) => ({
      id: entry.id,
      actorName: entry.actorUser.name,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      createdAt: entry.createdAt.toISOString(),
    })),
    withdrawals: withdrawals.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      memberName: row.member.name,
      amount: row.amount,
      phoneNumber: row.phoneNumber,
      status: row.status,
      note: row.note,
      payoutReference: row.payoutReference,
      payoutChannel: row.payoutChannel,
      createdAt: row.createdAt.toISOString(),
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
    })),
    deposits: deposits.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      memberName: row.member.name,
      amount: row.amount,
      phoneNumber: row.phoneNumber,
      status: row.status,
      mpesaReceiptNumber: row.mpesaReceiptNumber,
      merchantRequestId: row.merchantRequestId,
      checkoutRequestId: row.checkoutRequestId,
      customerMessage: row.customerMessage,
      createdAt: row.createdAt.toISOString(),
    })),
    supportTickets: supportTickets.map((ticket) => ({
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
    notifications: notifications.map((item) => ({
      id: item.id,
      title: item.title,
      message: item.message,
      link: item.link,
      isRead: item.isRead,
      createdAt: item.createdAt.toISOString(),
    })),
    notificationUnreadCount,
    smsLogs: smsLogs.map((row) => ({
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
  });
}
