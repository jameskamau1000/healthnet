import { createHash, randomInt } from "crypto";
import { OtpPurpose } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/email";
import { createAuditLog } from "@/lib/audit";
import { createNotification, notifyAdmins } from "@/lib/notifications";

const OTP_TTL_MINUTES = Number(process.env.OTP_TTL_MINUTES ?? 10);
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS ?? 5);
const OTP_RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60);
const OTP_SECRET = process.env.OTP_SECRET?.trim() || "dev-otp-secret";

type IssueOtpInput = {
  purpose: OtpPurpose;
  recipientEmail: string;
  actorUserId?: string;
  userId?: string;
  memberId?: string;
  payload?: unknown;
};

function hashOtp(id: string, code: string): string {
  return createHash("sha256").update(`${id}:${code}:${OTP_SECRET}`).digest("hex");
}

function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function getOtpConfig() {
  return {
    ttlMinutes: OTP_TTL_MINUTES,
    maxAttempts: OTP_MAX_ATTEMPTS,
    resendCooldownSeconds: OTP_RESEND_COOLDOWN_SECONDS,
  };
}

export async function issueEmailOtp(input: IssueOtpInput) {
  const now = new Date();
  const existing = await prisma.otpChallenge.findFirst({
    where: {
      purpose: input.purpose,
      recipient: input.recipientEmail.toLowerCase(),
      consumedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing && existing.resendAvailableAt > now) {
    const waitSeconds = Math.max(1, Math.ceil((existing.resendAvailableAt.getTime() - now.getTime()) / 1000));
    return {
      ok: false as const,
      error: `Please wait ${waitSeconds}s before requesting another OTP.`,
    };
  }

  const code = generateCode();
  const challenge = await prisma.otpChallenge.create({
    data: {
      purpose: input.purpose,
      recipient: input.recipientEmail.toLowerCase(),
      codeHash: "pending",
      payload: input.payload as object | undefined,
      userId: input.userId,
      memberId: input.memberId,
      expiresAt: new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000),
      resendAvailableAt: new Date(now.getTime() + OTP_RESEND_COOLDOWN_SECONDS * 1000),
      attemptsRemaining: OTP_MAX_ATTEMPTS,
    },
  });

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { codeHash: hashOtp(challenge.id, code) },
  });

  try {
    await sendOtpEmail({
      to: input.recipientEmail,
      otpCode: code,
      purpose: input.purpose,
      ttlMinutes: OTP_TTL_MINUTES,
    });
  } catch (error) {
    await prisma.otpChallenge.delete({ where: { id: challenge.id } });
    await notifyOtpCriticalFailure(
      `OTP email delivery failed for ${input.recipientEmail} (${input.purpose}).`,
    );
    throw error;
  }

  if (input.userId) {
    await createNotification({
      userId: input.userId,
      title: "OTP issued",
      message: `A verification code was sent to ${input.recipientEmail}.`,
    });
  }

  if (input.actorUserId) {
    await createAuditLog({
      actorUserId: input.actorUserId,
      action: "otp.issue",
      targetType: "OtpChallenge",
      targetId: challenge.id,
      metadata: { purpose: input.purpose, recipient: input.recipientEmail.toLowerCase() },
    });
  }

  return {
    ok: true as const,
    challengeId: challenge.id,
    expiresAt: challenge.expiresAt.toISOString(),
    resendAvailableAt: challenge.resendAvailableAt.toISOString(),
  };
}

export async function verifyEmailOtp(input: {
  challengeId: string;
  code: string;
  purpose: OtpPurpose;
  actorUserId?: string;
}) {
  const challenge = await prisma.otpChallenge.findUnique({ where: { id: input.challengeId } });
  if (!challenge || challenge.purpose !== input.purpose) {
    return { ok: false as const, error: "Invalid OTP challenge." };
  }
  if (challenge.consumedAt) return { ok: false as const, error: "OTP already used." };
  if (challenge.expiresAt.getTime() < Date.now()) return { ok: false as const, error: "OTP has expired." };
  if (challenge.attemptsRemaining <= 0) return { ok: false as const, error: "OTP attempts exceeded." };

  const valid = hashOtp(challenge.id, input.code) === challenge.codeHash;
  if (!valid) {
    await prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: { attemptsRemaining: { decrement: 1 } },
    });

    if (input.actorUserId) {
      await createAuditLog({
        actorUserId: input.actorUserId,
        action: "otp.verify.failed",
        targetType: "OtpChallenge",
        targetId: challenge.id,
        metadata: { purpose: input.purpose },
      });
    }
    return { ok: false as const, error: "Invalid OTP code." };
  }

  const consumed = await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date(), attemptsRemaining: 0 },
  });

  if (input.actorUserId) {
    await createAuditLog({
      actorUserId: input.actorUserId,
      action: "otp.verify.success",
      targetType: "OtpChallenge",
      targetId: challenge.id,
      metadata: { purpose: input.purpose },
    });
  }

  return { ok: true as const, challenge: consumed };
}

export async function notifyOtpCriticalFailure(message: string) {
  await notifyAdmins({
    title: "OTP delivery failure",
    message,
  });
}
