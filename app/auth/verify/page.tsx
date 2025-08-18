import { redirect } from "next/navigation"
import { verifyMagicLink } from "@/lib/auth/magic-link"
import { createSession } from "@/lib/auth/session"
import { sql } from "@/lib/db/client"
import { authConfig } from "@/lib/auth/config"

interface VerifyPageProps {
  searchParams: {
    token?: string
    email?: string
  }
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token, email } = searchParams

  if (!token || !email) {
    redirect("/login?error=invalid-link")
  }

  try {
    const isValid = await verifyMagicLink(token, email)

    if (!isValid) {
      redirect("/login?error=expired-link")
    }

    // Get user info
    const users = await sql`
      SELECT id FROM users WHERE email = ${email}
    `

    if (users.length === 0) {
      redirect("/login?error=user-not-found")
    }

    // Create session
    await createSession(users[0].id)

    // Redirect to dashboard
    redirect(authConfig.redirectAfterLogin)
  } catch (error) {
    console.error("Magic link verification error:", error)
    redirect("/login?error=verification-failed")
  }
}
