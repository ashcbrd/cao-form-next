"use client"

import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { sql } from "@/lib/db/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CaoSearch } from "@/components/caoloon/cao-search"
import { User, Building2, Shield, Download, Trash2 } from "lucide-react"

export default async function ProfilePage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Get user's organization
  const organizations = await sql`
    SELECT id, name, cao_id, industry, size_category, created_at
    FROM organizations 
    WHERE id = ${session.user.organization_id}
  `

  const organization = organizations.length > 0 ? organizations[0] : null

  // Get survey count
  const surveyCount = await sql`
    SELECT COUNT(*) as count FROM survey_responses WHERE user_id = ${session.user.id}
  `

  const handleDataExport = async () => {
    "use server"
    // Implementation for data export
    const response = await fetch("/api/gdpr/export", { method: "POST" })
    // Handle response
  }

  const handleDataDeletion = async () => {
    "use server"
    // Implementation for data deletion
    const response = await fetch("/api/gdpr/delete", { method: "POST" })
    // Handle response and redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Profile & Settings</h1>
          <p className="text-gray-600">Manage your account, organization, and data preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{session.user.name || "Not provided"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{session.user.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Role</label>
                <Badge variant="outline">{session.user.role}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Surveys Completed</label>
                <p className="text-gray-900">{surveyCount[0].count}</p>
              </div>
            </CardContent>
          </Card>

          {/* Organization Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Organization
              </CardTitle>
              <CardDescription>Link your organization to CAO database for benchmarking</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization ? (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Organization Name</label>
                    <p className="text-gray-900">{organization.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Industry</label>
                    <p className="text-gray-900">{organization.industry || "Not specified"}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">CAO Status</label>
                    {organization.cao_id ? (
                      <Badge className="bg-green-100 text-green-800">Linked to CAO</Badge>
                    ) : (
                      <Badge variant="outline">Not linked</Badge>
                    )}
                  </div>
                  {!organization.cao_id && (
                    <div className="pt-4">
                      <CaoSearch
                        organizationId={organization.id}
                        onSelect={(caoOrg) => {
                          // Refresh page after linking
                          window.location.reload()
                        }}
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600">No organization linked to your account</p>
              )}
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Data & Privacy (GDPR)
              </CardTitle>
              <CardDescription>Manage your personal data and privacy settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Export Your Data</h4>
                  <p className="text-sm text-gray-600">
                    Download all your personal data including survey responses and account information.
                  </p>
                  <form action={handleDataExport}>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export Data
                    </Button>
                  </form>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-red-700">Delete Account</h4>
                  <p className="text-sm text-gray-600">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <form action={handleDataDeletion}>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
