import { Resend } from "resend";

type OtpEmailInput = {
  to: string;
  otpCode: string;
  purpose: "LOGIN" | "REGISTER" | "WITHDRAWAL" | "PASSWORD_RESET";
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
  if (purpose === "PASSWORD_RESET") return "password reset";
  return "withdrawal verification";
}

export async function sendOtpEmail(input: OtpEmailInput) {
  const resend = getResendClient();
  const from = getEmailFromAddress();
  const label = purposeLabel(input.purpose);

  const { error } = await resend.emails.send({
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

  if (error) {
    const detail = typeof error.message === "string" ? error.message : JSON.stringify(error);
    throw new Error(`Resend: ${detail}`);
  }
}

/** Map thrown email errors to HTTP response (logs server-side). */
export function otpEmailErrorResponse(error: unknown): { body: { error: string }; status: number } {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("[otp-email]", msg);

  const misconfigured =
    msg.includes("RESEND_API_KEY") ||
    msg.includes("EMAIL_FROM") ||
    msg.includes("not configured");

  if (misconfigured) {
    return {
      body: {
        error:
          "Email verification is not set up on the server (missing Resend configuration). Contact support.",
      },
      status: 503,
    };
  }

  return {
    body: {
      error:
        "Could not send OTP email. Please try again. If this continues, the sender domain may need verification in Resend.",
    },
    status: 500,
  };
}
