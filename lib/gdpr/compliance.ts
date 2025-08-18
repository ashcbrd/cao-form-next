import { sql } from "@/lib/db/client";

type ExportUser = {
  id: string;
  email: string;
  role: string | null;
  email_verified: boolean | null;
  verified_at: string | null; // ISO
  created_at: string; // ISO
  updated_at: string | null; // ISO
  last_login_at: string | null; // ISO
};

export interface DataExport {
  user: ExportUser;
  organizations: any[]; // stays empty (no org_id on users)
  surveyResponses: any[];
  auditLogs: any[];
  exportedAt: string;
}

const toIso = (v: any) => (v ? new Date(v).toISOString() : null);

export class GDPRService {
  async exportUserData(userId: string): Promise<DataExport> {
    // --- user (columns that actually exist) ---
    const rows = await sql /* sql */ `
      SELECT
        u.id,
        u.email,
        u.role,
        u.email_verified,
        u.verified_at,
        u.created_at,
        u.updated_at,
        u.last_login_at
      FROM public.users u
      WHERE u.id = ${userId}
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("User not found");

    const r = rows[0] as Record<string, any>;
    const user: ExportUser = {
      id: String(r.id),
      email: String(r.email),
      role: r.role ?? null,
      email_verified: r.email_verified ?? null,
      verified_at: toIso(r.verified_at),
      created_at: toIso(r.created_at)!,
      updated_at: toIso(r.updated_at),
      last_login_at: toIso(r.last_login_at),
    };

    // --- no organization_id on users → keep empty array ---
    const organizations: any[] = [];

    // --- survey responses (your current columns) ---
    let surveyResponses: any[] = [];
    try {
      surveyResponses = await sql /* sql */ `
        SELECT
          id, user_id, status,
          created_at, submitted_at, updated_at,
          pdf_generated, pdf_url, responses
        FROM public.survey_responses
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;
    } catch {
      surveyResponses = [];
    }

    // --- audit logs (optional) ---
    let auditLogs: any[] = [];
    try {
      auditLogs = await sql /* sql */ `
        SELECT id, user_id, action, resource_type, resource_id, details, created_at
        FROM public.audit_logs
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
    } catch {
      auditLogs = [];
    }

    return {
      user,
      organizations,
      surveyResponses,
      auditLogs,
      exportedAt: new Date().toISOString(),
    };
  }

  async deleteUserData(userId: string): Promise<void> {
    try {
      await sql /* sql */ `DELETE FROM public.magic_links WHERE user_id = ${userId}`;
    } catch {}
    try {
      await sql /* sql */ `DELETE FROM public.sessions WHERE user_id = ${userId}`;
    } catch {}
    try {
      await sql /* sql */ `DELETE FROM public.survey_responses WHERE user_id = ${userId}`;
    } catch {}
    try {
      await sql /* sql */ `DELETE FROM public.audit_logs WHERE user_id = ${userId}`;
    } catch {}
    await sql /* sql */ `DELETE FROM public.users WHERE id = ${userId}`;
    try {
      await sql /* sql */ `
        INSERT INTO public.audit_logs (action, resource_type, details)
        VALUES ('user_data_deleted', 'user', ${JSON.stringify({ deleted_at: new Date().toISOString() })})
      `;
    } catch {}
  }

  async anonymizeUserData(userId: string): Promise<void> {
    await sql /* sql */ `
      UPDATE public.users
      SET email = CONCAT('deleted-user-', id, '@anonymized.local'),
          updated_at = NOW()
      WHERE id = ${userId}
    `;
    try {
      await sql /* sql */ `
        UPDATE public.survey_responses
        SET responses = jsonb_set(
              jsonb_set(responses, '{employee_name}', '"[ANONYMIZED]"', true),
              '{employee_id}',    '"[ANONYMIZED]"', true
            )
        WHERE user_id = ${userId}
      `;
    } catch {}
    try {
      await sql /* sql */ `
        INSERT INTO public.audit_logs (action, resource_type, details)
        VALUES ('user_data_anonymized', 'user', ${JSON.stringify({ anonymized_at: new Date().toISOString() })})
      `;
    } catch {}
  }
}

export const gdprService = new GDPRService();
