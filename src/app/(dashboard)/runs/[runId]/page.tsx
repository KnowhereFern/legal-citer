import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { RefreshButton } from "./refresh-button";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25",
  running: "bg-blue-500/15 text-blue-700 border-blue-500/25",
  completed: "bg-green-500/15 text-green-700 border-green-500/25",
  failed: "bg-red-500/15 text-red-700 border-red-500/25",
  cancelled: "bg-gray-500/15 text-gray-700 border-gray-500/25",
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

  const STAGE_STATUS_COLORS: Record<string, string> = {
    pending: "bg-gray-500/15 text-gray-600 border-gray-500/25",
    running: "bg-blue-500/15 text-blue-700 border-blue-500/25",
    completed: "bg-green-500/15 text-green-700 border-green-500/25",
    failed: "bg-red-500/15 text-red-700 border-red-500/25",
    skipped: "bg-gray-500/15 text-gray-500 border-gray-500/25",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Run Details</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {run.document.filename}
          </p>
        </div>
        <Badge variant="outline" className={STATUS_COLORS[run.status] ?? ""}>
          {run.status}
        </Badge>
        <RefreshButton status={run.status} />
      </div>

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
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-muted-foreground">Document</dt>
            <dd>{run.document.filename}</dd>
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
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No pipeline stages recorded yet.
                  </TableCell>
                </TableRow>
              ) : (
                run.pipelineStages.map((stage: { id: string; stageName: string; status: string; startedAt: Date | null; completedAt: Date | null; failureDetail: string | null }) => (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.stageName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={STAGE_STATUS_COLORS[stage.status] ?? ""}
                      >
                        {stage.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {stage.startedAt?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {stage.completedAt?.toLocaleString() ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
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
                {                run.findings.map((finding: { id: string; checkType: string; result: string; citationText: string | null }) => (
                  <TableRow key={finding.id}>
                    <TableCell className="font-medium">{finding.checkType}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{finding.result}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
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
        <div className="flex gap-3">
          {run.reports.map((report: { id: string }) => (
            <Link
              key={report.id}
              href={`/reports/${report.id}`}
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              View Report
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
