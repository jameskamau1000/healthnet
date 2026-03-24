import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isCallbackAuthorized } from "@/lib/callback-auth";

type B2CResultPayload = {
  Result?: {
    ConversationID?: string;
    OriginatorConversationID?: string;
    ResultCode?: number;
    ResultDesc?: string;
  };
};

export async function POST(request: Request) {
  if (!isCallbackAuthorized(request)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unauthorized callback" }, { status: 401 });
  }

  const payload = (await request.json()) as B2CResultPayload;
  const result = payload.Result;
  const reference = result?.ConversationID ?? result?.OriginatorConversationID;

  if (!reference) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  const withdrawal = await prisma.withdrawalRequest.findFirst({
    where: {
      OR: [{ payoutReference: reference }, { payoutReference: result?.OriginatorConversationID }],
    },
  });
  if (!withdrawal) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }

  if ((result?.ResultCode ?? 1) !== 0) {
    await prisma.withdrawalRequest.update({
      where: { id: withdrawal.id },
      data: {
        status: "REJECTED",
        note: `${withdrawal.note ?? ""} | B2C failed: ${result?.ResultDesc ?? "Unknown"}`.trim(),
      },
    });
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
