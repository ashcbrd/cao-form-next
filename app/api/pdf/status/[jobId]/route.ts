import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";

export async function GET(
  _req: Request,
  { params }: { params: { jobId: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobId = params.jobId;

    const rows = await sql /* sql */ `
      SELECT
        qj.id,
        qj.status,
        qj.attempts,
        qj.error_message,
        qj.created_at,
        qj.completed_at,
        qj.pdf_url        AS job_pdf_url,
        sr.pdf_url        AS sr_pdf_url
      FROM public.queue_jobs qj
      LEFT JOIN public.survey_responses sr
        ON sr.id = qj.survey_response_id
      WHERE qj.id = ${jobId}
        AND qj.type = 'pdf_generation'
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const j = rows[0];
    const pdfUrl: string | null = j.job_pdf_url ?? j.sr_pdf_url ?? null;

    return NextResponse.json({
      id: j.id,
      status: j.status,
      attempts: j.attempts,
      error: j.error_message,
      createdAt: j.created_at,
      completedAt: j.completed_at,
      pdfUrl,
    });
  } catch (err) {
    console.error("PDF status API error:", err);
    return NextResponse.json(
      { error: "Failed to get job status" },
      { status: 500 }
    );
  }
}
