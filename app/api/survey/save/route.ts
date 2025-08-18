import { type NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth/session"
import { sql } from "@/lib/db/client"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { responses, isComplete, surveyVersion = "1.0" } = await request.json()

    if (!responses) {
      return NextResponse.json({ error: "Responses are required" }, { status: 400 })
    }

    // Get or create survey response record
    const existingResponses = await sql`
      SELECT id FROM survey_responses 
      WHERE user_id = ${session.user.id} 
      AND status IN ('draft', 'in-progress')
      ORDER BY created_at DESC 
      LIMIT 1
    `

    let surveyResponseId: string

    if (existingResponses.length > 0) {
      // Update existing draft
      surveyResponseId = existingResponses[0].id
      await sql`
        UPDATE survey_responses 
        SET 
          responses = ${JSON.stringify(responses)},
          status = ${isComplete ? "completed" : "in-progress"},
          submitted_at = ${isComplete ? new Date().toISOString() : null},
          updated_at = NOW()
        WHERE id = ${surveyResponseId}
      `
    } else {
      // Create new survey response
      const newResponse = await sql`
        INSERT INTO survey_responses (
          user_id, 
          organization_id, 
          survey_version, 
          responses, 
          status,
          submitted_at
        ) VALUES (
          ${session.user.id},
          ${session.user.organization_id},
          ${surveyVersion},
          ${JSON.stringify(responses)},
          ${isComplete ? "completed" : "draft"},
          ${isComplete ? new Date().toISOString() : null}
        )
        RETURNING id
      `
      surveyResponseId = newResponse[0].id
    }

    // Log the action
    await sql`
      INSERT INTO audit_logs (
        user_id, 
        action, 
        resource_type, 
        resource_id, 
        details
      ) VALUES (
        ${session.user.id},
        ${isComplete ? "survey_submitted" : "survey_saved"},
        'survey_response',
        ${surveyResponseId},
        ${JSON.stringify({
          survey_version: surveyVersion,
          response_count: Object.keys(responses).length,
        })}
      )
    `

    return NextResponse.json({
      message: isComplete ? "Survey submitted successfully" : "Survey saved successfully",
      surveyResponseId,
    })
  } catch (error) {
    console.error("Survey save error:", error)
    return NextResponse.json({ error: "Failed to save survey" }, { status: 500 })
  }
}
