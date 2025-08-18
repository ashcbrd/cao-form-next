import { NextRequest, NextResponse } from "next/server";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { sql } from "@/lib/db/client";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login?error=missing-params", url));
  }

  const ok = await verifyMagicLink(token, email);
  if (!ok) {
    return NextResponse.redirect(
      new URL("/login?error=verification-failed", url)
    );
  }

  const rows = await sql /* sql */ `
    SELECT id FROM public.users WHERE email = ${email} LIMIT 1
  `;
  if (rows.length === 0) {
    return NextResponse.redirect(new URL("/login?error=user-not-found", url));
  }

  await createSession(rows[0].id); // sets cookie (allowed in route handlers)
  return NextResponse.redirect(new URL("/dashboard", url));
}
