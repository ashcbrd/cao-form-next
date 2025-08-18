import { cookies } from "next/headers"
import { sql } from "@/lib/db/client"
import { authConfig } from "./config"
import type { User } from "@/lib/types"

export interface Session {
  user: User
  expires: Date
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")

  const expires = new Date(Date.now() + authConfig.sessionExpiry)

  await sql`
    UPDATE users 
    SET last_login = NOW() 
    WHERE id = ${userId}
  `

  // Set cookie
  cookies().set(authConfig.cookieName, sessionToken, {
    expires,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  })

  return sessionToken
}

export async function getSession(): Promise<Session | null> {
  const sessionToken = cookies().get(authConfig.cookieName)?.value

  if (!sessionToken) {
    return null
  }

  try {
    const users = await sql`
      SELECT u.id, u.email, u.name, u.organization_id, u.role, u.created_at, u.updated_at
      FROM users u
      INNER JOIN magic_links ml ON u.email = ml.email
      WHERE ml.used_at IS NOT NULL
      AND ml.used_at > NOW() - INTERVAL '7 days'
      ORDER BY ml.used_at DESC
      LIMIT 1
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0] as User
    return {
      user,
      expires: new Date(Date.now() + authConfig.sessionExpiry),
    }
  } catch (error) {
    console.error("Session validation error:", error)
    return null
  }
}

export async function deleteSession(): Promise<void> {
  cookies().delete(authConfig.cookieName)
}
