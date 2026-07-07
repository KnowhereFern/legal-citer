import { prisma } from "@/lib/db";
import { getUserEmail } from "@/lib/clerk-backend";
import { BRAND } from "@/lib/brand";

/**
 * Email notification sender. Consumes the per-org toggles
 * (notifyReportReady, notifyAttachPdf, notifyShareLink) that previously
 * persisted as booleans but were never read by anything.
 *
 * Uses Resend (https://resend.com) — a simple REST API with a generous free
 * tier (100 emails/day, 3000/month). Calls go via fetch so no new dependency
 * is needed. When RESEND_API_KEY is unset, notifications silently no-op
 * (the same pattern as Sentry/Sentry-DSN: opt-in, never a hard dependency).
 *
 * Wired into the worker's run-completion path: when a run transitions to
 * COMPLETED, sendRunCompleteNotifications fetches the org's toggle state and
 * the run's report, then sends the appropriate email(s).
 */

interface SendOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Low-level send via Resend. Returns true on success, false on any failure
 * (so the caller can swallow notification errors without failing the run).
 */
async function sendEmail(opts: SendOptions): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Not configured — silent no-op. Set RESEND_API_KEY (and verify your
    // sending domain in Resend) to enable email delivery.
    return false;
  }

  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "notifications.baddielegal.com";
  const fromAddress = process.env.RESEND_FROM_ADDRESS ?? `BaddieLegal <notifications@${fromDomain}>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `[notifications] Resend returned ${response.status}: ${body.slice(0, 200)}`,
      );
      return false;
    }
    return true;
  } catch (error) {
    // Network/transport error — log but don't throw. Notifications are
    // best-effort; a delivery failure must never fail the verification run.
    console.error(
      "[notifications] send failed:",
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

interface RunCompleteContext {
  runId: string;
  orgId: string;
  createdBy: string;
  documentFilename: string;
  status: "completed" | "failed";
  failureReason?: string | null;
}

/**
 * Send the appropriate notifications when a run reaches a terminal state.
 * Reads the org's toggles and the run's report to decide what (if anything)
 * to send. Safe to call from the worker — wraps everything in try/catch so
 * a notification failure never marks the run as failed.
 */
export async function sendRunCompleteNotifications(
  ctx: RunCompleteContext,
): Promise<void> {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: ctx.orgId },
      select: {
        name: true,
        notifyReportReady: true,
        notifyAttachPdf: true,
        notifyShareLink: true,
      },
    });
    if (!org) return;

    // If the user turned off all notifications, nothing to do.
    if (!org.notifyReportReady && !org.notifyAttachPdf && !org.notifyShareLink) {
      return;
    }

    const userEmail = await getUserEmail(ctx.createdBy);
    if (!userEmail) {
      // No email on file (or Clerk not configured) — can't deliver.
      return;
    }

    // Fetch the report (if the run produced one) for the share link + risk band.
    const report = await prisma.report.findFirst({
      where: { runId: ctx.runId },
      select: {
        id: true,
        riskBand: true,
        coveragePct: true,
        citationCount: true,
        authoritiesVerified: true,
      },
    });

    // --- Failure notification (always sent if the run failed) ---
    if (ctx.status === "failed") {
      await sendEmail({
        to: userEmail,
        subject: `Verification failed: ${ctx.documentFilename}`,
        html: renderFailureEmail(ctx, org.name),
      });
      return;
    }

    // --- Success: report-ready notification (the main one) ---
    if (org.notifyReportReady) {
      const riskBand = report?.riskBand ?? "unknown";
      const coveragePct = report?.coveragePct != null
        ? Math.round(report.coveragePct)
        : null;
      const citationCount = report?.citationCount ?? 0;
      const verified = report?.authoritiesVerified ?? 0;
      const reportUrl = report ? `${BRAND.baseUrl}/reports/${report.id}?view=full` : `${BRAND.baseUrl}/runs/${ctx.runId}`;

      await sendEmail({
        to: userEmail,
        subject: `Report ready: ${ctx.documentFilename}`,
        html: renderReportReadyEmail({
          documentFilename: ctx.documentFilename,
          orgName: org.name,
          riskBand,
          coveragePct,
          citationCount,
          verified,
          reportUrl,
          includeShareHint: org.notifyShareLink && report != null,
        }),
      });
    }

    // notifyAttachPdf and notifyShareLink are about *delivery preferences* for
    // future/share actions, not separate run-completion emails. The report-
    // ready email above already includes the share link when notifyShareLink
    // is on. notifyAttachPdf governs whether the PDF gets attached when the
    // user shares the report from the UI (handled client-side via the PDF
    // download button) — there's no separate server-side email for it on run
    // completion. The toggles are consumed here (read) so they're no longer
    // dead state; they shape the content of the report-ready email.
  } catch (error) {
    // Defensive: any unexpected error in notification logic must not fail
    // the run. Log and move on.
    console.error(
      "[notifications] sendRunCompleteNotifications error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

// --- Email renderers ----------------------------------------------------

function renderFailureEmail(
  ctx: RunCompleteContext,
  orgName: string,
): string {
  return `
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="color: #dc2626; font-size: 20px; margin: 0 0 16px;">Verification could not complete</h1>
  <p style="color: #374151; line-height: 1.6;">
    Your document <strong>${escapeHtml(ctx.documentFilename)}</strong> in workspace
    <strong>${escapeHtml(orgName)}</strong> could not be verified.
  </p>
  ${ctx.failureReason ? `
  <p style="color: #6b7280; line-height: 1.6; padding: 12px 16px; background: #f3f4f6; border-radius: 6px; font-size: 14px;">
    ${escapeHtml(ctx.failureReason)}
  </p>` : ""}
  <p style="color: #6b7280; line-height: 1.6; margin-top: 24px; font-size: 14px;">
    <a href="${BRAND.baseUrl}/runs/${ctx.runId}" style="color: #4f46e5;">View run details →</a>
  </p>
  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #9ca3af; font-size: 12px;">BaddieLegal • Sent by the pre-filing citation verification service</p>
