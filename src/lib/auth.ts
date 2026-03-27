import { compare } from "bcryptjs";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "healthnet_session";
const SESSION_DAYS = 7;

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "MEMBER";
};

export async function verifyEmailPassword(email: string, password: string): Promise<SafeUser | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;

  const validPassword = await compare(password, user.passwordHash);
  if (!validPassword) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function createSessionForUser(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      token,
      userId: user.id,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function loginWithEmail(email: string, password: string): Promise<SafeUser | null> {
  const safe = await verifyEmailPassword(email, password);
  if (!safe) return null;
  await createSessionForUser(safe.id);
  return safe;
}

export async function logoutSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } });
  }
  cookieStore.delete(COOKIE_NAME);
}

export async function getSessionUser(): Promise<SafeUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } });
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
  };
}

export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
