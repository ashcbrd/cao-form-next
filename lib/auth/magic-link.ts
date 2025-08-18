import { sql } from "@/lib/db/client";
import { generateMagicToken, authConfig } from "./config";

export async function generateMagicLink(email: string): Promise<string> {
  const token = generateMagicToken();
  const expires = new Date(Date.now() + authConfig.magicLinkExpiry);

  const userRows = await sql /* sql */ `
    INSERT INTO public.users (email)
    VALUES (${email})
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id
  `;
  const userId: string = userRows[0].id;

  await sql /* sql */ `
    INSERT INTO public.magic_links (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expires})
  `;

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";

  return `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
}

export async function verifyMagicLink(
  token: string,
  email: string
): Promise<boolean> {
  const links = await sql /* sql */ `
    SELECT ml.token, ml.expires_at, ml.used_at
    FROM public.magic_links AS ml
    JOIN public.users AS u ON ml.user_id = u.id
    WHERE u.email = ${email}
      AND ml.token = ${token}
      AND ml.expires_at > NOW()
      AND ml.used_at IS NULL
    LIMIT 1
  `;
  if (links.length === 0) return false;

  await sql /* sql */ `
    UPDATE public.magic_links
    SET used_at = NOW()
    WHERE token = ${token}
  `;

  await sql /* sql */ `
    UPDATE public.users
    SET email_verified = true,
        verified_at = NOW(),
        updated_at = NOW(),
        last_login_at = NOW()
    WHERE email = ${email}
  `;

  return true;
}
