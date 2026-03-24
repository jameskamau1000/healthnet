import { NextResponse } from "next/server";
import { ensureBootstrapData } from "@/lib/bootstrap";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const bootstrap = await ensureBootstrapData();
  const user = await getSessionUser();

  return NextResponse.json({
    user,
    defaultAdmin: bootstrap.defaultAdmin,
  });
}
