// Logging utility for the application

export type LogLevel = "debug" | "info" | "warn" | "error"

export interface LogContext {
  userId?: string
  surveyId?: string
  action?: string
  [key: string]: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === "development"

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? ` ${JSON.stringify(context)}` : ""
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.debug(this.formatMessage("debug", message, context))
    }
  }

  info(message: string, context?: LogContext) {
    console.info(this.formatMessage("info", message, context))
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage("warn", message, context))
  }

  error(message: string, error?: Error, context?: LogContext) {
    const errorContext = error ? { ...context, error: error.message, stack: error.stack } : context
    console.error(this.formatMessage("error", message, errorContext))
  }
}

export const logger = new Logger()
