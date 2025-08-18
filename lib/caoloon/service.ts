import { sql } from "@/lib/db/client"
import { caoloonClient, type CaoloonOrganization } from "./client"

export interface OrganizationWithCao {
  id: string
  name: string
  cao_id?: string
  industry?: string
  size_category?: string
  cao_data?: CaoloonOrganization
  last_cao_sync?: Date
}

export class CaoloonService {
  async syncOrganizationData(organizationId: string): Promise<CaoloonOrganization | null> {
    try {
      // Get organization from database
      const orgs = await sql`
        SELECT id, name, cao_id, industry, size_category
        FROM organizations 
        WHERE id = ${organizationId}
      `

      if (orgs.length === 0) {
        throw new Error("Organization not found")
      }

      const org = orgs[0]
      let caoData: CaoloonOrganization | null = null

      // Try to fetch by CAO ID first, then by name
      if (org.cao_id) {
        const response = await caoloonClient.getOrganization(org.cao_id)
        caoData = response.data
      } else {
        caoData = await caoloonClient.getOrganizationByName(org.name)
      }

      if (caoData) {
        // Update organization with CAO data
        await sql`
          UPDATE organizations 
          SET 
            cao_id = ${caoData.id},
            industry = COALESCE(${caoData.industry}, industry),
            size_category = COALESCE(${caoData.size_category}, size_category),
            updated_at = NOW()
          WHERE id = ${organizationId}
        `

        // Log the sync
        await this.logCaoSync(organizationId, caoData.id, "success")
      }

      return caoData
    } catch (error) {
      console.error("CAO data sync failed:", error)
      await this.logCaoSync(organizationId, null, "failed", error.message)
      return null
    }
  }

  async searchCaoOrganizations(query: string, limit = 10): Promise<CaoloonOrganization[]> {
    try {
      const response = await caoloonClient.searchOrganizations({
        name: query,
        limit,
      })
      return response.data
    } catch (error) {
      console.error("CAO search failed:", error)
      return []
    }
  }

  async linkOrganizationToCao(organizationId: string, caoId: string): Promise<boolean> {
    try {
      // Verify CAO organization exists
      const caoResponse = await caoloonClient.getOrganization(caoId)
      const caoData = caoResponse.data

      // Update organization with CAO link
      await sql`
        UPDATE organizations 
        SET 
          cao_id = ${caoId},
          industry = COALESCE(${caoData.industry}, industry),
          size_category = COALESCE(${caoData.size_category}, size_category),
          updated_at = NOW()
        WHERE id = ${organizationId}
      `

      await this.logCaoSync(organizationId, caoId, "linked")
      return true
    } catch (error) {
      console.error("CAO linking failed:", error)
      return false
    }
  }

  async getCaoDataForOrganization(organizationId: string): Promise<CaoloonOrganization | null> {
    try {
      const orgs = await sql`
        SELECT cao_id FROM organizations WHERE id = ${organizationId}
      `

      if (orgs.length === 0 || !orgs[0].cao_id) {
        return null
      }

      const response = await caoloonClient.getOrganization(orgs[0].cao_id)
      return response.data
    } catch (error) {
      console.error("Failed to get CAO data:", error)
      return null
    }
  }

  private async logCaoSync(
    organizationId: string,
    caoId: string | null,
    status: "success" | "failed" | "linked",
    errorMessage?: string,
  ): Promise<void> {
    try {
      await sql`
        INSERT INTO audit_logs (
          resource_type, 
          resource_id, 
          action, 
          details, 
          created_at
        ) VALUES (
          'organization',
          ${organizationId},
          ${`cao_sync_${status}`},
          ${JSON.stringify({
            cao_id: caoId,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          })},
          NOW()
        )
      `
    } catch (error) {
      console.error("Failed to log CAO sync:", error)
    }
  }

  async validateCaoloonConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      const isConnected = await caoloonClient.validateConnection()
      return { connected: isConnected }
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }
}

export const caoloonService = new CaoloonService()
