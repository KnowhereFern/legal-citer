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
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { PageHeader } from "@/components/page-header";
import { statusBadgeClass, stageStatusBadgeClass, resultBadgeClass } from "@/lib/status-colors";
import { RefreshButton } from "./refresh-button";

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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Run Details" description={run.document.filename}>
        <Badge variant="outline" className={statusBadgeClass(run.status)}>
          {run.status}
        </Badge>
        <RefreshButton status={run.status} />
      </PageHeader>

      {run.failureReason && (
        <Alert variant="destructive">
          <AlertTitle>Run Failed</AlertTitle>
          <AlertDescription>{run.failureReason}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Run Information</CardTitle>
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
            <dt className="text-muted-foreground">Document Hash</dt>
            <dd className="font-mono text-xs">{run.document.documentHash}</dd>
          </dl>
        </CardContent>
      </Card>

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
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.pipelineStages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                    No pipeline stages recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                run.pipelineStages.map((stage: { id: string; stageName: string; status: string; startedAt: Date | null; completedAt: Date | null; failureDetail: string | null }) => (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.stageName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={stageStatusBadgeClass(stage.status)}>
                        {stage.status}
                      </Badge>
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {run.findings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Findings ({run.findings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Check</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Citation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {run.findings.map((finding: { id: string; checkType: string; result: string; citationText: string | null }) => (
                  <TableRow key={finding.id}>
                    <TableCell className="font-medium">{finding.checkType}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={resultBadgeClass(finding.result)}>
                        {finding.result}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs text-muted-foreground">
                      {finding.citationText ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {run.reports.length > 0 && (
        <>
          <Separator />
          <div className="flex gap-3">
            {run.reports.map((report: { id: string }) => (
              <Button key={report.id} render={<Link href={`/reports/${report.id}`} />}>
                View Report
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
