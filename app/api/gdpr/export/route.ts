import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { gdprService } from "@/lib/gdpr/compliance";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const exportData = await gdprService.exportUserData(session.user.id);

    // Return as JSON download
    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="sugb-data-export-${session.user.id}.json"`,
      },
    });

    return response;
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
