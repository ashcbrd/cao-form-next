// lib/auth/session.ts
import { cookies } from "next/headers";
import { sql } from "@/lib/db/client";
import { authConfig } from "./config";
import type { User } from "@/lib/types";
import crypto from "node:crypto";

export interface Session {
  user: User;
  expires: Date;
}

/**
 * Legacy path (kept for compatibility) — requires a VALID userId.
 * If you're using magic links, prefer createSessionForEmail(email).
 */
export async function createSession(userId: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + authConfig.sessionExpiry);

  await sql /*sql*/ `
    INSERT INTO public.sessions (token, user_id, expires_at)
    VALUES (${sessionToken}, ${userId}, ${expires.toISOString()})
  `;

  // Safe best-effort touch (ignore if cols missing)
  try {
    await sql /*sql*/ `
      UPDATE public.users
      SET last_login_at = NOW(), updated_at = NOW()
      WHERE id = ${userId}
    `;
  } catch {}

  cookies().set(authConfig.cookieName, sessionToken, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return sessionToken;
}

/**
 * Safe path for magic-link: upsert user by email → insert session (atomic).
 * Avoids FK violations entirely.
 */
export async function createSessionForEmail(email: string): Promise<string> {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + authConfig.sessionExpiry);

  // Atomic CTE: upsert user -> resolve id -> insert session -> return token
  const rows = await sql /*sql*/ `
    WITH upsert_user AS (
      INSERT INTO public.users (email)
      VALUES (${email})
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    ),
    resolved_user AS (
      SELECT id FROM upsert_user
      UNION ALL
      SELECT id FROM public.users WHERE email = ${email}
      LIMIT 1
    ),
    inserted_session AS (
      INSERT INTO public.sessions (token, user_id, expires_at)
      SELECT ${sessionToken}, id, ${expires.toISOString()}
      FROM resolved_user
      RETURNING token, user_id
    )
    SELECT token FROM inserted_session
  `;

  const token = (rows as Array<{ token: string }>)[0]?.token;
  if (!token) throw new Error("Failed to create session (no user resolved)");

  // Optional: touch updated_at/last_login_at if they exist
  try {
    await sql /*sql*/ `
      UPDATE public.users u
      SET updated_at = NOW(), last_login_at = NOW()
      FROM public.sessions s
      WHERE s.token = ${sessionToken} AND u.id = s.user_id
    `;
  } catch {}

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
    const rows = await sql /*sql*/ `
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

    if ((rows as any[]).length === 0) return null;

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
    await sql /*sql*/ `
      DELETE FROM public.sessions
      WHERE token = ${sessionToken}
    `;
  }
  cookies().delete(authConfig.cookieName);
}
