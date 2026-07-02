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
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/page-header";
import { riskBadgeClass, resultBadgeClass } from "@/lib/status-colors";
import { Download, FileWarning } from "lucide-react";
import { FILING_TYPES } from "@/lib/constants";
import { ReportControls } from "./report-controls";
import { CopyBlockButton } from "./copy-block-button";
import { FilingDetailsForm } from "./filing-details-form";
import { Suspense } from "react";
import { BRAND, publicVerificationUrl } from "@/lib/brand";

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
          title="Public Exhibit Preview"
          description="This is what gets attached to the filing — bare and brand-forward."
        >
          <Button variant="outline" render={<a href={pdfHref} />}>
            <Download data-icon="inline-start" />
            Download PDF
          </Button>
        </PageHeader>

        <Suspense fallback={null}>
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
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground">
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
                  {item.status === "not_enabled" && (
                    <span className="text-xs italic text-muted-foreground">[if run — not run]</span>
                  )}
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Pre-Filing Verification Report"
        description={run.document.filename}
      >
        {report.riskBand && (
          <Badge variant="outline" className={riskBadgeClass(report.riskBand)}>
            {report.riskBand}
          </Badge>
        )}
        <Button variant="outline" render={<a href={pdfHref} />}>
          <Download data-icon="inline-start" />
          Download PDF
        </Button>
      </PageHeader>

      {(report.status === "pending" || report.status === "error") && (
        <Alert variant={report.status === "error" ? "destructive" : "default"}>
          <AlertTitle>
            {report.status === "error" ? "Report Error" : "Report Incomplete"}
          </AlertTitle>
          <AlertDescription>
            {report.status === "error"
              ? "This report encountered an error during generation."
              : "This report is still being generated."}
          </AlertDescription>
        </Alert>
      )}

      <Suspense fallback={null}>
        <ReportControls defaultJurisdiction={run.document.jurisdiction ?? undefined} />
      </Suspense>

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
          <CardTitle>Verification Scope</CardTitle>
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
                {item.status === "not_enabled" && (
                  <span className="text-xs italic text-muted-foreground">[if enabled — not enabled]</span>
                )}
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Summary of Results */}
      <Card>
        <CardHeader>
          <CardTitle>Summary of Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <CountRow label="Authorities extracted" value={data.summary.authoritiesExtracted} />
            <CountRow label="Authorities verified" value={data.summary.authoritiesVerified} tone="success" />
            <CountRow label="Authorities unresolved at first pass" value={data.summary.authoritiesUnresolved} tone="warning" />
            <CountRow label="Quotations checked" value={data.summary.quotationsChecked} />
            <CountRow label="Quotations matched" value={data.summary.quotationsMatched} tone="success" />
            <CountRow
              label="Record citations checked"
              value={data.summary.recordCitationsChecked === null ? "N/A — not enabled" : data.summary.recordCitationsChecked}
            />
            <CountRow
              label="Record citations unresolved"
              value={data.summary.recordCitationsUnresolved === null ? "N/A — not enabled" : data.summary.recordCitationsUnresolved}
              tone={data.summary.recordCitationsUnresolved ? "warning" : undefined}
            />
            <CountRow label="Exceptions remaining at final review" value={data.summary.exceptionsRemaining} tone={data.summary.exceptionsRemaining ? "destructive" : undefined} />
          </div>
          <Alert className="mt-4">
            <AlertTitle>Final workflow status</AlertTitle>
            <AlertDescription className="font-semibold">
              {data.summary.finalStatus}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Filing Block */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Filing Block</CardTitle>
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
              <AlertTitle>Superseded Order</AlertTitle>
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
          <CardTitle>Attorney Acknowledgment</CardTitle>
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

      {/* Exceptions Remaining at Filing */}
      <Card>
        <CardHeader>
          <CardTitle>Exceptions Remaining at Filing ({data.exceptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {data.exceptions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">None.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {data.exceptions.map((exc, idx) => (
                <div key={idx} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <span className="mt-0.5 font-mono text-xs text-muted-foreground">{idx + 1}.</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={resultBadgeClass(exc.result)}>
                        {exc.result}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{exc.checkType}</span>
                    </div>
                    {exc.citationText && (
                      <p className="font-mono text-sm">{exc.citationText}</p>
                    )}
                    {exc.detail && (
                      <p className="text-xs text-muted-foreground">{exc.detail}</p>
                    )}
                  </div>
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

      {/* Appendix A — full view only */}
      {data.appendix && data.appendix.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Appendix A — Itemized Findings ({data.appendix.length})</CardTitle>
            <CardDescription>
              Per-finding detail. Not filed with the court unless required in a dispute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>¶ / Page</TableHead>
                    <TableHead>Citation as written</TableHead>
                    <TableHead>Canonical authority resolved</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Quote</TableHead>
                    <TableHead>Metadata</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Timestamp</TableHead>
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
                      <TableCell className="text-xs">{row.reviewerDisposition}</TableCell>
                      <TableCell className="font-mono text-xs">{row.timestamp}</TableCell>
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

function CountRow({
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
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-lg font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}
