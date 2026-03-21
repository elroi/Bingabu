/**
 * Optional Sentry for API routes. Set SENTRY_DSN in the deployment environment.
 */
import * as Sentry from "@sentry/node";

const dsn = typeof process !== "undefined" ? process.env.SENTRY_DSN : "";

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
  });
}

export function captureException(error, context) {
  if (dsn) {
    Sentry.captureException(error, { extra: context || {} });
  } else if (error != null) {
    console.error("[bingabu]", error?.message || error, context || "");
  }
}
