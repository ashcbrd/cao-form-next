import puppeteer from "puppeteer"
import { sql } from "@/lib/db/client"
import { caoloonService } from "@/lib/caoloon/service"
import type { FormResponse } from "@/lib/form/types"

export interface PDFGenerationOptions {
  surveyResponseId: string
  includeCharts?: boolean
  includeBenchmarking?: boolean
  format?: "A4" | "Letter"
  orientation?: "portrait" | "landscape"
}

export interface ReportData {
  organization: {
    name: string
    cao_id?: string
    industry?: string
    size_category?: string
  }
  user: {
    name?: string
    email: string
  }
  responses: FormResponse
  caoData?: any
  generatedAt: Date
  reportId: string
}

export class PDFGenerator {
  private async getSurveyData(surveyResponseId: string): Promise<ReportData> {
    const surveyData = await sql`
      SELECT 
        sr.id,
        sr.responses,
        sr.created_at,
        sr.submitted_at,
        u.name as user_name,
        u.email as user_email,
        o.name as org_name,
        o.cao_id,
        o.industry,
        o.size_category
      FROM survey_responses sr
      JOIN users u ON sr.user_id = u.id
      LEFT JOIN organizations o ON sr.organization_id = o.id
      WHERE sr.id = ${surveyResponseId}
    `

    if (surveyData.length === 0) {
      throw new Error("Survey response not found")
    }

    const data = surveyData[0]

    // Get CAO data if available
    let caoData = null
    if (data.cao_id) {
      caoData = await caoloonService.getCaoDataForOrganization(data.organization_id)
    }

    return {
      organization: {
        name: data.org_name || "Unknown Organization",
        cao_id: data.cao_id,
        industry: data.industry,
        size_category: data.size_category,
      },
      user: {
        name: data.user_name,
        email: data.user_email,
      },
      responses: data.responses,
      caoData,
      generatedAt: new Date(),
      reportId: surveyResponseId,
    }
  }

