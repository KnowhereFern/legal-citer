import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { resolveWorkspace } from "@/lib/workspace";
import { generateFilingBlock } from "@/lib/filing-block";
import {
  buildPublicExhibitData,
  buildReportData,
  type BuildReportDataParams,
} from "@/lib/report-data";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import {
  RiskBadge,
  ResultBadge,
} from "@/components/status-badge";
import { FINAL_STATUS } from "@/lib/constants";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  FileWarning,
  Info,
  XCircle,
  type LucideProps,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { FILING_TYPES } from "@/lib/constants";
import { ReportControls } from "./report-controls";
import { CopyBlockButton } from "./copy-block-button";
import { FilingDetailsForm } from "./filing-details-form";
import { Suspense } from "react";
import { BRAND, publicVerificationUrl } from "@/lib/brand";

type Icon = ComponentType<SVGProps<SVGSVGElement> & LucideProps>;

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const auth = await getAuthContext();
  if (!auth.userId) redirect("/sign-in");

  const workspace = await resolveWorkspace();
  if (!workspace) redirect("/sign-in");

  const { reportId } = await params;
  const sp = await searchParams;
  const view = (sp.view as string) ?? "public";
  const aiTools = (sp.aiTools as string) ?? "";
  const docTitle = (sp.docTitle as string) ?? "";

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      run: {
        include: {
          document: true,
          findings: true,
        },
      },
    },
  });

  if (!report || report.run.orgId !== workspace.orgId) notFound();

  const run = report.run;
  const isPublicView = view !== "full";

  // Fall back to the jurisdiction (and filing type) captured at upload time
  // when the user hasn't picked one via the report-page controls.
  const jurisdictionKey =
    (sp.jurisdiction as string) ?? run.document.jurisdiction ?? "florida_rule_2515";

  const documentHash = report.documentHash ?? run.document.documentHash;
  const timestamp = (report.generatedAt ?? run.createdAt).toISOString();
  const generatedAt = new Date(timestamp).toLocaleString();

  const filingBlock = generateFilingBlock({
    jurisdictionKey,
    documentTitle: report.filingTitle ?? docTitle,
    aiToolsUsed: report.aiToolsDisclosed ?? aiTools,
    runId: run.id,
    documentHash,
    riskBand: report.riskBand ?? "unknown",
    coveragePct: report.coveragePct ?? 0,
    timestamp,
  });

  const base: Omit<BuildReportDataParams, "filingBlock"> = {
    reportId,
    filename: run.document.filename,
    generatedAt,
    documentHash,
    runId: run.id,
    riskBand: report.riskBand,
    coveragePct: report.coveragePct,
    verificationId: null,
    caseNumber: report.caseNumber,
    filingTitle: report.filingTitle,
    aiToolsDisclosed: report.aiToolsDisclosed,
    attorneyName: report.attorneyName,
    barNumber: report.barNumber,
    lawFirm: report.lawFirm,
    party: report.party,
    verificationVendor: report.verificationVendor,
    filingTitleOverride: docTitle,
    aiToolsOverride: aiTools,
    authoritiesExtracted: report.citationCount,
    authoritiesVerified: report.authoritiesVerified,
    authoritiesUnresolved: report.authoritiesUnresolved,
    quotationsChecked: report.quotationsChecked,
    quotationsMatched: report.quotationsMatched,
    recordCitationsChecked: report.recordCitationsChecked,
    recordCitationsUnresolved: report.recordCitationsUnresolved,
    findings: run.findings.map((f) => ({
      id: f.id,
      checkType: f.checkType,
      result: f.result,
      citationText: f.citationText,
      sourceQueried: f.sourceQueried,
      snippetUsed: f.snippetUsed,
      reviewerState: f.reviewerState,
      detail: f.detail,
      canonicalCitation: f.canonicalCitation,
      canonicalCaseName: f.canonicalCaseName,
      canonicalCourt: f.canonicalCourt,
      paragraphIndex: f.paragraphIndex,
      pageNumber: f.pageNumber,
      createdAt: f.createdAt,
    })),
  };

  const pdfHref = `/api/reports/${reportId}/pdf?jurisdiction=${encodeURIComponent(jurisdictionKey)}&view=${view}`;

  // ---------------------------------------------------------------------
  // PUBLIC VIEW — thin, brand-forward exhibit preview (matches the filed PDF).
  // No case caption, attorney signature, detailed counts, or exceptions on
  // this preview; the filed exhibit keeps those off the public docket.
  // ---------------------------------------------------------------------
  if (isPublicView) {
    const pubData = buildPublicExhibitData({ ...base, filingBlock });
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <PageHeader
          title="Public exhibit preview"
          description="This is what gets attached to the filing — bare and brand-forward."
        >
          <Button variant="outline" render={<a href={pdfHref} />}>
            <Download data-icon="inline-start" />
            Download PDF
          </Button>
        </PageHeader>

        <Suspense fallback={<Skeleton className="h-9 w-full" />}>
          <ReportControls defaultJurisdiction={run.document.jurisdiction ?? undefined} />
        </Suspense>

        {/* Brand header */}
        <Card>
          <CardContent className="flex items-center justify-between border-b border-border py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-lg font-bold text-primary-foreground">
                {BRAND.company.charAt(0)}
              </div>
              <div>
                <p className="font-bold leading-tight">{BRAND.company}</p>
                <p className="text-xs text-muted-foreground">{BRAND.domain}</p>
              </div>
            </div>
          </CardContent>
          <CardContent className="flex flex-col items-center gap-1 py-6 text-center">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">
              EXHIBIT A
            </p>
            <h2 className="text-xl font-bold">AI Use &amp; Verification Summary</h2>
            <p className="text-xs text-muted-foreground">
              Prepared by {BRAND.company} | {BRAND.domain}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
              <DetailRow label="Verification ID" value={pubData.verificationId ?? pubData.reportId} mono />
              <DetailRow label="Document Hash (SHA-256)" value={pubData.documentHash} mono />
              <DetailRow label="Reviewed Version Timestamp" value={pubData.generatedAt} />
              <DetailRow label="Generative drafting tools disclosed" value={pubData.aiToolsDisclosed} />
              <DetailRow label="Verification vendor / system" value={pubData.verificationVendor} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verification scope</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {pubData.verificationScope.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="font-bold">•</span>
                  <span className="flex-1">{item.label}</span>
                  {item.status === "not_enabled" && <NotEnabledTag />}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-muted/50 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Final workflow status
              </p>
              <p className="mt-1 text-lg font-bold">{pubData.finalStatus}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Limitations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
              {pubData.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm italic text-muted-foreground">{pubData.supportsNote}</p>
          </CardContent>
        </Card>

        {pubData.verificationId && (
          <p className="text-center text-xs text-muted-foreground">
            Public verification:{" "}
            <a
              href={publicVerificationUrl(pubData.verificationId)}
              className="underline-offset-2 hover:underline"
            >
              {BRAND.domain}/v/{pubData.verificationId}
            </a>
          </p>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------
  // FULL VIEW — rich private report (identification, counts, exceptions,
  // attorney acknowledgment, Appendix A). Internal use only.
  // ---------------------------------------------------------------------
  const data = buildReportData({ ...base, filingBlock });

  const verified = data.summary.authoritiesVerified;
  const extracted = data.summary.authoritiesExtracted;
  const exceptions = data.summary.exceptionsRemaining;

  // Icon for the final-status alert (DESIGN.md status table).
  const finalStatusIcon: Icon =
    data.summary.finalStatus === FINAL_STATUS.CLEARED
      ? CheckCircle2
      : data.summary.finalStatus === FINAL_STATUS.CLEARED_WITH_EXCEPTIONS
        ? AlertTriangle
        : XCircle;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Your citation report"
        description={run.document.filename}
      >
        {report.riskBand && <RiskBadge value={report.riskBand} />}
        <Button variant="outline" render={<a href={pdfHref} />}>
          <Download data-icon="inline-start" />
          Download PDF
        </Button>
      </PageHeader>

      {(report.status === "pending" || report.status === "error") && (
        <Alert variant={report.status === "error" ? "destructive" : "default"}>
          <AlertTitle>
            {report.status === "error" ? "Report error" : "Report incomplete"}
          </AlertTitle>
          <AlertDescription>
            {report.status === "error"
              ? "This report encountered an error during generation."
              : "This report is still being generated."}
          </AlertDescription>
        </Alert>
      )}

      {/* Hero summary — the page's reason to exist. Lead with a plain-English
          one-liner (PRODUCT.md #4) so a filer knows immediately whether their
          document is ready. */}
      <Card>
        <CardContent className="py-6">
          {extracted === 0 ? (
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 size-6 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-lg font-medium">
                  No citations were found to verify.
                </p>
                <p className="text-sm text-muted-foreground">
                  This document contained no extractable legal citations. If
                  you expected any, the upload may have been a scanned image
                  or a non-standard file — check the run detail page.
                </p>
              </div>
            </div>
          ) : exceptions === 0 ? (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-6 text-success" />
              <p className="text-lg font-medium">
                Every citation checks out. Ready to file.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-lg font-medium">
                {verified} of {extracted} citations check out.{" "}
                <span className="inline-flex items-center gap-1 text-destructive">
                  <AlertTriangle className="size-5" />
                  {exceptions} {exceptions === 1 ? "needs" : "need"} your attention.
                </span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Suspense fallback={<Skeleton className="h-9 w-full" />}>
        <ReportControls defaultJurisdiction={run.document.jurisdiction ?? undefined} />
      </Suspense>

      {/* Identification block */}
      <Card>
        <CardHeader>
          <CardTitle>Identification</CardTitle>
          <CardDescription>EXHIBIT A — AI Use and Verification Summary</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <DetailRow label="Case No." value={data.identification.caseNumber} />
            <DetailRow label="Filing Title" value={data.identification.filingTitle} />
            <DetailRow label="Filing Type" value={filingTypeLabel(run.document.filingType)} />
            <DetailRow label="Reviewed Version Date/Time" value={data.identification.reviewedVersionAt} />
            <DetailRow label="Verification Run ID" value={data.identification.runId} mono />
            <DetailRow label="Document Hash (SHA-256)" value={data.identification.documentHash} mono />
            <DetailRow label="AI Tool(s) Disclosed" value={data.identification.aiToolsDisclosed} />
            <DetailRow label="Verification Vendor / System" value={data.identification.verificationVendor} />
          </dl>
        </CardContent>
      </Card>

      {/* Purpose */}
      <Card>
        <CardHeader>
          <CardTitle>Purpose</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">{data.purpose}</p>
        </CardContent>
      </Card>

      {/* Verification Scope */}
      <Card>
        <CardHeader>
          <CardTitle>Verification scope</CardTitle>
          <CardDescription>
            The following checks were run on the identified version of the filing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2">
            {data.verificationScope.map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="font-semibold tabular-nums">{i + 1}.</span>
                <span className="flex-1">{item.label}</span>
                {item.status === "not_enabled" && <NotEnabledTag />}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Summary of Results */}
      <Card>
        <CardHeader>
          <CardTitle>Summary of results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <CountRow label="Citations found" value={data.summary.authoritiesExtracted} />
            <CountRow label="Citations that check out" value={data.summary.authoritiesVerified} tone="success" />
            <CountRow label="Citations we couldn't verify" value={data.summary.authoritiesUnresolved} tone="warning" />
            <CountRow label="Quotations checked" value={data.summary.quotationsChecked} />
            <CountRow label="Quotations matched" value={data.summary.quotationsMatched} tone="success" />
            <CountRow
              label="Record citations checked"
              value={data.summary.recordCitationsChecked === null ? "N/A — not enabled" : data.summary.recordCitationsChecked}
            />
            <CountRow
              label="Record citations we couldn't verify"
              value={data.summary.recordCitationsUnresolved === null ? "N/A — not enabled" : data.summary.recordCitationsUnresolved}
              tone={data.summary.recordCitationsUnresolved ? "warning" : undefined}
            />
            <CountRow label="Citations that still need your attention" value={data.summary.exceptionsRemaining} tone={data.summary.exceptionsRemaining ? "destructive" : undefined} />
          </div>
          <Alert className="mt-4">
            {(() => {
              const Icon = finalStatusIcon;
              return <Icon className="size-4" />;
            })()}
            <AlertTitle>Final workflow status</AlertTitle>
            <AlertDescription className="font-semibold">
              {data.summary.finalStatus}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Filing details form — moved below the summary so the report leads
          with outcomes, not an intake form. */}
      <FilingDetailsForm
        reportId={reportId}
        initial={{
          caseNumber: report.caseNumber ?? "",
          filingTitle: report.filingTitle ?? docTitle,
          aiToolsDisclosed: report.aiToolsDisclosed ?? aiTools,
          attorneyName: report.attorneyName ?? "",
          barNumber: report.barNumber ?? "",
          lawFirm: report.lawFirm ?? "",
          party: report.party ?? "",
          verificationVendor: report.verificationVendor ?? "",
        }}
      />

      {/* Filing Block */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Filing block</CardTitle>
              <CardDescription>
                Paste this certification text into your filing. Source: {filingBlock.source}
              </CardDescription>
            </div>
            <CopyBlockButton text={filingBlock.certificationText} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {filingBlock.superseded && (
            <Alert>
              <FileWarning className="size-4 text-warning" />
              <AlertTitle>Superseded order</AlertTitle>
              <AlertDescription>
                This order was superseded by the statewide Rule 2.515(d)(2) on June 15, 2026. It is included as an optional enhanced disclosure template.
              </AlertDescription>
            </Alert>
          )}
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {filingBlock.certificationText}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">{filingBlock.placementNote}</p>
        </CardContent>
      </Card>

      {/* Attorney Acknowledgment */}
      <Card>
        <CardHeader>
          <CardTitle>Attorney acknowledgment</CardTitle>
          <CardDescription>For counsel review. This section does not constitute legal advice.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The undersigned reviewed this summary and the underlying verification results for the
            identified filing version. Any unresolved items remaining at the time of filing are
            expressly identified below or in the filing itself.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p>Dated: {data.signature.datedLabel}</p>
            </div>
            <div>
              <p>____________________________________</p>
              <p>{data.signature.attorneyName}</p>
              <p>{data.signature.barNumber}</p>
              <p>{data.signature.lawFirm}</p>
              <p>Counsel for {data.signature.party}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exceptions remaining at filing */}
      <Card>
        <CardHeader>
          <CardTitle>Citations that still need your attention ({data.exceptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.exceptions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.exceptions.map((exc, idx) => (
                <div
                  key={idx}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center gap-2">
                    <ResultBadge value={exc.result} />
                    <span className="text-xs text-muted-foreground">{exc.checkType}</span>
                  </div>
                  {exc.citationText && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">You wrote:</p>
                      <p className="rounded-md bg-muted/50 px-3 py-2 font-mono text-sm break-words">
                        {exc.citationText}
                      </p>
                    </div>
                  )}
                  {exc.detail && (
                    <p className="text-xs text-muted-foreground">{exc.detail}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Limitations */}
      <Card>
        <CardHeader>
          <CardTitle>Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            {data.limitations.map((lim, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 text-xs">•</span>
                <span>{lim}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <span className="mt-1 text-xs">•</span>
              <span>
                This exhibit confirms only that the listed verification steps were run on the
                identified document version. It does not certify legal merit, strategic soundness,
                completeness of the record, or likelihood of success.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Appendix A — full view only. Mobile reflows to stacked cards so the
          8-column table never forces horizontal scroll (PRODUCT.md a11y:
          "no horizontal scroll on any report view"). */}
      {data.appendix && data.appendix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Every citation, listed ({data.appendix.length})</CardTitle>
            <CardDescription>
              Per-finding detail. Not filed with the court unless required in a dispute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: one citation per card. */}
            <div className="flex flex-col gap-3 sm:hidden">
              {data.appendix.map((row, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {row.paragraph && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.paragraph}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      Reviewer: {row.reviewerDisposition}
                    </span>
                  </div>
                  {row.citationAsWritten && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">Citation as written:</p>
                      <p className="max-w-prose break-words font-mono text-xs">
                        {row.citationAsWritten}
                      </p>
                    </div>
                  )}
                  {row.canonicalAuthority && (
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">Canonical authority resolved:</p>
                      <p className="max-w-prose break-words text-xs">{row.canonicalAuthority}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {row.sourceUsed && <span>Source: {row.sourceUsed}</span>}
                    {row.quoteMatch && <span>Quote: {row.quoteMatch}</span>}
                    {row.metadataMatch && <span>Metadata: {row.metadataMatch}</span>}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">{row.timestamp}</p>
                </div>
              ))}
            </div>

            {/* sm+: table. Reviewer + Timestamp drop on small screens via
                hidden md:table-cell so the table stays readable down to sm. */}
            <div className="hidden overflow-x-auto sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>¶ / Page</TableHead>
                    <TableHead>Citation as written</TableHead>
                    <TableHead>Canonical authority resolved</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead className="hidden md:table-cell">Reviewer</TableHead>
                    <TableHead className="hidden md:table-cell">Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.appendix.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs">{row.paragraph ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{row.citationAsWritten ?? "—"}</TableCell>
                      <TableCell className="text-xs">{row.canonicalAuthority ?? "—"}</TableCell>
                      <TableCell className="text-xs">{row.sourceUsed ?? "—"}</TableCell>
                      <TableCell className="text-xs">{row.quoteMatch ?? "—"}</TableCell>
                      <TableCell className="text-xs">{row.metadataMatch ?? "—"}</TableCell>
                      <TableCell className="hidden text-xs md:table-cell">{row.reviewerDisposition}</TableCell>
                      <TableCell className="hidden font-mono text-xs md:table-cell">{row.timestamp}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function filingTypeLabel(value?: string | null): string {
  if (!value) return "—";
  return FILING_TYPES.find((f) => f.value === value)?.label ?? value;
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`text-sm break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}

/**
 * Inline "Not enabled" tag — pairs the muted tone with an Info icon so the
 * status is never color-only (DESIGN.md: every status gets icon + label).
 * Replaces the dev placeholder copy "[if run — not run]" / "[if enabled —
 * not enabled]" with a consistent plain-English label.
 */
function NotEnabledTag() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Info className="size-3.5" />
      Not enabled
    </span>
  );
}

function CountRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone?: "success" | "warning" | "destructive";
}) {
  // Prose values (e.g. "N/A — not enabled") are not counts: drop the big
  // tabular number treatment and render them as muted secondary text.
  const isProse = typeof value === "string";

  const toneText =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "";

  const toneIcon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? AlertTriangle
        : tone === "destructive"
          ? XCircle
          : null;

  if (isProse) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-sm text-muted-foreground">{value}</span>
      </div>
    );
  }

  const Icon = toneIcon;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-lg font-semibold tabular-nums ${toneText}`}>
        {Icon && <Icon className="size-4" />}
        {value}
      </span>
    </div>
  );
}
