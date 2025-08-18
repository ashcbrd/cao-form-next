"use server";

import { getSession } from "@/lib/auth/session";
import { authConfig } from "@/lib/auth/config";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

/** Resolve a base URL for server-side fetches */
function resolveBaseUrl() {
  // Prefer explicit env in dev/prod
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  // Fallback: build from current Host header
  const host = headers().get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

async function authedPost(path: string, body?: unknown) {
  const base = resolveBaseUrl();
  const cookieStore = cookies();
  const token = cookieStore.get(authConfig.cookieName)?.value ?? "";

  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // forward session cookie so the API route sees you as logged in
      Cookie: `${authConfig.cookieName}=${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Request to ${path} failed (${res.status}): ${text}`);
  }
  return res;
}

export async function exportDataAction() {
  const session = await getSession();
  if (!session) redirect("/login");

  await authedPost("/api/gdpr/export");
  // If your API returns a URL, you can:
  // const { url } = await (await authedPost("/api/gdpr/export")).json();
  // return { url };
}

export async function deleteAccountAction() {
  const session = await getSession();
  if (!session) redirect("/login");

  const res = await fetch("/api/gdpr/delete", {
    method: "POST",
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to delete account");
  redirect("/login");
}
