import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { requireAdmin } from "@/lib/auth";
import { createMemberSchema } from "@/contracts/member";
import { createMemberByAdmin } from "@/services/member-onboarding-service";

export async function POST(request: Request) {
  await ensureBootstrapData();
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await createMemberByAdmin(parsed.data, admin.id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result.data);
}
