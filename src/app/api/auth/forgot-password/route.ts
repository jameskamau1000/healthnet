import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { otpEmailErrorResponse } from "@/lib/email";
import { issueEmailOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { OtpPurpose } from "@prisma/client";

const bodySchema = z.object({
  email: z.string().email(),
});

const genericNoAccount = {
  ok: true as const,
  message: "If an account exists for that email, we sent a reset code. Check your inbox.",
};

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
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return NextResponse.json(genericNoAccount);
  }

  let issued;
  try {
    issued = await issueEmailOtp({
      purpose: OtpPurpose.PASSWORD_RESET,
      recipientEmail: user.email,
      actorUserId: user.id,
      userId: user.id,
      payload: { email: user.email },
    });
  } catch (err) {
    const { body: errBody, status } = otpEmailErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }

  if (!issued.ok) {
    return NextResponse.json({ error: issued.error }, { status: 429 });
  }

  return NextResponse.json({
    ok: true as const,
    message: "We sent a reset code to your email. Enter it below with your new password.",
    challengeId: issued.challengeId,
    expiresAt: issued.expiresAt,
    resendAvailableAt: issued.resendAvailableAt,
  });
}
