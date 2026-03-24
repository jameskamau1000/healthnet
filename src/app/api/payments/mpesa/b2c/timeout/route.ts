import { NextResponse } from "next/server";
import { isCallbackAuthorized } from "@/lib/callback-auth";

export async function POST(request: Request) {
  if (!isCallbackAuthorized(request)) {
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Unauthorized callback" }, { status: 401 });
  }
  return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
}
