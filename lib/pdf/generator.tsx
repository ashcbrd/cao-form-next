// lib/pdf/generator.ts
import puppeteer from "puppeteer";
import { promises as fs } from "node:fs";
import path from "node:path";
import { sql } from "@/lib/db/client";
import type { FormResponse } from "@/lib/form/types";

export interface PDFGenerationOptions {
  surveyResponseId: string;
  includeCharts?: boolean;
  includeBenchmarking?: boolean;
  format?: "A4" | "Letter";
  orientation?: "portrait" | "landscape"; // mapped to puppeteer landscape boolean
}

export interface ReportData {
  user: { email: string };
  responses: FormResponse;
  generatedAt: Date;
  reportId: string;
}

class PDFGenerator {
  private async getSurveyData(surveyResponseId: string): Promise<ReportData> {
    const rows = await sql /* sql */ `
      SELECT 
        sr.id,
        sr.responses,
        sr.created_at,
        sr.submitted_at,
        u.email AS user_email
      FROM public.survey_responses sr
      JOIN public.users u ON sr.user_id = u.id
      WHERE sr.id = ${surveyResponseId}
      LIMIT 1
    `;
    if (rows.length === 0) throw new Error("Survey response not found");

    const row = rows[0];
    return {
      user: { email: row.user_email },
      responses: row.responses as FormResponse,
      generatedAt: new Date(),
      reportId: surveyResponseId,
    };
  }

