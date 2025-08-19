// lib/auth/magic-link.ts
import { sql } from "@/lib/db/client";
import { authConfig, generateMagicToken } from "./config";

/**
 * Creates a DB-backed magic link token tied to the user.
 * Ensures the user exists (by email), stores the token in magic_links.
 */
export async function generateMagicLink(email: string): Promise<string> {
  const token = generateMagicToken();
  const expires = new Date(Date.now() + authConfig.magicLinkExpiry);

  // Upsert user and get id
  const userRows = await sql /*sql*/ `
    INSERT INTO public.users (email)
    VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id
  `;
  const userId: string = (userRows as any[])[0].id;

  // Store magic link
  await sql /*sql*/ `
    INSERT INTO public.magic_links (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expires.toISOString()})
  `;

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

/**
 * Verifies the DB-backed magic link token for the given email.
 * Marks token as used and verifies the user.
 */
export async function verifyMagicLink(
  token: string,
  email: string
): Promise<boolean> {
  const rows = await sql /*sql*/ `
    SELECT ml.token, ml.expires_at, ml.used_at
    FROM public.magic_links AS ml
    JOIN public.users AS u ON ml.user_id = u.id
    WHERE u.email = ${email}
      AND ml.token = ${token}
      AND ml.expires_at > NOW()
      AND ml.used_at IS NULL
    LIMIT 1
  `;

  if ((rows as any[]).length === 0) return false;

  await sql /*sql*/ `
    UPDATE public.magic_links
    SET used_at = NOW()
    WHERE token = ${token}
  `;

  await sql /*sql*/ `
    UPDATE public.users
    SET email_verified = true,
        verified_at = NOW(),
        updated_at = NOW(),
        last_login_at = NOW()
    WHERE email = ${email}
  `;

  return true;
}
