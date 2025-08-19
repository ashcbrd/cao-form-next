// app/api/auth/send-magic-link/route.ts
import { type NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";
import { generateMagicLink } from "@/lib/auth/magic-link";
import { render } from "@react-email/render";
import { MagicLinkEmail } from "@/lib/email/templates/magic-link";
import React from "react";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const magicLink = await generateMagicLink(email);

    const from = process.env.EMAIL_FROM || "noreply@example.com";
    const subject = "Your SUGB sign-in link";

    const emailElement = React.createElement(MagicLinkEmail, {
      link: magicLink,
    });
    const html = await render(emailElement);
    const text = `Click this link to sign in: ${magicLink}`;

    await sgMail.send({ to: email, from, subject, html, text });

    if (process.env.NODE_ENV === "development") {
      console.log(`Magic link for ${email}: ${magicLink}`);
    }

    // Avoid user enumeration
    return NextResponse.json({
      message: "If that email exists, we’ve sent a link.",
    });
  } catch (err) {
    console.error("SendGrid send error:", err);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}
