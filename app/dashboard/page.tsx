import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LogOut, FileText, BarChart3, Settings } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  // Get survey statistics
  const surveyStats = await sql /* sql */ `
  WITH has_table AS (
    SELECT to_regclass('public.survey_responses') AS rel
  )
  SELECT
    CASE WHEN (SELECT rel FROM has_table) IS NULL THEN 0
         ELSE (SELECT COUNT(*) FROM public.survey_responses WHERE user_id = ${session.user.id})
    END AS total_surveys,
    CASE WHEN (SELECT rel FROM has_table) IS NULL THEN 0
         ELSE (SELECT COUNT(*) FROM public.survey_responses WHERE user_id = ${session.user.id} AND status = 'completed')
    END AS completed_surveys,
    CASE WHEN (SELECT rel FROM has_table) IS NULL THEN 0
         ELSE (SELECT COUNT(*) FROM public.survey_responses WHERE user_id = ${session.user.id} AND pdf_generated = true)
    END AS reports_generated
`;
  const stats = surveyStats[0];

  const handleLogout = async () => {
    "use server";
    await fetch("/api/auth/logout", { method: "POST" });
    redirect("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                SUGB Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {session.user.name || session.user.email}
              </span>
              <form action={handleLogout}>
                <LogoutButton />
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Standard Inquiry for Equitable Pay
          </h2>
          <p className="text-gray-600">
            Complete your organization's pay equity analysis and generate
            comprehensive reports.
          </p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Surveys
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_surveys}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.completed_surveys}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Reports Generated
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.reports_generated}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                New Survey
              </CardTitle>
              <CardDescription>
                Start a new pay equity survey for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" asChild>
                <a href="/survey">Begin Survey</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                View Reports
              </CardTitle>
              <CardDescription>
                Access and download your completed survey reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <a href="/reports">View Reports</a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Profile & Settings
              </CardTitle>
              <CardDescription>
                Manage your account and organization settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full bg-transparent"
                asChild
              >
                <a href="/profile">Manage Profile</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
