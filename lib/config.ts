// Configuration and environment variables

export const config = {
  // Database
  database: {
    url: process.env.DATABASE_URL || "",
  },

  // Caoloon API
  caoloon: {
    baseUrl: process.env.CAOLOON_BASE_URL || "",
    token: process.env.CAOLOON_TOKEN || "",
    cacheTtl: 3600, // 1 hour in seconds
    retryAttempts: 3,
    retryDelay: 1000, // 1 second
    circuitBreakerThreshold: 5,
    circuitBreakerTimeout: 30000, // 30 seconds
  },

  // Authentication
  auth: {
    secret: process.env.NEXTAUTH_SECRET || "",
    url: process.env.NEXTAUTH_URL || "http://localhost:3000",
  },

  // Email
  email: {
    resendApiKey: process.env.RESEND_API_KEY || "",
    fromAddress: process.env.EMAIL_FROM || "noreply@sugb.app",
  },

  // Queue
  queue: {
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  },

  // PDF
  pdf: {
    watermarkText: "SUGB - Standard Inquiry for Equitable Pay",
  },

  // App
  app: {
    name: "SUGB Application",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
  },
} as const

// Validate required environment variables
export function validateConfig() {
  const required = ["DATABASE_URL", "CAOLOON_BASE_URL", "CAOLOON_TOKEN", "NEXTAUTH_SECRET"]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`)
  }
}
