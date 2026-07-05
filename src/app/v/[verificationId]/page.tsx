import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  BRAND,
  relativeVerificationPath,
} from "@/lib/brand";
import {
  buildPublicVerificationPayload,
  type PublicVerificationPayload,
} from "@/lib/report-data";
import { FINAL_STATUS } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RiskBadge } from "@/components/status-badge";
import {
  ShieldCheck,
  CheckCircle2,
  ShieldAlert,
  Share2,
  AlertTriangle,
} from "lucide-react";
import { VerificationShareButton } from "./share-button";

export const dynamic = "force-dynamic";

/**
 * Shared data fetch for both the page render and `generateMetadata`.
 *
 * `generateMetadata` runs server-side and in parallel with the page, so it
 * needs the same lookup. Returning `null` (instead of calling `notFound()`)
 * lets the metadata path degrade gracefully without throwing during streaming.
 */
async function loadPayload(
  verificationId: string
): Promise<PublicVerificationPayload | null> {
  const manifest = await prisma.verificationManifest.findUnique({
    where: { id: verificationId },
  });
  if (!manifest) return null;

  const report = await prisma.report.findFirst({
    where: { runId: manifest.runId },
  });

  const findings = await prisma.finding.findMany({
    where: { runId: manifest.runId },
    select: { result: true, reviewerState: true },
  });

  return buildPublicVerificationPayload({
    verificationId,
    documentHash: manifest.documentHash,
    signedAt: manifest.signedAt,
    generatedAt: report?.generatedAt ?? null,
    riskBand: report?.riskBand ?? null,
    coveragePct: report?.coveragePct ?? null,
    authoritiesExtracted: report?.citationCount ?? null,
    authoritiesVerified: report?.authoritiesVerified ?? null,
    authoritiesUnresolved: report?.authoritiesUnresolved ?? null,
    quotationsChecked: report?.quotationsChecked ?? null,
    quotationsMatched: report?.quotationsMatched ?? null,
    recordCitationsChecked: report?.recordCitationsChecked ?? null,
    recordCitationsUnresolved: report?.recordCitationsUnresolved ?? null,
    findings,
  });
}

/**
 * Share-preview metadata. A bare "BaddieLegal" title reads like spam in a
 * Slack/iMessage link preview; surfacing the final status tells the recipient
 * (clerk, judge, opposing counsel) what the link is before they click.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}): Promise<Metadata> {
  const { verificationId } = await params;
  const payload = await loadPayload(verificationId);
  if (!payload) {
    return { title: `Verification Record | ${BRAND.company}` };
  }
  return {
    title: `Verification Record — ${payload.finalStatus} | ${BRAND.company}`,
    description:
      payload.counts.exceptionsRemaining === 0
        ? `${BRAND.company} verified the citations, quotations, and AI-use disclosure in this filing. No unresolved exceptions.`
        : `${BRAND.company} verified the citations, quotations, and AI-use disclosure in this filing. ${payload.counts.exceptionsRemaining} exception${payload.counts.exceptionsRemaining === 1 ? "" : "s"} disclosed.`,
  };
}

/**
 * Final-status → icon presentation.
 *
 * DESIGN.md mandates icon + label + color (never color alone — deuteranopia
 * hazard). All three FINAL_STATUS values are mapped explicitly; the default
 * branch logs so a future status can't silently inherit the warning triangle
 * (the bug this fixed: CLEARED WITH DISCLOSED EXCEPTIONS used to fall through
 * to the same AlertTriangle as an unknown/error state).
 *
 * Mapping rationale:
 *  - CLEARED FOR FILING            → CheckCircle2 / success (clean pass)
 *  - CLEARED WITH DISCLOSED        → ShieldCheck / warning (cleared, but
 *    EXCEPTIONS                       exceptions exist — amber signals "read
 *                                    the notes," the shield signals "still OK")
 *  - NOT CLEARED                   → ShieldAlert / destructive (filing blocked)
 */
function statusPresentation(status: string) {
  switch (status) {
    case FINAL_STATUS.CLEARED:
      return {
        icon: <CheckCircle2 className="size-8 text-success" />,
        label: "Cleared",
      };
    case FINAL_STATUS.CLEARED_WITH_EXCEPTIONS:
      return {
        icon: <ShieldCheck className="size-8 text-warning" />,
        label: "Cleared with exceptions",
      };
    case FINAL_STATUS.NOT_CLEARED:
      return {
        icon: <ShieldAlert className="size-8 text-destructive" />,
        label: "Not cleared",
      };
    default: {
      // Unknown status — surface as a real warning rather than masquerading
      // as a known-good state. Log so it gets noticed in the next deploy.
      console.warn(`[verification] unrecognized finalStatus: ${status}`);
      return {
        icon: <AlertTriangle className="size-8 text-warning" />,
        label: "Status unavailable",
      };
    }
  }
}

