// lib/pdf/queue.ts
import { sql } from "@/lib/db/client";
import { pdfGenerator } from "@/lib/pdf/generator";

export class PDFQueue {
  async addJob(surveyResponseId: string, options: any = {}): Promise<string> {
    const rows = await sql /* sql */ `
      INSERT INTO public.queue_jobs (
        survey_response_id, type, payload, status
      )
      VALUES (
        ${surveyResponseId},
        'pdf_generation',
        ${JSON.stringify({ options })}::jsonb,
        'pending'
      )
      RETURNING id
    `;
    return rows[0].id;
  }

  async processNextJob(): Promise<boolean> {
    const rows = await sql /* sql */ `
      SELECT id, survey_response_id, payload, attempts, max_attempts
      FROM public.queue_jobs
      WHERE type = 'pdf_generation'
        AND status = 'pending'
        AND attempts < max_attempts
      ORDER BY created_at ASC
      LIMIT 1
    `;
    if (rows.length === 0) return false;

    const job = rows[0];
    const surveyResponseId: string = job.survey_response_id;
    const options = job.payload?.options ?? {};

    try {
      await sql /* sql */ `
        UPDATE public.queue_jobs
        SET status = 'processing', started_at = NOW(), attempts = attempts + 1
        WHERE id = ${job.id}
      `;

      const pdfUrl = await pdfGenerator.generateAndStore({
        surveyResponseId,
        ...options,
      });

      await sql /* sql */ `
        UPDATE public.queue_jobs
        SET status = 'completed',
        pdf_url = ${pdfUrl},          
        completed_at = NOW()
        WHERE id = ${job.id}
      `;

      return true;
    } catch (err: any) {
      const shouldRetry = job.attempts + 1 < (job.max_attempts ?? 3);
      await sql /* sql */ `
        UPDATE public.queue_jobs
        SET status = ${shouldRetry ? "pending" : "failed"},
            error_message = ${err?.message ?? "Unknown error"}
        WHERE id = ${job.id}
      `;
      return false;
    }
  }

  async processQueue(): Promise<void> {
    let more = true;
    while (more) {
      more = await this.processNextJob();
      if (more) await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

export const pdfQueue = new PDFQueue();
