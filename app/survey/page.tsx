"use client"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { sql } from "@/lib/db/client"
import { SurveyForm } from "@/components/form/survey-form"
import surveySchema from "@/lib/survey-schema.json"

export default async function SurveyPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Get existing draft if any
  const existingResponses = await sql`
    SELECT responses FROM survey_responses 
    WHERE user_id = ${session.user.id} 
    AND status IN ('draft', 'in-progress')
    ORDER BY created_at DESC 
    LIMIT 1
  `

  const initialResponses = existingResponses.length > 0 ? existingResponses[0].responses : {}

  const handleSave = async (responses: any, isComplete: boolean) => {
    "use server"

    const response = await fetch("/api/survey/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responses, isComplete }),
    })

    if (!response.ok) {
      throw new Error("Failed to save survey")
    }
  }

  const handleSubmit = async (responses: any) => {
    "use server"

    await handleSave(responses, true)
    redirect("/dashboard?submitted=true")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SurveyForm
        schema={surveySchema}
        initialResponses={initialResponses}
        onSave={handleSave}
        onSubmit={handleSubmit}
      />
    </div>
  )
}
