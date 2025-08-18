import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import surveySchema from "@/lib/survey-schema.json";
import { SurveyFormWrapper } from "./survey-form-wrapper";

export default async function SurveyPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  // Grab latest active draft to prefill
  const existingResponses = await sql /* sql */ `
    SELECT id, responses FROM public.survey_responses
    WHERE user_id = ${session.user.id}
      AND status IN ('draft','in_progress')
    ORDER BY created_at DESC
    LIMIT 1
  `;
  const activeDraftId = existingResponses.length
    ? existingResponses[0].id
    : null;
  const initialResponses =
    existingResponses.length > 0 ? existingResponses[0].responses : {};

  // -------- Server actions (update-or-insert) -------------------------------

  async function saveDraftAction(responses: any): Promise<void> {
    "use server";
    const s = await getSession();
    if (!s) redirect("/login");

    // Try to update the latest active draft; insert if none exists
    const existing = await sql /* sql */ `
      SELECT id FROM public.survey_responses
      WHERE user_id = ${s.user.id}
        AND status IN ('draft','in_progress')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql /* sql */ `
        UPDATE public.survey_responses
        SET responses = ${JSON.stringify(responses)}::jsonb,
            status = 'in_progress',
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      await sql /* sql */ `
        INSERT INTO public.survey_responses (user_id, responses, status, created_at, updated_at)
        VALUES (${s.user.id}, ${JSON.stringify(responses)}::jsonb, 'in_progress', NOW(), NOW())
      `;
    }
  }

  async function submitSurveyAction(responses: any): Promise<void> {
    "use server";
    const s = await getSession();
    if (!s) redirect("/login");

    // Prefer upgrading the user's current draft/in_progress to completed
    const existing = await sql /* sql */ `
      SELECT id FROM public.survey_responses
      WHERE user_id = ${s.user.id}
        AND status IN ('draft','in_progress')
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (existing.length > 0) {
      await sql /* sql */ `
        UPDATE public.survey_responses
        SET responses = ${JSON.stringify(responses)}::jsonb,
            status = 'completed',
            submitted_at = NOW(),
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `;
    } else {
      // Fallback: no draft found, create a completed row
      await sql /* sql */ `
        INSERT INTO public.survey_responses (user_id, responses, status, submitted_at, created_at, updated_at)
        VALUES (${s.user.id}, ${JSON.stringify(responses)}::jsonb, 'completed', NOW(), NOW(), NOW())
      `;
    }

    redirect("/dashboard?submitted=true");
  }
  // -------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <SurveyFormWrapper
        schema={surveySchema}
        initialResponses={initialResponses}
        onSave={saveDraftAction}
        onSubmit={submitSurveyAction}
      />
    </div>
  );
}
