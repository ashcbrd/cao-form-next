import { sql } from "@/lib/db/client"
import { generateMagicToken, authConfig } from "./config"

export async function generateMagicLink(email: string): Promise<string> {
  const token = generateMagicToken()
  const expires = new Date(Date.now() + authConfig.magicLinkExpiry)

  const userResult = await sql`
    INSERT INTO users (email, email_verified, role)
    VALUES (${email}, false, 'user')
    ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
    RETURNING id
  `

  const userId = userResult[0].id

  await sql`
    INSERT INTO magic_links (user_id, token, expires_at, used)
    VALUES (${userId}, ${token}, ${expires}, false)
  `

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  return `${baseUrl}/auth/verify?token=${token}&email=${encodeURIComponent(email)}`
}

export async function verifyMagicLink(token: string, email: string): Promise<boolean> {
  const links = await sql`
    SELECT ml.id, ml.expires_at, ml.used
    FROM magic_links ml
    JOIN users u ON ml.user_id = u.id
    WHERE u.email = ${email} 
    AND ml.token = ${token}
    AND ml.expires_at > NOW()
    AND ml.used = false
  `

  if (links.length === 0) {
    return false
  }

  await sql`
    UPDATE magic_links 
    SET used = true
    WHERE token = ${token}
  `

  await sql`
    UPDATE users 
    SET email_verified = true, updated_at = NOW()
    WHERE email = ${email}
  `

  return true
}
