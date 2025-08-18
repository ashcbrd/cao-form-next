import type { Question, FormResponse } from "./types"

export function validateQuestion(question: Question, value: any): string | null {
  const { validation, isRequired } = question

  // Check required
  if (isRequired && (value === undefined || value === null || value === "")) {
    return `${question.text} is required`
  }

  // If no value and not required, skip other validations
  if (!value && !isRequired) {
    return null
  }

  if (!validation) return null

  // Number validations
  if (question.type === "NUMBER" || question.type === "MONEY" || question.type === "PERCENT") {
    const numValue = Number.parseFloat(value)

    if (isNaN(numValue)) {
      return `${question.text} must be a valid number`
    }

    if (validation.min !== undefined && numValue < validation.min) {
      return `${question.text} must be at least ${validation.min}`
    }

    if (validation.max !== undefined && numValue > validation.max) {
      return `${question.text} must be at most ${validation.max}`
    }
  }

  // Text validations
  if (question.type === "TEXT" || question.type === "TEXTAREA") {
    if (validation.min !== undefined && value.length < validation.min) {
      return `${question.text} must be at least ${validation.min} characters`
    }

    if (validation.max !== undefined && value.length > validation.max) {
      return `${question.text} must be at most ${validation.max} characters`
    }

    if (validation.pattern) {
      const regex = new RegExp(validation.pattern)
      if (!regex.test(value)) {
        return validation.message || `${question.text} format is invalid`
      }
    }
  }

  return null
}

export function validateSection(questions: Question[], responses: FormResponse): Record<string, string> {
  const errors: Record<string, string> = {}

  questions.forEach((question) => {
    const error = validateQuestion(question, responses[question.id])
    if (error) {
      errors[question.id] = error
    }
  })

  return errors
}

export function shouldShowQuestion(question: Question, responses: FormResponse): boolean {
  if (!question.conditionalLogic) return true

  const { dependsOn, showWhen, hideWhen } = question.conditionalLogic
  const dependentValue = responses[dependsOn]

  // Check hide conditions first
  if (hideWhen) {
    const hideValues = Array.isArray(hideWhen) ? hideWhen : [hideWhen]
    if (hideValues.includes(dependentValue)) {
      return false
    }
  }

  // Check show conditions
  const showValues = Array.isArray(showWhen) ? showWhen : [showWhen]
  return showValues.includes(dependentValue)
}
