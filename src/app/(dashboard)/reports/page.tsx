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
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verification reports for your documents.
        </p>
      </div>

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
          {reports.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                No reports yet.
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report: { id: string; documentHash: string | null; riskBand: string | null; coveragePct: number | null; citationCount: number | null; generatedAt: Date | null }) => (
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
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
