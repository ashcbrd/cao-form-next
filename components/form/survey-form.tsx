"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { QuestionRenderer } from "./question-renderer"
import { validateSection, shouldShowQuestion } from "@/lib/form/validation"
import type { SurveySchema, FormState, FormResponse } from "@/lib/form/types"
import { ChevronLeft, ChevronRight, Save, Send } from "lucide-react"

interface SurveyFormProps {
  schema: SurveySchema
  initialResponses?: FormResponse
  onSave: (responses: FormResponse, isComplete: boolean) => Promise<void>
  onSubmit: (responses: FormResponse) => Promise<void>
}

export function SurveyForm({ schema, initialResponses = {}, onSave, onSubmit }: SurveyFormProps) {
  const [formState, setFormState] = useState<FormState>({
    responses: initialResponses,
    currentSection: 0,
    completedSections: [],
    isValid: false,
    errors: {},
  })

  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const currentSection = schema.sections[formState.currentSection]
  const visibleQuestions = currentSection.questions.filter((q) => shouldShowQuestion(q, formState.responses))

  // Calculate progress
  const totalSections = schema.sections.length
  const progress = ((formState.currentSection + 1) / totalSections) * 100

  // Validate current section
  useEffect(() => {
    const errors = validateSection(visibleQuestions, formState.responses)
    const isValid = Object.keys(errors).length === 0

    setFormState((prev) => ({
      ...prev,
      errors,
      isValid,
    }))
  }, [formState.responses, formState.currentSection])

  const handleResponseChange = (questionId: string, value: any) => {
    setFormState((prev) => ({
      ...prev,
      responses: {
        ...prev.responses,
        [questionId]: value,
      },
    }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(formState.responses, false)
    } catch (error) {
      console.error("Save failed:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleNext = () => {
    if (formState.isValid && formState.currentSection < schema.sections.length - 1) {
      setFormState((prev) => ({
        ...prev,
        currentSection: prev.currentSection + 1,
        completedSections: [...prev.completedSections, currentSection.id],
      }))
    }
  }

  const handlePrevious = () => {
    if (formState.currentSection > 0) {
      setFormState((prev) => ({
        ...prev,
        currentSection: prev.currentSection - 1,
      }))
    }
  }

  const handleSubmit = async () => {
    if (!formState.isValid) return

    setIsSubmitting(true)
    try {
      await onSubmit(formState.responses)
    } catch (error) {
      console.error("Submit failed:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isLastSection = formState.currentSection === schema.sections.length - 1
  const canProceed = formState.isValid

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">SUGB Survey</h1>
          <Badge variant="outline">
            Section {formState.currentSection + 1} of {totalSections}
          </Badge>
        </div>

        <Progress value={progress} className="mb-2" />
        <p className="text-sm text-gray-600">{Math.round(progress)}% complete</p>
      </div>

      {/* Current Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentSection.name}
            {currentSection.isRequired && <Badge variant="secondary">Required</Badge>}
          </CardTitle>
          <CardDescription>Please complete all required fields in this section to continue.</CardDescription>
        </CardHeader>
      </Card>

      {/* Questions */}
      <div className="space-y-6">
        {visibleQuestions.map((question) => (
          <QuestionRenderer
            key={question.id}
            question={question}
            value={formState.responses[question.id]}
            onChange={(value) => handleResponseChange(question.id, value)}
            error={formState.errors[question.id]}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrevious} disabled={formState.currentSection === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save Draft"}
          </Button>

          {isLastSection ? (
            <Button onClick={handleSubmit} disabled={!canProceed || isSubmitting}>
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? "Submitting..." : "Submit Survey"}
            </Button>
          ) : (
            <Button onClick={handleNext} disabled={!canProceed}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Section Summary */}
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>
          {formState.completedSections.length} of {totalSections} sections completed
        </p>
      </div>
    </div>
  )
}
