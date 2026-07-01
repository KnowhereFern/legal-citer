import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
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
import { FileCheck2, UploadCloud } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  low: "bg-green-500/15 text-green-700 border-green-500/25",
  medium: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25",
  high: "bg-orange-500/15 text-orange-700 border-orange-500/25",
  critical: "bg-red-500/15 text-red-700 border-red-500/25",
};

export default async function ReportsPage() {
  const { userId, orgId: clerkOrgId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const reports = clerkOrgId
    ? await prisma.report.findMany({
        where: {
          run: {
            document: { organization: { clerkOrgId } },
          },
        },
        include: { run: { include: { document: true } } },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.report.findMany({
        where: {
          run: {
            createdBy: userId,
            document: { organization: { clerkOrgId: { equals: null } } },
          },
        },
        include: { run: { include: { document: true } } },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verification reports for your documents.
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent">
            <FileCheck2 className="size-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium">No reports yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run a verification to generate your first report.
          </p>
          <Link href="/upload">
            <Button className="mt-5 gap-2">
              <UploadCloud className="size-4" />
              Upload Document
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Hash</TableHead>
                <TableHead>Risk Band</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Citation Count</TableHead>
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
                        className={RISK_COLORS[report.riskBand] ?? ""}
                      >
                        {report.riskBand}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {report.coveragePct != null
                      ? `${report.coveragePct.toFixed(1)}%`
                      : "—"}
                  </TableCell>
                  <TableCell>{report.citationCount ?? "—"}</TableCell>
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
