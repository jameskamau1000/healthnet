import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { setUserPasswordAndInvalidateSessions } from "@/lib/auth";
import { verifyEmailOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { OtpPurpose } from "@prisma/client";

const bodySchema = z.object({
  challengeId: z.string().min(1),
  otpCode: z.string().length(6),
  newPassword: z.string().min(6).max(200),
});

export async function POST(request: Request) {
  await ensureBootstrapData();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { challengeId, otpCode, newPassword } = parsed.data;

  const pending = await prisma.otpChallenge.findUnique({ where: { id: challengeId } });
  if (!pending || pending.purpose !== OtpPurpose.PASSWORD_RESET || !pending.userId) {
    return NextResponse.json({ error: "Invalid or expired reset request." }, { status: 400 });
  }

  const verified = await verifyEmailOtp({
    challengeId,
    code: otpCode,
    purpose: OtpPurpose.PASSWORD_RESET,
    actorUserId: pending.userId,
  });

  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: 400 });
  }

  await setUserPasswordAndInvalidateSessions(pending.userId, newPassword);

  await createAuditLog({
    actorUserId: pending.userId,
    action: "auth.password.reset",
    targetType: "User",
    targetId: pending.userId,
    metadata: { via: "email_otp" },
  });

  return NextResponse.json({ ok: true, message: "Password updated. You can sign in with your new password." });
}
