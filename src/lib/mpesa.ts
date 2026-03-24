type MpesaConfig = {
  baseUrl: string;
  consumerKey: string;
  consumerSecret: string;
  stkShortCode: string;
  passkey: string;
  stkCallbackUrl: string;
  b2cShortCode: string;
  b2cInitiatorName: string;
  b2cSecurityCredential: string;
  b2cResultUrl: string;
  b2cTimeoutUrl: string;
  b2cCommandId: string;
};

function getConfig(): MpesaConfig {
  const env = process.env.MPESA_ENV === "sandbox" ? "sandbox" : "production";
  return {
    baseUrl:
      env === "sandbox" ? "https://sandbox.safaricom.co.ke" : "https://api.safaricom.co.ke",
    consumerKey: process.env.MPESA_CONSUMER_KEY ?? "",
    consumerSecret: process.env.MPESA_CONSUMER_SECRET ?? "",
    stkShortCode: process.env.MPESA_STK_SHORTCODE ?? "",
    passkey: process.env.MPESA_STK_PASSKEY ?? "",
    stkCallbackUrl: process.env.MPESA_STK_CALLBACK_URL ?? "",
    b2cShortCode: process.env.MPESA_B2C_SHORTCODE ?? "",
    b2cInitiatorName: process.env.MPESA_B2C_INITIATOR_NAME ?? "",
    b2cSecurityCredential: process.env.MPESA_B2C_SECURITY_CREDENTIAL ?? "",
    b2cResultUrl: process.env.MPESA_B2C_RESULT_URL ?? "",
    b2cTimeoutUrl: process.env.MPESA_B2C_TIMEOUT_URL ?? "",
    b2cCommandId: process.env.MPESA_B2C_COMMAND_ID ?? "BusinessPayment",
  };
}

function hasCoreAuth(config: MpesaConfig): boolean {
  return Boolean(config.consumerKey && config.consumerSecret);
}

function normalizePhone(input: string): string {
  const trimmed = input.replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed.slice(1);
  if (trimmed.startsWith("0")) return `254${trimmed.slice(1)}`;
  return trimmed;
}

function timestampNow(): string {
  const date = new Date();
  const yyyy = date.getFullYear().toString();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const mi = `${date.getMinutes()}`.padStart(2, "0");
  const ss = `${date.getSeconds()}`.padStart(2, "0");
  return `${yyyy}${mm}${dd}${hh}${mi}${ss}`;
}

async function getAccessToken(config: MpesaConfig): Promise<string> {
  const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString("base64");
  const response = await fetch(
    `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    },
  );
  const data = (await response.json()) as { access_token?: string };
  if (!response.ok || !data.access_token) {
    throw new Error("Failed to obtain M-Pesa access token");
  }
  return data.access_token;
}

export async function initiateStkPush(input: {
  amount: number;
  phoneNumber: string;
  accountReference: string;
  transactionDesc: string;
}) {
  const config = getConfig();
  if (!hasCoreAuth(config)) {
    throw new Error("M-Pesa credentials are not configured");
  }
  if (!config.stkShortCode || !config.passkey || !config.stkCallbackUrl) {
    throw new Error("STK configuration is incomplete");
  }

  const token = await getAccessToken(config);
  const timestamp = timestampNow();
  const password = Buffer.from(`${config.stkShortCode}${config.passkey}${timestamp}`).toString(
    "base64",
  );

  const response = await fetch(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: config.stkShortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(input.amount),
      PartyA: normalizePhone(input.phoneNumber),
      PartyB: config.stkShortCode,
      PhoneNumber: normalizePhone(input.phoneNumber),
      CallBackURL: config.stkCallbackUrl,
      AccountReference: input.accountReference,
      TransactionDesc: input.transactionDesc,
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error((data.errorMessage as string) || "STK push failed");
  }
  return data;
}

export async function initiateB2CPayout(input: {
  amount: number;
  phoneNumber: string;
  withdrawalId: string;
  remarks: string;
}) {
  const config = getConfig();
  if (!hasCoreAuth(config)) {
    throw new Error("M-Pesa credentials are not configured");
  }
  if (
    !config.b2cShortCode ||
    !config.b2cInitiatorName ||
    !config.b2cSecurityCredential ||
    !config.b2cResultUrl ||
    !config.b2cTimeoutUrl
  ) {
    throw new Error("B2C configuration is incomplete");
  }

  const token = await getAccessToken(config);
  const response = await fetch(`${config.baseUrl}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      InitiatorName: config.b2cInitiatorName,
      SecurityCredential: config.b2cSecurityCredential,
      CommandID: config.b2cCommandId,
      Amount: Math.round(input.amount),
      PartyA: config.b2cShortCode,
      PartyB: normalizePhone(input.phoneNumber),
      Remarks: input.remarks,
      QueueTimeOutURL: config.b2cTimeoutUrl,
      ResultURL: config.b2cResultUrl,
      Occasion: input.withdrawalId,
    }),
  });

  const data = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    throw new Error((data.errorMessage as string) || "B2C payout request failed");
  }
  return data;
}

export function mapStkCallback(raw: unknown) {
  const body = raw as {
    Body?: {
      stkCallback?: {
        MerchantRequestID?: string;
        CheckoutRequestID?: string;
        ResultCode?: number;
        ResultDesc?: string;
        CallbackMetadata?: { Item?: Array<{ Name?: string; Value?: string | number }> };
      };
    };
  };
  const callback = body.Body?.stkCallback;
  const items = callback?.CallbackMetadata?.Item ?? [];
  const pick = (name: string) => items.find((item) => item.Name === name)?.Value;

  return {
    merchantRequestId: callback?.MerchantRequestID,
    checkoutRequestId: callback?.CheckoutRequestID,
    resultCode: callback?.ResultCode ?? -1,
    resultDesc: callback?.ResultDesc ?? "Unknown",
    receiptNumber: (pick("MpesaReceiptNumber") as string | undefined) ?? null,
    amount: (pick("Amount") as number | undefined) ?? null,
    phoneNumber: (pick("PhoneNumber") as string | number | undefined)?.toString() ?? null,
  };
}
