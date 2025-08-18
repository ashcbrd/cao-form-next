import { sql } from "@/lib/db/client"
import { pdfGenerator } from "./generator"

export interface PDFJob {
  id: string
  surveyResponseId: string
  options: any
  status: "pending" | "processing" | "completed" | "failed"
  attempts: number
  error?: string
}

export class PDFQueue {
  async addJob(surveyResponseId: string, options: any = {}): Promise<string> {
    const jobs = await sql`
      INSERT INTO queue_jobs (
        type, 
        payload, 
        status
      ) VALUES (
        'pdf_generation',
        ${JSON.stringify({ surveyResponseId, options })},
        'pending'
      )
      RETURNING id
    `

    return jobs[0].id
  }

  async processNextJob(): Promise<boolean> {
    // Get next pending job
    const jobs = await sql`
      SELECT id, payload, attempts
      FROM queue_jobs 
      WHERE type = 'pdf_generation' 
      AND status = 'pending'
      AND attempts < max_attempts
      ORDER BY created_at ASC
      LIMIT 1
    `

    if (jobs.length === 0) {
      return false // No jobs to process
    }

    const job = jobs[0]
    const { surveyResponseId, options } = job.payload

    try {
      // Mark as processing
      await sql`
        UPDATE queue_jobs 
        SET 
          status = 'processing',
          started_at = NOW(),
          attempts = attempts + 1
        WHERE id = ${job.id}
      `

      // Generate PDF
      const pdfUrl = await pdfGenerator.generateAndStore({
        surveyResponseId,
        ...options,
      })

      // Mark as completed
      await sql`
        UPDATE queue_jobs 
        SET 
          status = 'completed',
          completed_at = NOW()
        WHERE id = ${job.id}
      `

      return true
    } catch (error) {
      console.error("PDF job processing error:", error)

      // Mark as failed or retry
      const shouldRetry = job.attempts < 3
      await sql`
        UPDATE queue_jobs 
        SET 
          status = ${shouldRetry ? "pending" : "failed"},
          error_message = ${error.message}
        WHERE id = ${job.id}
      `

      return false
    }
  }

  async processQueue(): Promise<void> {
    let hasMoreJobs = true

    while (hasMoreJobs) {
      hasMoreJobs = await this.processNextJob()
      if (hasMoreJobs) {
        // Small delay between jobs
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  }
}

export const pdfQueue = new PDFQueue()
