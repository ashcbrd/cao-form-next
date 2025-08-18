import { type NextRequest, NextResponse } from "next/server";
import { generateMagicLink } from "@/lib/auth/magic-link";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const magicLink = await generateMagicLink(email);

    // In production, send this via email service (Resend, etc.)
    console.log(`Magic link for ${email}: ${magicLink}`);

    // For demo purposes, we'll return the link
    // In production, remove this and only send via email
    return NextResponse.json({
      message: "Magic link sent successfully",
      // Remove this in production:
      magicLink: process.env.NODE_ENV === "development" ? magicLink : undefined,
    });
  } catch (error) {
    console.error("Magic link generation error:", error);
    return NextResponse.json(
      { error: "Failed to send magic link" },
      { status: 500 }
    );
  }
}

// When domain is added and verified in resend.com

// import { type NextRequest, NextResponse } from "next/server";
// import { Resend } from "resend";
// import { generateMagicLink } from "@/lib/auth/magic-link";
// import { MagicLinkEmail } from "@/lib/email/templates/magic-link";

// export const dynamic = "force-dynamic"; // ensure no caching of POST responses

// const resend = new Resend(process.env.RESEND_API_KEY);

// export async function POST(request: NextRequest) {
//   try {
//     const { email } = await request.json();

//     if (!email || typeof email !== "string" || !email.includes("@")) {
//       return NextResponse.json(
//         { error: "Valid email is required" },
//         { status: 400 }
//       );
//     }

//     // Build the magic link (uses NEXTAUTH_URL or defaults inside the helper)
//     const magicLink = await generateMagicLink(email);

//     // Send the email
//     const from = process.env.EMAIL_FROM || "noreply@example.com";
//     const subject = "Your SUGB sign-in link";

//     // You can use either `react:` (recommended) or `html:`
//     const { error } = await resend.emails.send({
//       from,
//       to: email,
//       subject,
//       react: MagicLinkEmail({ link: magicLink }),
//       // html: `<p>Click <a href="${magicLink}">here</a> to sign in.</p>`, // alternative
//     });

//     if (error) {
//       console.error("Resend send error:", error);
//       return NextResponse.json(
//         { error: "Failed to send magic link" },
//         { status: 500 }
//       );
//     }

//     // For local dev it’s handy to still log the link
//     if (process.env.NODE_ENV === "development") {
//       console.log(`Magic link for ${email}: ${magicLink}`);
//     }

//     // Avoid user enumeration: always return success
//     return NextResponse.json({
//       message: "If that email exists, we’ve sent a link.",
//     });
//   } catch (err) {
//     console.error("Magic link generation error:", err);
//     return NextResponse.json(
//       { error: "Failed to send magic link" },
//       { status: 500 }
//     );
//   }
// }
