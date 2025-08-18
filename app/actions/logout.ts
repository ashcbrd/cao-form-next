"use server";

import { redirect } from "next/navigation";
import { deleteSession } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/config";

/**
 * Logs out the current user by deleting the session, then redirects
 * to the post-logout page configured in authConfig.redirectAfterLogout.
 */
export async function logoutAction(): Promise<never> {
  await deleteSession();
  redirect(authConfig.redirectAfterLogout);
}
