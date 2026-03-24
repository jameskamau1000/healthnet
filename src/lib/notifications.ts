import { prisma } from "@/lib/prisma";

export async function createNotification(input: {
  userId: string;
  title: string;
  message: string;
  link?: string;
}) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: input.title,
      message: input.message,
      link: input.link,
    },
  });
}

export async function notifyAdmins(input: { title: string; message: string; link?: string }) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((admin) => ({
      userId: admin.id,
      title: input.title,
      message: input.message,
      link: input.link,
    })),
  });
}
