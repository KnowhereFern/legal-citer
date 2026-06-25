import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
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
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { userId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const { reportId } = await params;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Verification Report</h1>
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

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
              <p className="text-xs text-muted-foreground">Citation Count</p>
              <p className="text-2xl font-semibold">{report.citationCount ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Quote Issues</p>
              <p className="text-2xl font-semibold">{report.quoteIssues ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Unresolved Items</p>
              <p className="text-2xl font-semibold">{report.unresolvedItems ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Run Timestamp</p>
              <p className="text-sm">{run.createdAt.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Document Hash</p>
              <p className="font-mono text-xs">{report.documentHash ?? run.document.documentHash}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Verification Record</CardTitle>
          <CardDescription>
            Pipeline stages and their execution status.
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
          <div className="mt-4 text-sm text-muted-foreground">
            <p>
              Checks completed: {passedCount + failedCount} / {findings.length}
            </p>
            {unresolvedCount > 0 && (
              <p className="mt-1">
                Remaining exceptions: {unresolvedCount}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
          <CardDescription>
            Individual check results for each citation.
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
    </div>
  );
}