  private generateHTML(data: ReportData): string {
    const { responses, user, generatedAt } = data;

    const grossSalary = Number(responses?.gross_salary ?? 0) || 0;
    const ftePercentage = ftePercentageSafe(responses);
    const annualSalary = Math.round((grossSalary * 12 * ftePercentage) / 100);

    const allowances: string[] = Array.isArray(
      responses?.allowance_types?.selected
    )
      ? responses.allowance_types.selected
      : [];
    const totalAllowances = allowances.length;

    const orgName =
      (responses as any)?.organization_name ?? "Unknown Organization";
    const industry =
      (responses as any)?.organization_industry ?? "Not specified";
    const sizeCategory =
      (responses as any)?.organization_size ?? "Not specified";

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>SUGB Report - ${orgName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; line-height: 1.6; color: #111827; background: #fff; }
  .container { max-width: 800px; margin: 0 auto; padding: 40px; }
  .header { text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 3px solid #2563eb; }
  .header h1 { color: #1e40af; font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: #6b7280; font-size: 14px; }
  .section { margin-bottom: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
  .section h2 { color: #111827; font-size: 18px; margin-bottom: 10px; border-bottom: 2px solid #f3f4f6; padding-bottom: 6px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .item { padding: 12px; background: #f9fafb; border-radius: 6px; }
  .label { font-weight: bold; color: #374151; margin-bottom: 4px; }
  .value { color: #4b5563; font-size: 14px; }
  .metric { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: #fff; padding: 16px; border-radius: 8px; text-align: center; margin: 8px 0; }
  .metric .amount { font-size: 28px; font-weight: bold; margin-bottom: 4px; }
  .benefit { padding: 10px; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 6px; font-size: 14px; margin-bottom: 8px; }
  .footer { margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Standard Inquiry for Equitable Pay (SUGB)</h1>
    <div class="subtitle">Comprehensive Pay Equity Analysis Report</div>
    <div class="subtitle" style="margin-top: 8px;">Generated on ${generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
  </div>

  <div class="section">
    <h2>Organization</h2>
    <div class="grid">
      <div class="item"><div class="label">Name</div><div class="value">${orgName}</div></div>
      <div class="item"><div class="label">Industry</div><div class="value">${industry}</div></div>
      <div class="item"><div class="label">Size Category</div><div class="value">${sizeCategory}</div></div>
      <div class="item"><div class="label">Report Contact</div><div class="value">${user.email}</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Compensation Overview</h2>
    <div class="metric"><div class="amount">€${grossSalary.toLocaleString()}</div><div>Monthly Gross Salary</div></div>
    <div class="metric" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
      <div class="amount">€${annualSalary.toLocaleString()}</div><div>Annual (FTE Adjusted)</div>
    </div>
    <div class="grid" style="margin-top: 12px;">
      <div class="item"><div class="label">Salary Scale</div><div class="value">${responses?.salary_scale ?? "Not specified"}</div></div>
      <div class="item"><div class="label">Salary Step</div><div class="value">${responses?.salary_step ?? "Not specified"}</div></div>
      <div class="item"><div class="label">FTE Percentage</div><div class="value">${ftePercentageSafe(responses)}%</div></div>
      <div class="item"><div class="label">Holiday Allowance</div><div class="value">${responses?.holiday_allowance ?? "Not specified"}%</div></div>
    </div>
  </div>

  <div class="section">
    <h2>Benefits & Allowances</h2>
    ${
      totalAllowances > 0
        ? `<div class="value" style="margin-bottom:8px;"><strong>Allowances:</strong> ${totalAllowances} type(s)</div>
           ${allowances.map((a) => `<div class="benefit">${a}</div>`).join("")}`
        : `<div class="value">No allowances reported</div>`
    }
  </div>

  <div class="section">
    <h2>Pension</h2>
    <div class="grid">
      <div class="item"><div class="label">Scheme</div><div class="value">${responses?.pension_scheme ?? "Not specified"}</div></div>
      <div class="item"><div class="label">Employer Contribution</div><div class="value">${responses?.employer_contribution ?? "Not specified"}%</div></div>
      <div class="item"><div class="label">Employee Contribution</div><div class="value">${responses?.employee_contribution ?? "Not specified"}%</div></div>
      <div class="item"><div class="label">IKB Amount</div><div class="value">€${Number(responses?.ikb_amount ?? 0).toLocaleString()}</div></div>
    </div>
  </div>

  <div class="footer">
    <p>Report ID: ${data.reportId} • Generated: ${generatedAt.toISOString()}</p>
    <p>This document may contain confidential salary information.</p>
  </div>
</div>
</body>
</html>`;
  }

  private async renderPdfBuffer(opts: PDFGenerationOptions): Promise<Buffer> {
    const report = await this.getSurveyData(opts.surveyResponseId);
    const html = this.generateHTML(report);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const buf = await page.pdf({
        format: opts.format ?? "A4",
        landscape: opts.orientation === "landscape",
        printBackground: true,
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      });
      // @ts-ignore
      return buf;
    } finally {
      await browser.close();
    }
  }

  public async generatePDFBuffer(opts: PDFGenerationOptions): Promise<Buffer> {
    return this.renderPdfBuffer(opts); // alias to your existing method
  }
  /** Generate, write to disk, update DB, return public URL */
  async generateAndStore(opts: PDFGenerationOptions): Promise<string> {
    const buffer = await this.renderPdfBuffer(opts);

    const filename = `sugb-report-${opts.surveyResponseId}-${Date.now()}.pdf`;
    const outDir = path.join(process.cwd(), ".next", "cache", "pdfs");
    await fs.mkdir(outDir, { recursive: true });

    const abs = path.join(outDir, filename);
    await fs.writeFile(abs, buffer);

    const pdfUrl = `/api/pdf/download/${encodeURIComponent(filename)}`;

    await sql /* sql */ `
      UPDATE public.survey_responses
      SET pdf_generated = true,
          pdf_url = ${pdfUrl},
          updated_at = NOW()
      WHERE id = ${opts.surveyResponseId}
    `;

    return pdfUrl;
  }
}

function ftePercentageSafe(responses: any): number {
  const v = Number(responses?.fte_percentage ?? 100);
  if (!Number.isFinite(v) || v <= 0) return 100;
  return Math.min(200, Math.max(1, Math.round(v)));
}

export const pdfGenerator = new PDFGenerator();
export async function generatePDFAndStore(
  opts: PDFGenerationOptions
): Promise<string> {
  return pdfGenerator.generateAndStore(opts);
}
