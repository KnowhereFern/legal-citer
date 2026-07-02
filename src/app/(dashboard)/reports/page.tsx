import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { riskBadgeClass } from "@/lib/status-colors";
import { FileCheck2, UploadCloud } from "lucide-react";

export default async function ReportsPage() {
  const workspace = await resolveWorkspace();
  if (!workspace) redirect("/sign-in");

  const { orgId } = workspace;

  const reports = await prisma.report.findMany({
    where: {
      run: { orgId },
    },
    include: { run: { include: { document: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Verification reports for your documents."
      />

      {reports.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent">
            <FileCheck2 className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No reports yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run a verification to generate your first report.
            </p>
          </div>
          <Button size="lg" render={<Link href="/upload" />}>
            <UploadCloud data-icon="inline-start" />
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Hash</TableHead>
                <TableHead>Risk Band</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">Citations</TableHead>
                <TableHead>Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report: { id: string; documentHash: string | null; riskBand: string | null; coveragePct: number | null; citationCount: number | null; generatedAt: Date | null }) => (
                <TableRow key={report.id}>
                  <TableCell>
                    <Link
                      href={`/reports/${report.id}`}
                      className="font-mono text-xs font-medium hover:underline"
                    >
                      {report.documentHash ?? "—"}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {report.riskBand ? (
                      <Badge
                        variant="outline"
                        className={riskBadgeClass(report.riskBand)}
                      >
                        {report.riskBand}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {report.coveragePct != null
                      ? `${report.coveragePct.toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {report.citationCount ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {report.generatedAt
                      ? report.generatedAt.toLocaleString()
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
