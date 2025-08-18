import { sql } from "@/lib/db/client"
import type { User } from "@/lib/types"

export interface DataExport {
  user: User
  organizations: any[]
  surveyResponses: any[]
  auditLogs: any[]
  exportedAt: Date
}

export class GDPRService {
  async exportUserData(userId: string): Promise<DataExport> {
    try {
      // Get user data
      const users = await sql`
        SELECT id, email, name, organization_id, role, created_at, updated_at
        FROM users WHERE id = ${userId}
      `

      if (users.length === 0) {
        throw new Error("User not found")
      }

      const user = users[0] as User

      // Get organization data
      const organizations = await sql`
        SELECT id, name, cao_id, industry, size_category, created_at
        FROM organizations WHERE id = ${user.organization_id}
      `

      // Get survey responses
      const surveyResponses = await sql`
        SELECT id, survey_version, responses, status, submitted_at, created_at
        FROM survey_responses WHERE user_id = ${userId}
      `

      // Get audit logs
      const auditLogs = await sql`
        SELECT action, resource_type, resource_id, details, created_at
        FROM audit_logs WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `

      return {
        user,
        organizations,
        surveyResponses,
        auditLogs,
        exportedAt: new Date(),
      }
    } catch (error) {
      console.error("Data export failed:", error)
      throw error
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    try {
      // Start transaction-like deletion
      await sql`DELETE FROM audit_logs WHERE user_id = ${userId}`
      await sql`DELETE FROM survey_responses WHERE user_id = ${userId}`
      await sql`DELETE FROM users WHERE id = ${userId}`

      // Log the deletion (anonymized)
      await sql`
        INSERT INTO audit_logs (action, resource_type, details)
        VALUES ('user_data_deleted', 'user', ${JSON.stringify({ deleted_at: new Date().toISOString() })})
      `
    } catch (error) {
      console.error("Data deletion failed:", error)
      throw error
    }
  }

  async anonymizeUserData(userId: string): Promise<void> {
    try {
      // Anonymize user data while keeping survey responses for analytics
      await sql`
        UPDATE users 
        SET 
          email = CONCAT('deleted-user-', id, '@anonymized.local'),
          name = 'Deleted User',
          updated_at = NOW()
        WHERE id = ${userId}
      `

      // Anonymize survey responses
      await sql`
        UPDATE survey_responses 
        SET responses = jsonb_set(
          jsonb_set(responses, '{employee_name}', '"[ANONYMIZED]"'),
          '{employee_id}', '"[ANONYMIZED]"'
        )
        WHERE user_id = ${userId}
      `

      // Log the anonymization
      await sql`
        INSERT INTO audit_logs (user_id, action, resource_type, details)
        VALUES (${userId}, 'user_data_anonymized', 'user', ${JSON.stringify({ anonymized_at: new Date().toISOString() })})
      `
    } catch (error) {
      console.error("Data anonymization failed:", error)
      throw error
    }
  }
}

export const gdprService = new GDPRService()
