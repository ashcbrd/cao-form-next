import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { pdfQueue } from "@/lib/pdf/queue";
import { sql } from "@/lib/db/client";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { surveyResponseId, options = {} } = await request.json();

    if (!surveyResponseId) {
      return NextResponse.json(
        { error: "Survey response ID is required" },
        { status: 400 }
      );
    }

    const surveyResponses = await sql`
      SELECT id FROM survey_responses 
      WHERE id = ${surveyResponseId} 
      AND user_id = ${session.user.id}
    `;

    if (surveyResponses.length === 0) {
      return NextResponse.json(
        { error: "Survey response not found" },
        { status: 404 }
      );
    }

    // Add to PDF generation queue
    const jobId = await pdfQueue.addJob(surveyResponseId, options);

    // Start processing queue (in background)
    pdfQueue.processQueue().catch(console.error);

    return NextResponse.json({
      message: "PDF generation started",
      jobId,
    });
  } catch (error) {
    console.error("PDF generation API error:", error);
    return NextResponse.json(
      { error: "Failed to start PDF generation" },
      { status: 500 }
    );
  }
}
