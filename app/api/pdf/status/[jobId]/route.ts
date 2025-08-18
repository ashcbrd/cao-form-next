import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { sql } from "@/lib/db/client"

export async function GET(request: NextRequest, { params }: { params: { jobId: string } }) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { jobId } = params

    const jobs = await sql`
      SELECT 
        qj.id,
        qj.status,
        qj.attempts,
        qj.error_message,
        qj.created_at,
        qj.completed_at,
        sr.pdf_url
      FROM queue_jobs qj
      LEFT JOIN survey_responses sr ON (qj.payload->>'surveyResponseId')::uuid = sr.id
      WHERE qj.id = ${jobId}
      AND qj.type = 'pdf_generation'
    `

    if (jobs.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 })
    }

    const job = jobs[0]

    return NextResponse.json({
      id: job.id,
      status: job.status,
      attempts: job.attempts,
      error: job.error_message,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      pdfUrl: job.pdf_url,
    })
  } catch (error) {
    console.error("PDF status API error:", error)
    return NextResponse.json({ error: "Failed to get job status" }, { status: 500 })
  }
}
