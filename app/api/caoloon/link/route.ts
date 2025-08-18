import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { caoloonService } from "@/lib/caoloon/service"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId, caoId } = await request.json()

    if (!organizationId || !caoId) {
      return NextResponse.json({ error: "Organization ID and CAO ID are required" }, { status: 400 })
    }

    const success = await caoloonService.linkOrganizationToCao(organizationId, caoId)

    if (success) {
      return NextResponse.json({
        message: "Organization linked to CAO successfully",
      })
    } else {
      return NextResponse.json({ error: "Failed to link organization to CAO" }, { status: 500 })
    }
  } catch (error) {
    console.error("CAO link API error:", error)
    return NextResponse.json({ error: "Failed to link organization to CAO" }, { status: 500 })
  }
}
