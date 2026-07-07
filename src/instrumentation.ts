/**
 * Next.js instrumentation hook — runs once at server startup in both the web
 * (Next.js) and edge runtimes. Used here to initialize Sentry when a DSN is
 * configured, so unhandled exceptions, worker failures, and webhook errors
 * are reported to a central dashboard instead of being lost as console lines.
 *
 * This file is auto-discovered by Next.js (no config wiring needed) when it
 * exists at the project root or src/. We keep it lazy and defensive: if
 * Sentry isn't installed (no DSN) or the import fails, the app boots
 * normally. Observability is critical in production but must not be a hard
 * dependency.
 */
export async function register() {
  // Only run on the server (not in the browser bundle).
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      // Sentry not configured — silent no-op. Set SENTRY_DSN in Railway to
      // enable error reporting.
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Sentry = require("@sentry/nextjs");
      Sentry.init({
        dsn,
        // Set tracesSampleRate to a low value in production — tracing is
        // useful but high volumes cost quota. Default 0.1 = 10% of requests.
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
        environment: process.env.NODE_ENV,
        // Don't send PII. Legal documents are sensitive.
        sendDefaultPii: false,
      });
    } catch {
      // @sentry/nextjs not installed — log once and continue. This lets us
      // ship the instrumentation file before the dep is added.
      console.warn(
        "SENTRY_DSN is set but @sentry/nextjs is not installed. Run `npm i @sentry/nextjs` to enable error reporting.",
      );
    }
  }
}
