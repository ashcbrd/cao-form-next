import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { sql } from "@/lib/db/client";
import type { JSX } from "react";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage(): Promise<JSX.Element> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  // Organization
  const organizations = await sql`
    SELECT id, name, cao_id, industry, size_category, created_at
    FROM organizations 
    WHERE id = ${session.user.organization_id}
  `;
  const organization =
    organizations.length > 0
      ? {
          id: String(organizations[0].id),
          name: String(organizations[0].name),
          cao_id: organizations[0].cao_id,
          industry: organizations[0].industry,
          size_category: organizations[0].size_category,
          created_at: String(organizations[0].created_at),
        }
      : {
          id: "",
          name: "",
          cao_id: null,
          industry: null,
          size_category: null,
          created_at: "",
        };

  // Survey count
  const countRows = await sql`
    SELECT COUNT(*) as count FROM survey_responses WHERE user_id = ${session.user.id}
  `;
  const surveyCount = Number(countRows[0]?.count ?? 0);

  return (
    <ProfileClient
      user={{
        name: session.user.name ?? "",
        email: session.user.email,
        role: session.user.role,
      }}
      organization={organization}
      surveyCount={surveyCount}
    />
  );
}
