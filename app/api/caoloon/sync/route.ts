import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { caoloonService } from "@/lib/caoloon/service"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { organizationId } = await request.json()

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 })
    }

    const caoData = await caoloonService.syncOrganizationData(organizationId)

    if (caoData) {
      return NextResponse.json({
        message: "CAO data synced successfully",
        caoData,
      })
    } else {
      return NextResponse.json({
        message: "No CAO data found for this organization",
        caoData: null,
      })
    }
  } catch (error) {
    console.error("CAO sync API error:", error)
    return NextResponse.json({ error: "Failed to sync CAO data" }, { status: 500 })
  }
}
