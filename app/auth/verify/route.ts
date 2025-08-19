// app/auth/verify/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { createSessionForEmail } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/config";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const email = url.searchParams.get("email");

  if (!token || !email) {
    return NextResponse.redirect(new URL("/login?error=invalid-link", url));
  }

  try {
    const ok = await verifyMagicLink(token, email);
    if (!ok) {
      return NextResponse.redirect(new URL("/login?error=expired-link", url));
    }

    // This function already inserts the session and returns the token
    const sessionToken = await createSessionForEmail(email);

    // ✅ Cookies can be set here (Route Handler)
    const expires = new Date(Date.now() + authConfig.sessionExpiry);
    cookies().set({
      name: authConfig.cookieName,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires,
    });

    return NextResponse.redirect(new URL(authConfig.redirectAfterLogin, url));
  } catch (e) {
    console.error("Magic link verification error:", e);
    return NextResponse.redirect(
      new URL("/login?error=verification-failed", url)
    );
  }
}
