import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  await ensureBootstrapData();
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { referralCode: true },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const leftLink = `${origin}/?ref=${encodeURIComponent(dbUser.referralCode)}&position=left`;
  const rightLink = `${origin}/?ref=${encodeURIComponent(dbUser.referralCode)}&position=right`;

  return NextResponse.json({
    referralCode: dbUser.referralCode,
    leftLink,
    rightLink,
  });
}
