// Validation utilities for form data

import type { ValidationRule, QuestionType } from "../types"

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
  ) {
    super(message)
    this.name = "ValidationError"
  }
}

export function validateAnswer(
  value: string | undefined,
  questionType: QuestionType,
  validation?: ValidationRule,
  isRequired?: boolean,
): string | null {
  // Check required
  if (isRequired && (!value || value.trim() === "")) {
    return "This field is required"
  }

  // If not required and empty, skip validation
  if (!value || value.trim() === "") {
    return null
  }

  // Type-specific validation
  switch (questionType) {
    case "NUMBER":
      return validateNumber(value, validation)
    case "PERCENT":
      return validatePercent(value, validation)
    case "MONEY":
      return validateMoney(value, validation)
    case "DATE":
      return validateDate(value)
    case "TEXT":
    case "TEXTAREA":
      return validateText(value, validation)
    default:
      return null
  }
}

function validateNumber(value: string, validation?: ValidationRule): string | null {
  const num = Number.parseFloat(value)

  if (isNaN(num)) {
    return "Must be a valid number"
  }

  if (validation?.min !== undefined && num < validation.min) {
    return `Must be at least ${validation.min}`
  }

  if (validation?.max !== undefined && num > validation.max) {
    return `Must be at most ${validation.max}`
  }

  if (validation?.step !== undefined && num % validation.step !== 0) {
    return `Must be a multiple of ${validation.step}`
  }

  return null
}

function validatePercent(value: string, validation?: ValidationRule): string | null {
  const num = Number.parseFloat(value)

  if (isNaN(num)) {
    return "Must be a valid percentage"
  }

  if (num < 0 || num > 100) {
    return "Must be between 0 and 100"
  }

  // Check if it has more than 2 decimal places
  if (value.includes(".") && value.split(".")[1].length > 2) {
    return "Maximum 2 decimal places allowed"
  }

  return validateNumber(value, validation)
}

function validateMoney(value: string, validation?: ValidationRule): string | null {
  const num = Number.parseFloat(value)

  if (isNaN(num)) {
    return "Must be a valid amount"
  }

  if (num < 0) {
    return "Amount cannot be negative"
  }

  // Check if it has more than 2 decimal places
  if (value.includes(".") && value.split(".")[1].length > 2) {
    return "Maximum 2 decimal places allowed"
  }

  return validateNumber(value, validation)
}

function validateDate(value: string): string | null {
  const date = new Date(value)

  if (isNaN(date.getTime())) {
    return "Must be a valid date"
  }

  return null
}

function validateText(value: string, validation?: ValidationRule): string | null {
  if (validation?.regex) {
    const regex = new RegExp(validation.regex)
    if (!regex.test(value)) {
      return "Invalid format"
    }
  }

  return null
}

export function validateSurveyData(data: Record<string, any>): ValidationError[] {
  const errors: ValidationError[] = []

  // Add survey-level validation logic here
  // This could include cross-field validation, business rules, etc.

  return errors
}
