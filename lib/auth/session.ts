import { cookies } from "next/headers";
import { sql } from "@/lib/db/client";
import { authConfig } from "./config";
import type { User } from "@/lib/types";
import crypto from "node:crypto";

export interface Session {
  user: User;
  expires: Date;
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + authConfig.sessionExpiry);

  await sql /* sql */ `
    INSERT INTO public.sessions (token, user_id, expires_at)
    VALUES (${sessionToken}, ${userId}, ${expires})
  `;

  await sql /* sql */ `
    UPDATE public.users
    SET last_login_at = NOW(), updated_at = NOW()
    WHERE id = ${userId}
  `;

  cookies().set(authConfig.cookieName, sessionToken, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return sessionToken;
}

export async function getSession(): Promise<Session | null> {
  const sessionToken = cookies().get(authConfig.cookieName)?.value;
  if (!sessionToken) return null;

  try {
    const rows = await sql /* sql */ `
      SELECT
        u.id, u.email, u.role,
        u.email_verified, u.verified_at,
        u.created_at, u.updated_at, u.last_login_at,
        s.expires_at
      FROM public.sessions s
      JOIN public.users u ON u.id = s.user_id
      WHERE s.token = ${sessionToken}
        AND s.expires_at > NOW()
      LIMIT 1
    `;

    if (rows.length === 0) return null;

    const { expires_at, ...user } = rows[0] as any;
    return { user, expires: new Date(expires_at) };
  } catch (err) {
    console.error("Session validation error:", err);
    return null;
  }
}

export async function deleteSession(): Promise<void> {
  const sessionToken = cookies().get(authConfig.cookieName)?.value;
  if (sessionToken) {
    await sql /* sql */ `
      DELETE FROM public.sessions
      WHERE token = ${sessionToken}
    `;
  }
  cookies().delete(authConfig.cookieName);
}