export default async function VerifyRecordPage({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId } = await params;
  const payload = await loadPayload(verificationId);
  if (!payload) notFound();

  const recordLine = payload.counts.recordCitationsChecked === null;
  const status = statusPresentation(payload.finalStatus);

  const verifiedDate = payload.signedAt ?? payload.generatedAt;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />

      <Link href="/" className="relative z-10 mb-8 flex items-center gap-2.5 focus-ring rounded-lg">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {BRAND.company}
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Verification Record</h1>
          {/* Self-sufficiency copy: a third-party viewer (clerk, judge,
              opposing counsel) may never have heard of BaddieLegal. Frame
              what was checked in one plain-English sentence. */}
          <p className="mx-auto mt-2 max-w-sm text-pretty text-sm text-muted-foreground">
            {BRAND.company} checked the citations, quotations, and AI-use
            disclosure in this filing. This record shows what was verified.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>{payload.finalStatus}</CardTitle>
                <CardDescription>
                  {payload.counts.exceptionsRemaining === 0
                    ? "No unresolved exceptions remaining"
                    : `${payload.counts.exceptionsRemaining} unresolved exception${payload.counts.exceptionsRemaining === 1 ? "" : "s"} remaining`}
                </CardDescription>
              </div>
              <span aria-hidden className="shrink-0">
                {status.icon}
              </span>
            </div>
            {/* Status legend — color alone is a deuteranopia hazard. One
                compact line keys the three tones used in the card. */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="size-3.5 text-success" />
                Verified
              </span>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1">
                <AlertTriangle className="size-3.5 text-warning" />
                Needs attention
              </span>
              <span aria-hidden className="text-muted-foreground/50">·</span>
              <span className="inline-flex items-center gap-1">
                <ShieldAlert className="size-3.5 text-destructive" />
                Not cleared
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[170px_1fr]">
              <dt className="text-muted-foreground">Verification ID</dt>
              <dd className="break-all font-mono text-xs">
                {payload.verificationId}
              </dd>
              <dt className="text-muted-foreground">Document Hash</dt>
              <dd className="break-all font-mono text-xs">
                {payload.documentHash}
              </dd>
              <dt className="text-muted-foreground">Verified</dt>
              <dd>
                {verifiedDate
                  ? new Date(verifiedDate).toLocaleString()
                  : "Date unavailable"}
              </dd>
              <dt className="text-muted-foreground">Verification Scope</dt>
              <dd className="flex flex-col gap-1">
                {payload.verificationScope.map((item, i) => (
                  <span key={i} className="text-xs">
                    {item.label}
                    {item.status === "not_enabled" && (
                      <span className="ml-1 italic text-muted-foreground">(not run)</span>
                    )}
                  </span>
                ))}
              </dd>
              {payload.riskBand && (
                <>
                  <dt className="text-muted-foreground">Risk Band</dt>
                  <dd>
                    <RiskBadge value={payload.riskBand} />
                  </dd>
                </>
              )}
              {payload.coveragePct != null && (
                <>
                  <dt className="text-muted-foreground">Coverage</dt>
                  <dd className="tabular-nums">{payload.coveragePct.toFixed(1)}%</dd>
                </>
              )}
            </dl>

            <Separator />

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Count label="Authorities extracted" value={payload.counts.authoritiesExtracted} />
              <Count label="Verified" value={payload.counts.authoritiesVerified} tone="success" />
              <Count label="Unresolved" value={payload.counts.authoritiesUnresolved} tone="warning" />
              <Count label="Quotations matched" value={payload.counts.quotationsMatched} tone="success" />
              <Count
                label="Record cites checked"
                value={recordLine ? "N/A" : payload.counts.recordCitationsChecked ?? 0}
              />
              <Count
                label="Record cites unresolved"
                value={recordLine ? "N/A" : payload.counts.recordCitationsUnresolved ?? 0}
                tone={recordLine ? undefined : payload.counts.recordCitationsUnresolved ? "warning" : undefined}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-center gap-2">
              <VerificationShareButton verificationId={verificationId} />
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Share2 className="size-3" />
                Anyone with this link can verify the record
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Generated by {BRAND.product}. This record confirms only the listed
          verification checks performed on the identified document version. It
          is not a legal certification or guarantee of accuracy.
        </p>

        {/* Source attribution — PRODUCT.md says citations verify against
            real case law; naming the sources is a high-value trust signal
            for a third-party viewer. */}
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Citations checked against CourtListener and gov.uscourts sources.
        </p>

        <p className="mt-2 text-center text-xs text-muted-foreground">
          {/* Self-link as a relative path — this IS the current page, so an
              absolute external URL would trigger a full navigation. Rendered
              as plain text (the share button handles copying). */}
          <span className="font-mono">
            {BRAND.domain}{relativeVerificationPath(verificationId)}
          </span>
        </p>
      </div>
    </div>
  );
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "destructive";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "";
  return (
    <div className="flex flex-col gap-1 text-center">
      <span className={`text-xl font-semibold tabular-nums ${toneClass}`}>{value}</span>
      {/* text-xs (12px) minimum — the old text-[10px] fell below the 16px
          mobile legibility floor and was an arbitrary size. */}
      <span className="text-xs leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}
