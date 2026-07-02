import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { BRAND, publicVerificationUrl } from "@/lib/brand";
import { buildPublicVerificationPayload } from "@/lib/report-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { riskBadgeClass } from "@/lib/status-colors";
import { ShieldCheck, CheckCircle2, AlertTriangle, Share2 } from "lucide-react";
import { VerificationShareButton } from "./share-button";

export const dynamic = "force-dynamic";

function statusIcon(status: string) {
  if (status === "CLEARED FOR FILING") return <CheckCircle2 className="size-8 text-success" />;
  if (status === "NOT CLEARED") return <AlertTriangle className="size-8 text-destructive" />;
  return <AlertTriangle className="size-8 text-warning" />;
}

export default async function VerifyRecordPage({
  params,
}: {
  params: Promise<{ verificationId: string }>;
}) {
  const { verificationId } = await params;

  const manifest = await prisma.verificationManifest.findUnique({
    where: { id: verificationId },
  });

  if (!manifest) notFound();

  const report = await prisma.report.findFirst({
    where: { runId: manifest.runId },
  });

  const findings = await prisma.finding.findMany({
    where: { runId: manifest.runId },
    select: { result: true, reviewerState: true },
  });

  const payload = buildPublicVerificationPayload({
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

  const recordLine = payload.counts.recordCitationsChecked === null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />

      <Link href="/" className="relative z-10 mb-8 flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {BRAND.company}
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Verification Record</h1>
          <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
            {verificationId}
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
              {statusIcon(payload.finalStatus)}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-[170px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Document Hash</dt>
              <dd className="break-all font-mono text-xs">
                {payload.documentHash}
              </dd>
              <dt className="text-muted-foreground">Verified</dt>
              <dd>
                {payload.signedAt
                  ? new Date(payload.signedAt).toLocaleString()
                  : new Date(payload.generatedAt ?? Date.now()).toLocaleString()}
              </dd>
              <dt className="text-muted-foreground">Verification Scope</dt>
              <dd className="flex flex-col gap-1">
                {payload.verificationScope.map((item, i) => (
                  <span key={i} className="text-xs">
                    {item.label}
                    {item.status === "not_enabled" && (
                      <span className="ml-1 italic text-muted-foreground">[not run]</span>
                    )}
                  </span>
                ))}
              </dd>
              {payload.riskBand && (
                <>
                  <dt className="text-muted-foreground">Risk Band</dt>
                  <dd>
                    <Badge variant="outline" className={riskBadgeClass(payload.riskBand)}>
                      {payload.riskBand}
                    </Badge>
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

        <p className="mt-2 text-center text-xs text-muted-foreground">
          <Link
            href={publicVerificationUrl(verificationId)}
            className="underline-offset-2 hover:underline"
          >
            {BRAND.domain}/v/{verificationId}
          </Link>
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
      <span className="text-[10px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}