  private generateHTML(data: ReportData, options: PDFGenerationOptions): string {
    const { responses, organization, user, caoData, generatedAt } = data

    // Calculate key metrics
    const grossSalary = Number.parseFloat(responses.gross_salary) || 0
    const ftePercentage = Number.parseFloat(responses.fte_percentage) || 100
    const annualSalary = (grossSalary * 12 * ftePercentage) / 100

    const allowances = responses.allowance_types?.selected || []
    const totalAllowances = allowances.length

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>SUGB Report - ${organization.name}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: 'Arial', sans-serif;
                line-height: 1.6;
                color: #333;
                background: white;
            }
            
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 40px;
            }
            
            .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 3px solid #2563eb;
            }
            
            .header h1 {
                color: #1e40af;
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .header .subtitle {
                color: #6b7280;
                font-size: 16px;
            }
            
            .section {
                margin-bottom: 30px;
                padding: 20px;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
            }
            
            .section h2 {
                color: #1f2937;
                font-size: 20px;
                margin-bottom: 15px;
                padding-bottom: 8px;
                border-bottom: 2px solid #f3f4f6;
            }
            
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 20px;
            }
            
            .info-item {
                padding: 15px;
                background: #f9fafb;
                border-radius: 6px;
            }
            
            .info-item .label {
                font-weight: bold;
                color: #374151;
                margin-bottom: 5px;
            }
            
            .info-item .value {
                color: #6b7280;
                font-size: 14px;
            }
            
            .metric-card {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
                margin: 10px 0;
            }
            
            .metric-card .amount {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .metric-card .label {
                font-size: 14px;
                opacity: 0.9;
            }
            
            .benefits-list {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-top: 15px;
            }
            
            .benefit-item {
                padding: 12px;
                background: #ecfdf5;
                border: 1px solid #d1fae5;
                border-radius: 6px;
                font-size: 14px;
            }
            
            .footer {
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                color: #6b7280;
                font-size: 12px;
            }
            
            .cao-section {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }
            
            .cao-section h3 {
                color: #92400e;
                margin-bottom: 10px;
            }
            
            @media print {
                body { print-color-adjust: exact; }
                .container { padding: 20px; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>Standard Inquiry for Equitable Pay (SUGB)</h1>
                <div class="subtitle">Comprehensive Pay Equity Analysis Report</div>
                <div style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    Generated on ${generatedAt.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                </div>
            </div>

            <!-- Organization Information -->
            <div class="section">
                <h2>Organization Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Organization Name</div>
                        <div class="value">${organization.name}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Industry</div>
                        <div class="value">${organization.industry || "Not specified"}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Size Category</div>
                        <div class="value">${organization.size_category || "Not specified"}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">CAO ID</div>
                        <div class="value">${organization.cao_id || "Not linked"}</div>
                    </div>
                </div>
            </div>

            <!-- Employee Information -->
            <div class="section">
                <h2>Employee Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Employee Name</div>
                        <div class="value">${responses.employee_name || "Not provided"}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Employee ID</div>
                        <div class="value">${responses.employee_id || "Not provided"}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Report Contact</div>
                        <div class="value">${user.email}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">FTE Percentage</div>
                        <div class="value">${ftePercentage}%</div>
                    </div>
                </div>
            </div>

            <!-- Compensation Overview -->
            <div class="section">
                <h2>Compensation Overview</h2>
                
                <div class="metric-card">
                    <div class="amount">€${grossSalary.toLocaleString()}</div>
                    <div class="label">Monthly Gross Salary</div>
                </div>
                
                <div class="metric-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                    <div class="amount">€${annualSalary.toLocaleString()}</div>
                    <div class="label">Annual Salary (FTE Adjusted)</div>
                </div>

                <div class="info-grid" style="margin-top: 20px;">
                    <div class="info-item">
                        <div class="label">Salary Scale</div>
                        <div class="value">${responses.salary_scale || "Not specified"}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Salary Step</div>
                        <div class="value">${responses.salary_step || "Not specified"}</div>
                    </div>
                </div>
            </div>

            <!-- Benefits & Allowances -->
            <div class="section">
                <h2>Benefits & Allowances</h2>
                
                ${
                  responses.has_allowances?.answer === "yes"
                    ? `
                <div style="margin-bottom: 15px;">
                    <strong>Allowances Received:</strong> ${totalAllowances} type(s)
                </div>
                <div class="benefits-list">
                    ${allowances.map((allowance) => `<div class="benefit-item">${allowance}</div>`).join("")}
                </div>
                ${
                  responses.has_allowances?.explanation
                    ? `<div style="margin-top: 15px; padding: 10px; background: #f3f4f6; border-radius: 4px; font-size: 14px;">
                        <strong>Details:</strong> ${responses.has_allowances.explanation}
                       </div>`
                    : ""
                }
                `
                    : `<div style="color: #6b7280;">No allowances reported</div>`
                }
            </div>

            <!-- Leave & Benefits -->
            <div class="section">
                <h2>Leave & Additional Benefits</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Annual Leave Days</div>
                        <div class="value">${responses.annual_leave_days || "Not specified"} days</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Sick Pay Percentage</div>
                        <div class="value">${responses.sick_pay_percentage || "Not specified"}%</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Holiday Allowance</div>
                        <div class="value">${responses.holiday_allowance || "Not specified"}%</div>
                    </div>
                    <div class="info-item">
                        <div class="label">IKB Amount</div>
                        <div class="value">€${Number.parseFloat(responses.ikb_amount || "0").toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <!-- Pension Information -->
            <div class="section">
                <h2>Pension Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="label">Pension Scheme</div>
                        <div class="value">${responses.pension_scheme || "Not specified"}</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Employer Contribution</div>
                        <div class="value">${responses.employer_contribution || "Not specified"}%</div>
                    </div>
                    <div class="info-item">
                        <div class="label">Employee Contribution</div>
                        <div class="value">${responses.employee_contribution || "Not specified"}%</div>
                    </div>
                </div>
            </div>

            ${
              caoData
                ? `
            <!-- CAO Benchmarking -->
            <div class="cao-section">
                <h3>CAO Benchmarking Data</h3>
                <p><strong>CAO Organization:</strong> ${caoData.name}</p>
                <p><strong>CAO Name:</strong> ${caoData.cao_name} (${caoData.cao_title})</p>
                <p><strong>Industry:</strong> ${caoData.industry}</p>
                <p><strong>Size Category:</strong> ${caoData.size_category}</p>
                ${
                  caoData.cao_compensation?.total_compensation
                    ? `<p><strong>CAO Total Compensation:</strong> €${caoData.cao_compensation.total_compensation.toLocaleString()}</p>`
                    : ""
                }
            </div>
            `
                : ""
            }

            <!-- Footer -->
            <div class="footer">
                <p>This report was generated by the SUGB (Standard Inquiry for Equitable Pay) system.</p>
                <p>Report ID: ${data.reportId} | Generated: ${generatedAt.toISOString()}</p>
                <p>This document contains confidential salary information and should be handled accordingly.</p>
            </div>
        </div>
    </body>
    </html>
    `
  }

  async generatePDF(options: PDFGenerationOptions): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null

    try {
      // Get survey data
      const reportData = await this.getSurveyData(options.surveyResponseId)

      // Generate HTML
      const html = this.generateHTML(reportData, options)

      // Launch Puppeteer
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })

      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: "networkidle0" })

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options.format || "A4",
        orientation: options.orientation || "portrait",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "15mm",
          bottom: "20mm",
          left: "15mm",
        },
      })

      return pdfBuffer
    } catch (error) {
      console.error("PDF generation error:", error)
      throw new Error(`Failed to generate PDF: ${error.message}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  async generateAndStore(options: PDFGenerationOptions): Promise<string> {
    try {
      // Generate PDF
      const pdfBuffer = await this.generatePDF(options)

      // Store PDF (in production, use cloud storage like Vercel Blob)
      const filename = `sugb-report-${options.surveyResponseId}-${Date.now()}.pdf`
      const pdfUrl = `/api/pdf/download/${filename}` // Placeholder URL

      // Update survey response with PDF info
      await sql`
        UPDATE survey_responses 
        SET 
          pdf_generated = true,
          pdf_url = ${pdfUrl},
          updated_at = NOW()
        WHERE id = ${options.surveyResponseId}
      `

      // Log PDF generation
      await sql`
        INSERT INTO audit_logs (
          action, 
          resource_type, 
          resource_id, 
          details
        ) VALUES (
          'pdf_generated',
          'survey_response',
          ${options.surveyResponseId},
          ${JSON.stringify({
            filename,
            format: options.format,
            orientation: options.orientation,
            generated_at: new Date().toISOString(),
          })}
        )
      `

      return pdfUrl
    } catch (error) {
      console.error("PDF generation and storage error:", error)
      throw error
    }
  }
}

export const pdfGenerator = new PDFGenerator()
