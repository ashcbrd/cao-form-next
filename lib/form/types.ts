export type QuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "MONEY"
  | "PERCENT"
  | "SELECT"
  | "MULTISELECT"
  | "MULTISELECT_WITH_EXPLANATION"
  | "YES_NO_WITH_EXPLANATION"
  | "CHECKBOX"
  | "RADIO"
  | "FILE"
  | "DATE"

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: string
  message?: string
}

export interface Question {
  id: string
  text: string
  type: QuestionType
  order: number
  isRequired: boolean
  validation?: ValidationRule
  options?: string[]
  prefillMapping?: string
  conditionalLogic?: {
    dependsOn: string
    showWhen: string | string[]
    hideWhen?: string | string[]
  }
  helpText?: string
}

export interface Section {
  id: string
  name: string
  order: number
  isRequired: boolean
  questions: Question[]
}

export interface SurveySchema {
  sections: Section[]
}

export interface FormResponse {
  [questionId: string]: any
}

export interface FormState {
  responses: FormResponse
  currentSection: number
  completedSections: string[]
  isValid: boolean
  errors: Record<string, string>
}
