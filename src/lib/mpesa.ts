type MpesaConfig = {
  baseUrl: string;
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

/** Lipa na M-Pesa / STK app (can differ from the B2C Daraja app). */
function resolveStkAuth(): { consumerKey: string; consumerSecret: string } {
  const consumerKey =
    process.env.MPESA_STK_CONSUMER_KEY?.trim() || process.env.MPESA_CONSUMER_KEY?.trim() || "";
  const consumerSecret =
    process.env.MPESA_STK_CONSUMER_SECRET?.trim() || process.env.MPESA_CONSUMER_SECRET?.trim() || "";
  return { consumerKey, consumerSecret };
}

/** B2C payout app (separate consumer key/secret when Safaricom issued two apps). */
function resolveB2cAuth(): { consumerKey: string; consumerSecret: string } {
  const consumerKey =
    process.env.MPESA_B2C_CONSUMER_KEY?.trim() || process.env.MPESA_CONSUMER_KEY?.trim() || "";
  const consumerSecret =
    process.env.MPESA_B2C_CONSUMER_SECRET?.trim() || process.env.MPESA_CONSUMER_SECRET?.trim() || "";
  return { consumerKey, consumerSecret };
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

async function getAccessToken(
  baseUrl: string,
  auth: { consumerKey: string; consumerSecret: string },
): Promise<string> {
  if (!auth.consumerKey || !auth.consumerSecret) {
    throw new Error("M-Pesa consumer key/secret are missing");
  }
  const basic = Buffer.from(`${auth.consumerKey}:${auth.consumerSecret}`).toString("base64");
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: "GET",
    headers: {
      Authorization: `Basic ${basic}`,
    },
  });
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
  const stkAuth = resolveStkAuth();
  if (!stkAuth.consumerKey || !stkAuth.consumerSecret) {
    throw new Error(
      "M-Pesa STK credentials missing: set MPESA_STK_CONSUMER_KEY/MPESA_STK_CONSUMER_SECRET (or MPESA_CONSUMER_KEY/SECRET)",
    );
  }
  if (!config.stkShortCode || !config.passkey || !config.stkCallbackUrl) {
    throw new Error("STK configuration is incomplete (shortcode, passkey, callback URL)");
  }

  const token = await getAccessToken(config.baseUrl, stkAuth);
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
  const rc = data.ResponseCode ?? data.responseCode;
  if (rc !== undefined && String(rc) !== "0") {
    const msg =
      (data.CustomerMessage as string) ||
      (data.errorMessage as string) ||
      `STK rejected (ResponseCode ${String(rc)})`;
    throw new Error(msg);
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
  const b2cAuth = resolveB2cAuth();
  if (!b2cAuth.consumerKey || !b2cAuth.consumerSecret) {
    throw new Error(
      "M-Pesa B2C credentials missing: set MPESA_B2C_CONSUMER_KEY/MPESA_B2C_CONSUMER_SECRET (or MPESA_CONSUMER_KEY/SECRET)",
    );
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

  const token = await getAccessToken(config.baseUrl, b2cAuth);
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
  const rc = data.ResponseCode ?? data.responseCode;
  if (rc !== undefined && String(rc) !== "0") {
    throw new Error(
      (data.errorMessage as string) || `B2C rejected (ResponseCode ${String(rc)})`,
    );
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
