import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export interface EmailTemplate {
  to: string
  subject: string
  html: string
  from?: string
}

export class EmailService {
  private fromEmail = process.env.EMAIL_FROM || "noreply@sugb.app"

  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    const template: EmailTemplate = {
      to: email,
      subject: "Your SUGB Login Link",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>SUGB Login</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #2563eb; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SUGB - Standard Inquiry for Equitable Pay</h1>
            </div>
            <div class="content">
              <h2>Sign in to your account</h2>
              <p>Click the button below to securely sign in to your SUGB account:</p>
              <a href="${magicLink}" class="button">Sign In to SUGB</a>
              <p>This link will expire in 15 minutes for security reasons.</p>
              <p>If you didn't request this login link, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This email was sent by the SUGB system for secure authentication.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    await this.sendEmail(template)
  }

  async sendSurveySubmissionConfirmation(email: string, surveyId: string): Promise<void> {
    const template: EmailTemplate = {
      to: email,
      subject: "SUGB Survey Submitted Successfully",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Survey Submitted</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .success { background: #d1fae5; border: 1px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Survey Submitted Successfully</h1>
            </div>
            <div class="content">
              <div class="success">
                <h3>✓ Your SUGB survey has been submitted</h3>
              </div>
              <p>Thank you for completing your Standard Inquiry for Equitable Pay survey.</p>
              <p><strong>Survey ID:</strong> ${surveyId}</p>
              <p>Your responses have been securely stored and will be processed to generate your pay equity report.</p>
              <p>You will receive another email notification once your PDF report is ready for download.</p>
            </div>
            <div class="footer">
              <p>SUGB - Standard Inquiry for Equitable Pay</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    await this.sendEmail(template)
  }

  async sendPDFReadyNotification(email: string, pdfUrl: string, surveyId: string): Promise<void> {
    const template: EmailTemplate = {
      to: email,
      subject: "Your SUGB Report is Ready",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Report Ready</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #7c3aed; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9fafb; }
            .button { 
              display: inline-block; 
              background: #7c3aed; 
              color: white; 
              padding: 12px 24px; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { padding: 20px; text-align: center; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Your Pay Equity Report is Ready</h1>
            </div>
            <div class="content">
              <h2>Download Your SUGB Report</h2>
              <p>Your comprehensive pay equity analysis report has been generated and is ready for download.</p>
              <p><strong>Survey ID:</strong> ${surveyId}</p>
              <a href="${pdfUrl}" class="button">Download PDF Report</a>
              <p>This report contains confidential salary information. Please handle it securely and in accordance with your organization's data protection policies.</p>
            </div>
            <div class="footer">
              <p>SUGB - Standard Inquiry for Equitable Pay</p>
            </div>
          </div>
        </body>
        </html>
      `,
    }

    await this.sendEmail(template)
  }

  private async sendEmail(template: EmailTemplate): Promise<void> {
    try {
      await resend.emails.send({
        from: template.from || this.fromEmail,
        to: template.to,
        subject: template.subject,
        html: template.html,
      })
    } catch (error) {
      console.error("Email sending failed:", error)
      throw new Error(`Failed to send email: ${error.message}`)
    }
  }
}

export const emailService = new EmailService()
