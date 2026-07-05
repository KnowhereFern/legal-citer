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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { RiskBadge } from "@/components/status-badge";
import { FileCheck2, UploadCloud } from "lucide-react";

/** Deterministic absolute timestamp for the `title` tooltip (server-locale-proof). */
const ABS_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** Plain-English relative time ("2h ago"). Computed at render; refresh to update. */
function timeAgo(date: Date): string {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

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
          <Button size="lg" nativeButton={false} render={<Link href="/upload" />}>
            <UploadCloud data-icon="inline-start" />
            Upload Document
          </Button>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Risk</TableHead>
                {/* Coverage + Generated collapse on mobile (no horizontal scroll). */}
                <TableHead className="hidden text-right sm:table-cell">
                  Coverage
                </TableHead>
                <TableHead className="text-right">Citations</TableHead>
                <TableHead className="hidden sm:table-cell">Generated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map(
                (report: {
                  id: string;
                  documentHash: string | null;
                  riskBand: string | null;
                  coveragePct: number | null;
                  citationCount: number | null;
                  generatedAt: Date | null;
                  run: { document: { filename: string } };
                }) => (
                  <TableRow key={report.id} className="relative">
                    <TableCell className="whitespace-normal break-words">
                      {/* Primary text is the human filename; the SHA is demoted to a
                          short muted mono line so it disambiguates duplicate names
                          without asking the filer to read a hash. */}
                      <Link
                        href={`/reports/${report.id}`}
                        className="focus-ring after:absolute after:inset-0 after:content-['']"
                      >
                        <span className="relative z-10 font-medium">
                          {report.run.document.filename}
                        </span>
                      </Link>
                      {report.documentHash ? (
                        <div className="font-mono text-xs text-muted-foreground">
                          {report.documentHash.slice(0, 12)}…
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="relative z-10 inline-block">
                        {report.riskBand ? (
                          <RiskBadge value={report.riskBand} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums sm:table-cell">
                      {report.coveragePct != null
                        ? `${report.coveragePct.toFixed(1)}%`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {report.citationCount ?? "—"}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {report.generatedAt ? (
                        <span title={ABS_FMT.format(report.generatedAt)}>
                          {timeAgo(report.generatedAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
