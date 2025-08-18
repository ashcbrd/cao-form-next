// Core types for the SUGB application

export interface User {
  id: string
  email: string
  name?: string
  tenantId?: string
  organization_id?: string
  role: string
  createdAt: Date
  updatedAt: Date
}

export interface Tenant {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export interface Survey {
  id: string
  userId: string
  tenantId?: string
  caoId?: string
  caoVersion?: string
  status: "DRAFT" | "SUBMITTED" | "COMPLETED"
  submittedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Section {
  id: string
  surveyId: string
  name: string
  order: number
  isRequired: boolean
}

export interface Question {
  id: string
  sectionId: string
  questionText: string
  questionType: QuestionType
  order: number
  isRequired: boolean
  validation?: ValidationRule
  options?: string[]
}

export type QuestionType =
  | "TEXT"
  | "TEXTAREA"
  | "NUMBER"
  | "PERCENT"
  | "MONEY"
  | "DATE"
  | "SELECT"
  | "MULTISELECT"
  | "YES_NO_WITH_EXPLANATION"
  | "MULTISELECT_WITH_EXPLANATION"

export interface ValidationRule {
  min?: number
  max?: number
  step?: number
  regex?: string
  required?: boolean
}

export interface Answer {
  id: string
  questionId: string
  surveyId: string
  value: string
  explanation?: string
  createdAt: Date
  updatedAt: Date
}

export interface PrefillValue {
  id: string
  questionId: string
  surveyId: string
  value: string
  source: string
  caoVersion?: string
  createdAt: Date
}

export interface CaoloonCache {
  id: string
  cacheKey: string
  data: any
  expiresAt: Date
  createdAt: Date
}

export interface AuditLog {
  id: string
  userId?: string
  action: string
  entityType: string
  entityId: string
  changes?: any
  ipAddress?: string
  userAgent?: string
  createdAt: Date
}

export interface Attachment {
  id: string
  surveyId: string
  filename: string
  mimeType: string
  size: number
  url: string
  createdAt: Date
}

export interface Organization {
  id: string
  name: string
  cao_id?: string
  industry?: string
  size_category?: string
  createdAt: Date
  updatedAt: Date
}

// Caoloon API types
export interface CaoloonCAO {
  id: string
  name: string
  version: string
  effectiveDate: string
  salaryTables: CaoloonSalaryTable[]
}

export interface CaoloonSalaryTable {
  id: string
  name: string
  scales: CaoloonSalaryScale[]
}

export interface CaoloonSalaryScale {
  id: string
  grade: string
  steps: CaoloonSalaryStep[]
}

export interface CaoloonSalaryStep {
  step: number
  amount: number
  periodical?: number
}

// Form schema types
export interface SurveySchema {
  sections: SectionSchema[]
}

export interface SectionSchema {
  id: string
  name: string
  order: number
  isRequired: boolean
  questions: QuestionSchema[]
}

export interface QuestionSchema {
  id: string
  text: string
  type: QuestionType
  order: number
  isRequired: boolean
  validation?: ValidationRule
  options?: string[]
  prefillMapping?: string // Maps to Caoloon field path
}

// Survey response types for database integration
export interface SurveyResponse {
  id: string
  user_id: string
  organization_id?: string
  survey_version: string
  status: "draft" | "in-progress" | "completed"
  responses: Record<string, any>
  cao_data?: any
  pdf_generated: boolean
  pdf_url?: string
  submitted_at?: Date
  createdAt: Date
  updatedAt: Date
}