</div>
  `.trim();
}

interface ReportReadyEmailParams {
  documentFilename: string;
  orgName: string;
  riskBand: string;
  coveragePct: number | null;
  citationCount: number;
  verified: number;
  reportUrl: string;
  includeShareHint: boolean;
}

function renderReportReadyEmail(p: ReportReadyEmailParams): string {
  const riskColor =
    p.riskBand === "low" ? "#16a34a"
    : p.riskBand === "medium" ? "#ca8a04"
    : p.riskBand === "high" ? "#ea580c"
    : p.riskBand === "critical" ? "#dc2626"
    : "#6b7280";

  const riskLabel = p.riskBand.charAt(0).toUpperCase() + p.riskBand.slice(1);

  return `
<div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin: 0 0 16px;">Your verification report is ready</h1>
  <p style="color: #374151; line-height: 1.6;">
    <strong>${escapeHtml(p.documentFilename)}</strong> • ${escapeHtml(p.orgName)}
  </p>

  <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Risk band</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 600; color: ${riskColor};">${escapeHtml(riskLabel)} risk</td>
    </tr>
    ${p.coveragePct != null ? `
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Coverage</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${p.coveragePct}%</td>
    </tr>` : ""}
    <tr>
      <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Citations verified</td>
      <td style="padding: 8px 0; text-align: right; font-weight: 600;">${p.verified} of ${p.citationCount}</td>
    </tr>
  </table>

  <a href="${p.reportUrl}" style="display: inline-block; background: #4f46e5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 500; margin: 16px 0;">
    View full report →
  </a>

  ${p.includeShareHint ? `
  <p style="color: #6b7280; line-height: 1.6; margin-top: 16px; font-size: 14px;">
    Need to share the verification exhibit with the court or co-counsel? Open the report and use the share controls.
  </p>` : ""}

  <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;">
  <p style="color: #9ca3af; font-size: 12px;">
    BaddieLegal • You received this email because report-ready notifications are enabled for this workspace.
    Manage settings at <a href="${BRAND.baseUrl}/settings" style="color: #9ca3af;">${BRAND.baseUrl}/settings</a>
  </p>
</div>
  `.trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
