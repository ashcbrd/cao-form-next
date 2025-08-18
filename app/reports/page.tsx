import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth/session"
import { sql } from "@/lib/db/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PDFGenerator } from "@/components/pdf/pdf-generator"
import { FileText, Download, Calendar, Clock } from "lucide-react"

export default async function ReportsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Get user's survey responses
  const surveyResponses = await sql`
    SELECT 
      id,
      survey_version,
      status,
      pdf_generated,
      pdf_url,
      submitted_at,
      created_at,
      updated_at
    FROM survey_responses 
    WHERE user_id = ${session.user.id}
    ORDER BY created_at DESC
  `

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "in-progress":
        return "bg-blue-100 text-blue-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Survey Reports</h1>
          <p className="text-gray-600">View and download your completed survey reports</p>
        </div>

        {surveyResponses.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-600 mb-4">Complete a survey to generate your first pay equity report.</p>
              <Button asChild>
                <a href="/survey">Start New Survey</a>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {surveyResponses.map((response) => (
              <Card key={response.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        SUGB Survey Report
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4 mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Created: {formatDate(response.created_at)}
                        </span>
                        {response.submitted_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            Submitted: {formatDate(response.submitted_at)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(response.status)}>{response.status}</Badge>
                      <Badge variant="outline">v{response.survey_version}</Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">Survey ID: {response.id}</p>
                      {response.pdf_generated ? (
                        <p className="text-sm text-green-600 font-medium">✓ PDF report available</p>
                      ) : response.status === "completed" ? (
                        <p className="text-sm text-blue-600">PDF generation available</p>
                      ) : (
                        <p className="text-sm text-gray-500">Complete survey to generate PDF</p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {response.pdf_url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={response.pdf_url} download>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </a>
                        </Button>
                      ) : (
                        response.status === "completed" && (
                          <PDFGenerator
                            surveyResponseId={response.id}
                            onGenerated={(pdfUrl) => {
                              // Refresh page to show new PDF
                              window.location.reload()
                            }}
                          />
                        )
                      )}

                      {response.status !== "completed" && (
                        <Button size="sm" asChild>
                          <a href="/survey">Continue Survey</a>
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
