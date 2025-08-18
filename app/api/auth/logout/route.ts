import { NextResponse } from "next/server"
import { deleteSession } from "@/lib/auth/session"
import { authConfig } from "@/lib/auth/config"

export async function POST() {
  try {
    await deleteSession()

    const response = NextResponse.json({ message: "Logged out successfully" })
    response.headers.set("Location", authConfig.redirectAfterLogout)

    return response
  } catch (error) {
    console.error("Logout error:", error)
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 })
  }
}
