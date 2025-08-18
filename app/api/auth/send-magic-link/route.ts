import { type NextRequest, NextResponse } from "next/server"
import { generateMagicLink } from "@/lib/auth/magic-link"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 })
    }

    const magicLink = await generateMagicLink(email)

    // In production, send this via email service (Resend, etc.)
    console.log(`Magic link for ${email}: ${magicLink}`)

    // For demo purposes, we'll return the link
    // In production, remove this and only send via email
    return NextResponse.json({
      message: "Magic link sent successfully",
      // Remove this in production:
      magicLink: process.env.NODE_ENV === "development" ? magicLink : undefined,
    })
  } catch (error) {
    console.error("Magic link generation error:", error)
    return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 })
  }
}
