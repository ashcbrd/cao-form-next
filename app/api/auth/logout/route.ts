import { NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/config";

/**
 * POST /api/auth/logout
 * Deletes the session and sends a proper HTTP redirect (307) to the
 * configured post-logout path.
 */
export async function POST(request: Request) {
  try {
    await deleteSession();
    return NextResponse.redirect(
      new URL(authConfig.redirectAfterLogout, request.url),
      { status: 307 }
    );
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
  }
}

/**
 * Optional: allow GET for simple anchor links if you want:
 */
export const GET = POST;
