import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { generateFilingBlock } from "@/lib/filing-block";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress, ProgressTrack, ProgressIndicator } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Download, FileWarning } from "lucide-react";
import { ReportControls } from "./report-controls";
import { CopyBlockButton } from "./copy-block-button";
import { Suspense } from "react";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/15 text-green-700 border-green-500/25",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/25",
  critical: "bg-red-500/15 text-red-700 border-red-500/25",
};

const RESULT_COLORS: Record<string, string> = {
  pass: "bg-green-500/15 text-green-700 border-green-500/25",
  fail: "bg-red-500/15 text-red-700 border-red-500/25",
  unresolved: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25",
  not_applicable: "bg-gray-500/15 text-gray-600 border-gray-500/25",
  error: "bg-red-500/15 text-red-700 border-red-500/25",
};

export default async function ReportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ reportId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { userId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const { reportId } = await params;
  const sp = await searchParams;
  const jurisdictionKey = (sp.jurisdiction as string) ?? "florida_rule_2515";
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
          pipelineStages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!report) notFound();

  const run = report.run;
  const findings = run.findings;
  const pipelineStages = run.pipelineStages;

  const passedCount = findings.filter((f: { result: string }) => f.result === "pass").length;
  const failedCount = findings.filter((f: { result: string }) => f.result === "fail").length;
  const unresolvedCount = findings.filter((f: { result: string }) => f.result === "unresolved").length;
  const exceptionFindings = findings.filter(
    (f: { result: string }) => f.result === "unresolved" || f.result === "fail"
  );

  const documentHash = report.documentHash ?? run.document.documentHash;
  const timestamp = (report.generatedAt ?? run.createdAt).toISOString();

  const filingBlock = generateFilingBlock({
    jurisdictionKey,
    documentTitle: docTitle,
    aiToolsUsed: aiTools,
    runId: run.id,
    documentHash,
    riskBand: report.riskBand ?? "unknown",
    coveragePct: report.coveragePct ?? 0,
    timestamp,
  });

  const pdfHref = `/api/reports/${reportId}/pdf?jurisdiction=${encodeURIComponent(jurisdictionKey)}&view=${view}${aiTools ? `&aiTools=${encodeURIComponent(aiTools)}` : ""}${docTitle ? `&docTitle=${encodeURIComponent(docTitle)}` : ""}`;

  const isPublicView = view !== "full";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold">
              {isPublicView
                ? "AI Use & Verification Summary"
                : "Pre-Filing Verification Report"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {run.document.filename}
            </p>
          </div>
          {report.riskBand && (
            <Badge variant="outline" className={RISK_COLORS[report.riskBand] ?? ""}>
              {report.riskBand}
            </Badge>
          )}
        </div>
        <a
          href={pdfHref}
          className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

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
        <ReportControls />
      </Suspense>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Risk Band</p>
              <div>
                {report.riskBand ? (
                  <Badge variant="outline" className={RISK_COLORS[report.riskBand] ?? ""}>
                    {report.riskBand}
                  </Badge>
                ) : (
                  <span className="text-sm">—</span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Coverage</p>
              <p className="text-sm font-medium">{(report.coveragePct ?? 0).toFixed(1)}%</p>
              <Progress value={report.coveragePct ?? 0}>
                <ProgressTrack>
                  <ProgressIndicator />
                </ProgressTrack>
              </Progress>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Authorities Extracted</p>
              <p className="text-2xl font-semibold">{report.citationCount ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Authorities Verified</p>
              <p className="text-2xl font-semibold text-green-600">{passedCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Unresolved</p>
              <p className="text-2xl font-semibold text-yellow-600">{unresolvedCount}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Quote Issues</p>
              <p className="text-2xl font-semibold text-red-600">{report.quoteIssues ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Run Timestamp</p>
              <p className="text-sm">{new Date(timestamp).toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Document Hash</p>
              <p className="font-mono text-xs break-all">{documentHash}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filing Block</CardTitle>
              <CardDescription>
                Paste this certification text into your filing. Source: {filingBlock.source}
              </CardDescription>
            </div>
            <CopyBlockButton text={filingBlock.certificationText} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filingBlock.superseded && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 border border-yellow-500/20 p-3">
              <FileWarning className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-xs text-yellow-700">
                This order was superseded by the statewide Rule 2.515(d)(2) on June 15, 2026. It is included as an optional enhanced disclosure template.
              </p>
            </div>
          )}
          <div className="rounded-md border bg-muted/50 p-4">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {filingBlock.certificationText}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            {filingBlock.placementNote}
          </p>
        </CardContent>
      </Card>

      {exceptionFindings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exceptions Remaining</CardTitle>
            <CardDescription>
              Items that did not pass verification. Review before filing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {exceptionFindings.map((finding: {
                id: string;
                checkType: string;
                result: string;
                citationText: string | null;
              }, idx: number) => (
                <div key={finding.id} className="flex items-start gap-3 rounded-md border p-3">
                  <span className="text-xs font-mono text-muted-foreground mt-0.5">{idx + 1}.</span>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={RESULT_COLORS[finding.result] ?? ""}
                      >
                        {finding.result}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{finding.checkType}</span>
                    </div>
                    {finding.citationText && (
                      <p className="text-sm font-mono">{finding.citationText}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Verification Record</CardTitle>
          <CardDescription>
            Audit artifact linking this report to the verified document version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/50 rounded-md p-4">
            {filingBlock.verificationSummary}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limitations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {filingBlock.limitations.map((lim, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs mt-1">•</span>
                <span>{lim}</span>
              </li>
            ))}
            <li className="flex items-start gap-2">
              <span className="text-xs mt-1">•</span>
              <span>
                This verification confirms only that the listed checks were run on the identified document version. It does not certify legal merit, strategic soundness, completeness of the record, or likelihood of success.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {!isPublicView && (
        <>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
              <CardDescription>
                Execution log of the verification pipeline.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Stage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineStages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                        No pipeline stages recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pipelineStages.map((stage: { id: string; stageName: string; status: string; failureDetail: string | null }) => (
                      <TableRow key={stage.id}>
                        <TableCell className="font-medium">{stage.stageName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{stage.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {stage.failureDetail ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itemized Findings</CardTitle>
              <CardDescription>
                Per-citation check results. {passedCount + failedCount} of {findings.length} checks completed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {findings.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No findings recorded.
                </p>
              ) : (
                <div className="space-y-4">
                  {findings.map((finding: {
                    id: string;
                    checkType: string;
                    result: string;
                    citationText: string | null;
                    sourceQueried: string | null;
                    snippetUsed: string | null;
                    ruleId: string | null;
                    isAiAssisted: boolean;
                    aiModelName: string | null;
                    aiModelVersion: string | null;
                  }) => (
                    <div
                      key={finding.id}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{finding.checkType}</span>
                        <Badge
                          variant="outline"
                          className={RESULT_COLORS[finding.result] ?? ""}
                        >
                          {finding.result}
                        </Badge>
                        {finding.ruleId && (
                          <span className="text-xs text-muted-foreground">
                            Rule: {finding.ruleId}
                          </span>
                        )}
                      </div>
                      {finding.citationText && (
                        <div>
                          <p className="text-xs text-muted-foreground">Citation</p>
                          <p className="text-sm font-mono bg-muted rounded px-2 py-1">
                            {finding.citationText}
                          </p>
                        </div>
                      )}
                      {finding.sourceQueried && (
                        <div>
                          <p className="text-xs text-muted-foreground">Source Queried</p>
                          <p className="text-sm">{finding.sourceQueried}</p>
                        </div>
                      )}
                      {finding.snippetUsed && (
                        <div>
                          <p className="text-xs text-muted-foreground">Snippet</p>
                          <p className="text-sm bg-muted rounded px-2 py-1 font-mono">
                            {finding.snippetUsed}
                          </p>
                        </div>
                      )}
                      {finding.isAiAssisted && (
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            AI-Assisted
                          </Badge>
                          {finding.aiModelName && (
                            <span className="text-xs text-muted-foreground">
                              {finding.aiModelName}
                              {finding.aiModelVersion && ` v${finding.aiModelVersion}`}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Attorney Acknowledgment</CardTitle>
          <CardDescription>
            For counsel review. This section does not constitute legal advice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The undersigned reviewed this {isPublicView ? "summary" : "report"} and the underlying
            verification results for the identified filing version. Any unresolved items remaining
            at the time of filing are expressly identified in the Exceptions Remaining section above.
            The undersigned accepts full responsibility for the contents of the filing.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div>
              <p>Dated: ____________________</p>
            </div>
            <div>
              <p>____________________________________</p>
              <p>Attorney Name / Florida Bar No.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
