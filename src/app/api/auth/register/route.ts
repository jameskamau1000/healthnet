import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { registerMemberSchema } from "@/contracts/member";
import { registerMemberAccount } from "@/services/member-onboarding-service";

export async function POST(request: Request) {
  await ensureBootstrapData();
  const body = await request.json();
  const parsed = registerMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await registerMemberAccount(parsed.data);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
