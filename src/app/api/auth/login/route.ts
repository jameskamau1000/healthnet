import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { createSessionForUser, verifyEmailPassword } from "@/lib/auth";
import { otpEmailErrorResponse } from "@/lib/email";
import { issueEmailOtp, verifyEmailOtp } from "@/lib/otp";
import { OtpPurpose } from "@prisma/client";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
const verifySchema = z.object({
  challengeId: z.string().min(1),
  otpCode: z.string().length(6),
});

export async function POST(request: Request) {
  await ensureBootstrapData();
  const body = await request.json();
  if (body?.challengeId && body?.otpCode) {
    const parsedVerify = verifySchema.safeParse(body);
    if (!parsedVerify.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const verified = await verifyEmailOtp({
      challengeId: parsedVerify.data.challengeId,
      code: parsedVerify.data.otpCode,
      purpose: OtpPurpose.LOGIN,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    if (!verified.challenge.userId) {
      return NextResponse.json({ error: "Invalid OTP challenge." }, { status: 400 });
    }

    await createSessionForUser(verified.challenge.userId);
    return NextResponse.json({ userId: verified.challenge.userId, verified: true });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await verifyEmailPassword(parsed.data.email, parsed.data.password);
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  let issued;
  try {
    issued = await issueEmailOtp({
      purpose: OtpPurpose.LOGIN,
      recipientEmail: user.email,
      actorUserId: user.id,
      userId: user.id,
      payload: { email: user.email },
    });
  } catch (err) {
    const { body, status } = otpEmailErrorResponse(err);
    return NextResponse.json(body, { status });
  }
  if (!issued.ok) {
    return NextResponse.json({ error: issued.error }, { status: 429 });
  }

  return NextResponse.json({
    otpRequired: true,
    challengeId: issued.challengeId,
    expiresAt: issued.expiresAt,
    resendAvailableAt: issued.resendAvailableAt,
  });
}
