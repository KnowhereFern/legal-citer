import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { BRAND, publicVerificationUrl } from "@/lib/brand";
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
import { ShieldCheck, CheckCircle2 } from "lucide-react";

export const dynamic = "force-dynamic";

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

  const run = await prisma.verificationRun.findUnique({
    where: { id: manifest.runId },
  });

  const passCount = run
    ? await prisma.finding.count({
        where: { runId: run.id, result: "pass" },
      })
    : 0;

  const failCount = run
    ? await prisma.finding.count({
        where: { runId: run.id, result: "fail" },
      })
    : 0;

  const unresolvedCount = run
    ? await prisma.finding.count({
        where: { runId: run.id, result: "unresolved" },
      })
    : 0;

  const totalFindings = run
    ? await prisma.finding.count({
        where: { runId: run.id },
      })
    : 0;

  const exceptionCount = failCount + unresolvedCount;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,105,180,0.08),_transparent_50%)]" />

      <Link
        href="/"
        className="relative z-10 mb-8 flex items-center gap-2.5"
      >
        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/15">
          <ShieldCheck className="size-5 text-primary" />
        </div>
        <span className="text-lg font-bold tracking-tight text-foreground">
          {BRAND.company}
        </span>
      </Link>

      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">{BRAND.product} Record</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verification ID: {verificationId}
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Verification Status</CardTitle>
                <CardDescription>
                  {exceptionCount === 0
                    ? "Cleared with 0 unresolved citation exceptions"
                    : `${exceptionCount} unresolved citation exception${exceptionCount === 1 ? "" : "s"} remaining`}
                </CardDescription>
              </div>
              {exceptionCount === 0 ? (
                <CheckCircle2 className="size-8 text-success" />
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <dl className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3 text-sm">
              <dt className="text-muted-foreground">Document Hash</dt>
              <dd className="break-all font-mono text-xs">
                {manifest.documentHash}
              </dd>
              <dt className="text-muted-foreground">Verified</dt>
              <dd>
                {manifest.signedAt
                  ? manifest.signedAt.toLocaleString()
                  : manifest.createdAt.toLocaleString()}
              </dd>
              <dt className="text-muted-foreground">Verification Scope</dt>
              <dd className="text-xs">
                citation existence, metadata, quote match, AI-use disclosure support
              </dd>
              {report?.riskBand && (
                <>
                  <dt className="text-muted-foreground">Risk Band</dt>
                  <dd>
                    <Badge variant="outline" className={riskBadgeClass(report.riskBand)}>
                      {report.riskBand}
                    </Badge>
                  </dd>
                </>
              )}
              {report?.coveragePct != null && (
                <>
                  <dt className="text-muted-foreground">Coverage</dt>
                  <dd className="tabular-nums">{report.coveragePct.toFixed(1)}%</dd>
                </>
              )}
            </dl>

            <Separator />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-semibold tabular-nums">{totalFindings}</p>
                <p className="text-xs text-muted-foreground">Total Checks</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-semibold tabular-nums text-success">{passCount}</p>
                <p className="text-xs text-muted-foreground">Passed</p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-semibold tabular-nums text-destructive">{failCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
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
