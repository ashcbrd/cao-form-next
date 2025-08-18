export const authConfig = {
  magicLinkExpiry: 15 * 60 * 1000, // 15 minutes
  sessionExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  cookieName: "sugb-session",
  redirectAfterLogin: "/dashboard",
  redirectAfterLogout: "/login",
}

export const generateMagicToken = (): string => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}
