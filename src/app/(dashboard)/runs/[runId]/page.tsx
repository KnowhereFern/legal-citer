import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import {
  RunStatusBadge,
  StageStatusBadge,
  ResultBadge,
} from "@/components/status-badge";
import { RefreshButton } from "./refresh-button";

type StageRow = {
  id: string;
  stageName: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  failureDetail: string | null;
};

type FindingRow = {
  id: string;
  checkType: string;
  result: string;
  citationText: string | null;
};

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { userId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const { runId } = await params;

  const run = await prisma.verificationRun.findUnique({
    where: { id: runId },
    include: {
      document: true,
      pipelineStages: { orderBy: { createdAt: "asc" } },
      findings: true,
      reports: true,
    },
  });

  if (!run) notFound();

  const isInProgress = run.status === "running" || run.status === "queued";
  const pageTitle = isInProgress ? "Checking your document" : "Document check";

  // Progress: completed + skipped stages count as steps the pipeline has
  // moved past. `currentStage` is the one running now (or the last step
  // touched) so the "Step X of Y" line names something concrete.
  const totalStages = run.pipelineStages.length;
  const doneStages = run.pipelineStages.filter(
    (s) => s.status === "completed" || s.status === "skipped"
  ).length;
  const runningStage = run.pipelineStages.find((s) => s.status === "running");
  const lastTouched =
    run.pipelineStages.find((s) => s.status === "running") ??
    [...run.pipelineStages].reverse().find((s) => s.status !== "pending");
  const progressValue = totalStages > 0 ? (doneStages / totalStages) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={pageTitle} description={run.document.filename}>
        <RunStatusBadge value={run.status} />
        <RefreshButton status={run.status} />
      </PageHeader>

      {run.failureReason && (
        <Alert variant="destructive">
          <AlertTitle>Run failed</AlertTitle>
          <AlertDescription>{run.failureReason}</AlertDescription>
        </Alert>
      )}

      {/* Working-state progress: shown only while the run is active. Each
          server re-render (via the polling RefreshButton) advances the bar,
          so the user can see the pipeline moving instead of guessing. */}
      {isInProgress && totalStages > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-2 py-4">
            <p className="text-sm text-muted-foreground">
              {runningStage
                ? `Step ${doneStages + 1} of ${totalStages}: ${runningStage.stageName}`
                : lastTouched
                  ? `Step ${Math.min(doneStages + 1, totalStages)} of ${totalStages}: ${lastTouched.stageName}`
                  : `Step ${doneStages} of ${totalStages}`}
            </p>
            <Progress value={progressValue} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Run information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm sm:grid-cols-[200px_1fr]">
            <dt className="text-muted-foreground">Document</dt>
            <dd className="font-medium">{run.document.filename}</dd>
            <dt className="text-muted-foreground">Created</dt>
            <dd>{run.createdAt.toLocaleString()}</dd>
            <dt className="text-muted-foreground">Started</dt>
            <dd>{run.startedAt?.toLocaleString() ?? "—"}</dd>
            <dt className="text-muted-foreground">Completed</dt>
            <dd>{run.completedAt?.toLocaleString() ?? "—"}</dd>
            <dt className="text-muted-foreground">Document hash</dt>
            <dd className="break-all font-mono text-xs">{run.document.documentHash}</dd>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline stages</CardTitle>
          <CardDescription>
            Execution log of the verification pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {run.pipelineStages.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No pipeline stages recorded yet.
            </p>
          ) : (
            <>
              {/* Mobile: stacked cards, one stage per row. */}
              <div className="flex flex-col gap-3 sm:hidden">
                {(run.pipelineStages as StageRow[]).map((stage) => (
                  <div
                    key={stage.id}
                    className="flex flex-col gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{stage.stageName}</span>
                      <StageStatusBadge value={stage.status} />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Started: {stage.startedAt?.toLocaleString() ?? "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Completed: {stage.completedAt?.toLocaleString() ?? "—"}
                    </div>
                    {stage.failureDetail && (
                      <p className="text-xs text-muted-foreground">
                        {stage.failureDetail}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* sm+: table. */}
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Stage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(run.pipelineStages as StageRow[]).map((stage) => (
                      <TableRow key={stage.id}>
                        <TableCell className="font-medium">{stage.stageName}</TableCell>
                        <TableCell>
                          <StageStatusBadge value={stage.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {stage.startedAt?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {stage.completedAt?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {stage.failureDetail ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {run.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Findings ({run.findings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobile: stacked cards. */}
            <div className="flex flex-col gap-3 sm:hidden">
              {(run.findings as FindingRow[]).map((finding) => (
                <div
                  key={finding.id}
                  className="flex flex-col gap-2 rounded-lg border border-border p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{finding.checkType}</span>
                    <ResultBadge value={finding.result} />
                  </div>
                  <p className="font-mono text-xs text-muted-foreground">
                    {finding.citationText ?? "—"}
                  </p>
                </div>
              ))}
            </div>

            {/* sm+: table. */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Check</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Citation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(run.findings as FindingRow[]).map((finding) => (
                    <TableRow key={finding.id}>
                      <TableCell className="font-medium">{finding.checkType}</TableCell>
                      <TableCell>
                        <ResultBadge value={finding.result} />
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                        {finding.citationText ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {run.reports.length > 0 && (
        <>
          <Separator />
          <div className="flex gap-3">
            {run.reports.map((report: { id: string }) => (
              <Button key={report.id} nativeButton={false} render={<Link href={`/reports/${report.id}`} />}>
                View report
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
