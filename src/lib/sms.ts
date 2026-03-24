import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SmsConfig = {
  provider: string;
  environment: "sandbox" | "production";
  username: string;
  apiKey: string;
  senderId?: string;
};

function getSmsConfig(): SmsConfig {
  return {
    provider: process.env.SMS_PROVIDER ?? "africastalking",
    environment: process.env.AFRICASTALKING_ENV === "sandbox" ? "sandbox" : "production",
    username: process.env.AFRICASTALKING_USERNAME ?? "",
    apiKey: process.env.AFRICASTALKING_API_KEY ?? "",
    senderId: process.env.AFRICASTALKING_SENDER_ID ?? undefined,
  };
}

function normalizeKenyaPhone(input: string): string {
  const stripped = input.replace(/\s+/g, "");
  if (stripped.startsWith("+")) return stripped;
  if (stripped.startsWith("0")) return `+254${stripped.slice(1)}`;
  if (stripped.startsWith("254")) return `+${stripped}`;
  return stripped;
}

export async function sendSms(input: { to: string; message: string }) {
  const config = getSmsConfig();
  if (config.provider !== "africastalking") {
    throw new Error(`Unsupported SMS provider: ${config.provider}`);
  }
  if (!config.username || !config.apiKey) {
    throw new Error("Africa's Talking SMS credentials missing");
  }

  const host =
    config.environment === "sandbox"
      ? "https://api.sandbox.africastalking.com"
      : "https://api.africastalking.com";
  const body = new URLSearchParams({
    username: config.username,
    to: normalizeKenyaPhone(input.to),
    message: input.message,
  });
  if (config.senderId) {
    body.set("from", config.senderId);
  }

  const response = await fetch(`${host}/version1/messaging`, {
    method: "POST",
    headers: {
      apiKey: config.apiKey,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error((data.errorMessage as string) ?? "SMS request failed");
  }
  return data;
}

export async function sendSmsSafe(input: {
  to?: string | null;
  message: string;
  userId?: string | null;
  memberId?: string | null;
}) {
  if (!input.to) return;
  const config = getSmsConfig();
  const toPhone = normalizeKenyaPhone(input.to);

  try {
    const response = await sendSms({ to: input.to, message: input.message });
    await prisma.smsDeliveryLog.create({
      data: {
        userId: input.userId ?? undefined,
        memberId: input.memberId ?? undefined,
        provider: config.provider,
        toPhone,
        message: input.message,
        status: "SENT",
        responseRaw: response as Prisma.InputJsonValue,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SMS send failed";
    await prisma.smsDeliveryLog.create({
      data: {
        userId: input.userId ?? undefined,
        memberId: input.memberId ?? undefined,
        provider: config.provider,
        toPhone,
        message: input.message,
        status: "FAILED",
        error: message,
      },
    });
  }
}
