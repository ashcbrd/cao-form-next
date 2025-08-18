interface CaoloonConfig {
  baseUrl: string
  token: string
  timeout: number
  retryAttempts: number
}

interface CaoloonOrganization {
  id: string
  name: string
  industry: string
  size_category: string
  cao_name: string
  cao_title: string
  cao_compensation?: {
    base_salary?: number
    total_compensation?: number
    benefits?: string[]
  }
  location: {
    city: string
    province: string
    country: string
  }
  fiscal_year_end: string
  employee_count?: number
  revenue_range?: string
  last_updated: string
}

interface CaoloonSearchParams {
  name?: string
  industry?: string
  location?: string
  size_category?: string
  limit?: number
  offset?: number
}

interface CaoloonResponse<T> {
  data: T
  pagination?: {
    total: number
    limit: number
    offset: number
    has_more: boolean
  }
  meta: {
    request_id: string
    timestamp: string
  }
}

class CaoloonClient {
  private config: CaoloonConfig

  constructor() {
    this.config = {
      baseUrl: process.env.CAOLOON_BASE_URL || "https://api.caoloon.com/v1",
      token: process.env.CAOLOON_TOKEN || "",
      timeout: 30000,
      retryAttempts: 3,
    }

    if (!this.config.token) {
      throw new Error("CAOLOON_TOKEN environment variable is required")
    }
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, attempt = 1): Promise<CaoloonResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
          "User-Agent": "SUGB-App/1.0",
          ...options.headers,
        },
        signal: AbortSignal.timeout(this.config.timeout),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Caoloon API error: ${response.status} - ${errorData.message || response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error(`Caoloon API request failed (attempt ${attempt}):`, error)

      // Retry logic for network errors
      if (attempt < this.config.retryAttempts && (error instanceof TypeError || error.message.includes("timeout"))) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        return this.makeRequest<T>(endpoint, options, attempt + 1)
      }

      throw error
    }
  }

  async searchOrganizations(params: CaoloonSearchParams): Promise<CaoloonResponse<CaoloonOrganization[]>> {
    const searchParams = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })

    return this.makeRequest<CaoloonOrganization[]>(`/organizations?${searchParams}`)
  }

  async getOrganization(id: string): Promise<CaoloonResponse<CaoloonOrganization>> {
    return this.makeRequest<CaoloonOrganization>(`/organizations/${id}`)
  }

  async getOrganizationByName(name: string): Promise<CaoloonOrganization | null> {
    try {
      const response = await this.searchOrganizations({
        name,
        limit: 1,
      })

      return response.data.length > 0 ? response.data[0] : null
    } catch (error) {
      console.error("Error fetching organization by name:", error)
      return null
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      await this.makeRequest("/health")
      return true
    } catch (error) {
      console.error("Caoloon connection validation failed:", error)
      return false
    }
  }
}

export const caoloonClient = new CaoloonClient()
export type { CaoloonOrganization, CaoloonSearchParams, CaoloonResponse }
