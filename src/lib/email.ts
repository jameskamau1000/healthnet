import { Resend } from "resend";

type OtpEmailInput = {
  to: string;
  otpCode: string;
  purpose: "LOGIN" | "REGISTER" | "WITHDRAWAL";
  ttlMinutes: number;
};

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  return new Resend(apiKey);
}

function getEmailFromAddress() {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) {
    throw new Error("EMAIL_FROM is not configured");
  }
  return from;
}

function purposeLabel(purpose: OtpEmailInput["purpose"]): string {
  if (purpose === "LOGIN") return "login verification";
  if (purpose === "REGISTER") return "registration verification";
  return "withdrawal verification";
}

export async function sendOtpEmail(input: OtpEmailInput) {
  const resend = getResendClient();
  const from = getEmailFromAddress();
  const label = purposeLabel(input.purpose);

  await resend.emails.send({
    from,
    to: input.to,
    subject: `Your Ayur Health OTP for ${label}`,
    text: [
      `Your one-time verification code is: ${input.otpCode}`,
      "",
      `This code expires in ${input.ttlMinutes} minute(s).`,
      "If you did not request this code, you can ignore this email.",
    ].join("\n"),
  });
}
