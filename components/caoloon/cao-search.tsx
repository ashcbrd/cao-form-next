"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Building2, Link, Loader2 } from "lucide-react"
import type { CaoloonOrganization } from "@/lib/caoloon/client"

interface CaoSearchProps {
  onSelect: (organization: CaoloonOrganization) => void
  organizationId?: string
}

export function CaoSearch({ onSelect, organizationId }: CaoSearchProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<CaoloonOrganization[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isLinking, setIsLinking] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/caoloon/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        setResults(data.organizations)
      } else {
        console.error("Search failed:", data.error)
      }
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLink = async (caoOrg: CaoloonOrganization) => {
    if (!organizationId) {
      onSelect(caoOrg)
      return
    }

    setIsLinking(caoOrg.id)
    try {
      const response = await fetch("/api/caoloon/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          caoId: caoOrg.id,
        }),
      })

      if (response.ok) {
        onSelect(caoOrg)
      } else {
        const data = await response.json()
        console.error("Link failed:", data.error)
      }
    } catch (error) {
      console.error("Link error:", error)
    } finally {
      setIsLinking(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search for your organization in CAO database..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">
            Found {results.length} organization{results.length !== 1 ? "s" : ""}
          </h3>

          {results.map((org) => (
            <Card key={org.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      {org.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {org.location.city}, {org.location.province}
                    </CardDescription>
                  </div>
                  <Button onClick={() => handleLink(org)} disabled={isLinking === org.id} size="sm">
                    {isLinking === org.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Link className="h-4 w-4 mr-1" />
                        {organizationId ? "Link" : "Select"}
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 mb-3">
                  {org.industry && <Badge variant="secondary">{org.industry}</Badge>}
                  {org.size_category && <Badge variant="outline">{org.size_category}</Badge>}
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <strong>CAO:</strong> {org.cao_name} ({org.cao_title})
                  </p>
                  {org.employee_count && (
                    <p>
                      <strong>Employees:</strong> ~{org.employee_count.toLocaleString()}
                    </p>
                  )}
                  <p>
                    <strong>Fiscal Year End:</strong> {org.fiscal_year_end}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {query && results.length === 0 && !isSearching && (
        <Card>
          <CardContent className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No organizations found for "{query}". Try a different search term.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
