import { NextResponse } from "next/server";
import { z } from "zod";
import { OtpPurpose } from "@prisma/client";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { registerMemberSchema } from "@/contracts/member";
import { registerMemberAccount } from "@/services/member-onboarding-service";
import { issueEmailOtp, verifyEmailOtp } from "@/lib/otp";

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
      purpose: OtpPurpose.REGISTER,
    });
    if (!verified.ok) {
      return NextResponse.json({ error: verified.error }, { status: 400 });
    }

    const payload = verified.challenge.payload as unknown;
    const parsedRegistration = registerMemberSchema.safeParse(payload);
    if (!parsedRegistration.success) {
      return NextResponse.json({ error: "Registration payload expired or invalid." }, { status: 400 });
    }

    const result = await registerMemberAccount(parsedRegistration.data);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ...result.data, verified: true });
  }

  const parsed = registerMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  let issued;
  try {
    issued = await issueEmailOtp({
      purpose: OtpPurpose.REGISTER,
      recipientEmail: parsed.data.email,
      payload: parsed.data,
    });
  } catch {
    return NextResponse.json({ error: "Could not send OTP email. Please try again." }, { status: 500 });
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
