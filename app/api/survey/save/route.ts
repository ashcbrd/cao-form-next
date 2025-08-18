import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";

// If you have a Postgres function `jsonb_deep_merge(a jsonb, b jsonb)` installed,
// set this to true. Otherwise, we fall back to replacing the JSON entirely.
const HAS_JSONB_DEEP_MERGE = false;

// Helper to ensure we only accept plain objects
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse & validate body
    const body = await request.json().catch(() => null);
    if (!body || !isPlainObject(body)) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const {
      responses,
      isComplete = false,
      surveyVersion = "1.0",
      // optional: when saving incremental pages, send only diffs
      merge = true,
    } = body as {
      responses: unknown;
      isComplete?: boolean;
      surveyVersion?: string;
      merge?: boolean;
    };

    if (!isPlainObject(responses)) {
      return NextResponse.json(
        { error: "`responses` must be an object" },
        { status: 422 }
      );
    }

    // Normalize status
    const nextStatus = isComplete ? "completed" : "in-progress";

    // Find latest editable draft
    const existingRows = await sql`
      SELECT id, responses
      FROM survey_responses 
      WHERE user_id = ${session.user.id}
        AND status IN ('draft', 'in-progress')
      ORDER BY created_at DESC 
      LIMIT 1
    `;

    let surveyResponseId: string;

    if (existingRows.length > 0) {
      // Update existing draft/in-progress
      surveyResponseId = existingRows[0].id;

      if (merge && HAS_JSONB_DEEP_MERGE) {
        // Deep merge new responses into existing JSON (server-side)
        await sql`
          UPDATE survey_responses
          SET
            responses = jsonb_deep_merge(responses, ${JSON.stringify(responses)}::jsonb),
            status = ${nextStatus},
            submitted_at = ${isComplete ? new Date().toISOString() : null},
            updated_at = NOW()
          WHERE id = ${surveyResponseId}
        `;
      } else if (merge && !HAS_JSONB_DEEP_MERGE) {
        // Merge in app layer (shallow) as a safe fallback:
        // For deep merges, implement on client or install a DB helper.
        const merged = {
          ...(isPlainObject(existingRows[0].responses)
            ? existingRows[0].responses
            : {}),
          ...responses,
        };
        await sql`
          UPDATE survey_responses
          SET
            responses = ${JSON.stringify(merged)}::jsonb,
            status = ${nextStatus},
            submitted_at = ${isComplete ? new Date().toISOString() : null},
            updated_at = NOW()
          WHERE id = ${surveyResponseId}
        `;
      } else {
        // Replace entire JSON
        await sql`
          UPDATE survey_responses
          SET
            responses = ${JSON.stringify(responses)}::jsonb,
            status = ${nextStatus},
            submitted_at = ${isComplete ? new Date().toISOString() : null},
            updated_at = NOW()
          WHERE id = ${surveyResponseId}
        `;
      }
    } else {
      // Create new response row
      const statusForNew = isComplete ? "completed" : "draft";
      const submittedAtForNew = isComplete ? new Date().toISOString() : null;

      const inserted = await sql`
        INSERT INTO survey_responses (
          user_id,
          organization_id,
          survey_version,
          responses,
          status,
          submitted_at,
          created_at,
          updated_at
        ) VALUES (
          ${session.user.id},
          ${session.user.organization_id},
          ${surveyVersion},
          ${JSON.stringify(responses)}::jsonb,
          ${statusForNew},
          ${submittedAtForNew},
          NOW(),
          NOW()
        )
        RETURNING id
      `;
      surveyResponseId = inserted[0].id;
    }

    // --- Audit log
    await sql`
      INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        details,
        created_at
      ) VALUES (
        ${session.user.id},
        ${isComplete ? "survey_submitted" : "survey_saved"},
        'survey_response',
        ${surveyResponseId},
        ${JSON.stringify({
          survey_version: surveyVersion,
          response_keys: Object.keys(responses),
          response_count: Object.keys(responses).length,
          status: nextStatus,
        })}::jsonb,
        NOW()
      )
    `;

    return NextResponse.json({
      ok: true,
      message: isComplete
        ? "Survey submitted successfully"
        : "Survey saved successfully",
      surveyResponseId,
      status: nextStatus,
    });
  } catch (error) {
    console.error("Survey save error:", error);
    return NextResponse.json(
      { error: "Failed to save survey" },
      { status: 500 }
    );
  }
}
