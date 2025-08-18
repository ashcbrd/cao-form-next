import { NextResponse, type NextRequest } from "next/server";
import { getSession, deleteSession } from "@/lib/auth/session";
import { gdprService } from "@/lib/gdpr/compliance";

export async function POST(_req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      // Nothing to delete; also ensure any cookie is cleared
      await deleteSession();
      return NextResponse.json({ ok: true, loggedOut: true });
    }

    // 1) Delete user data (this already removes related rows)
    await gdprService.deleteUserData(session.user.id);

    // 2) Proactively clear any active session cookie + DB session
    await deleteSession();

    return NextResponse.json({ ok: true, loggedOut: true });
  } catch (err) {
    console.error("GDPR delete error:", err);
    // Even on error, try to log the user out so they aren't stuck "signed in"
    try {
      await deleteSession();
    } catch {}
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

// (Optional) block other verbs
export function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
