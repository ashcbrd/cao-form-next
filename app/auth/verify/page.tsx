// app/auth/verify/page.tsx
import { redirect } from "next/navigation";
import { verifyMagicLink } from "@/lib/auth/magic-link";
import { createSessionForEmail } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/config";

interface VerifyPageProps {
  searchParams: { token?: string; email?: string };
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token, email } = searchParams;

  if (!token || !email) {
    redirect("/login?error=invalid-link");
  }

  try {
    const isValid = await verifyMagicLink(token, email);
    if (!isValid) {
      redirect("/login?error=expired-link");
    }

    // ✅ Only use the safe, email-based creator (atomic)
    await createSessionForEmail(email);

    redirect(authConfig.redirectAfterLogin);
  } catch (error) {
    console.error("Magic link verification error:", error);
    redirect("/login?error=verification-failed");
  }
}
