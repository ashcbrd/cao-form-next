import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { caoloonService } from "@/lib/caoloon/service"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")
    const limit = Number.parseInt(searchParams.get("limit") || "10")

    if (!query) {
      return NextResponse.json({ error: "Query parameter is required" }, { status: 400 })
    }

    const organizations = await caoloonService.searchCaoOrganizations(query, limit)

    return NextResponse.json({
      organizations,
      count: organizations.length,
    })
  } catch (error) {
    console.error("CAO search API error:", error)
    return NextResponse.json({ error: "Failed to search CAO organizations" }, { status: 500 })
  }
}
