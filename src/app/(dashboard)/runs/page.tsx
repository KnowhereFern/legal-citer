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
import { PageHeader } from "@/components/page-header";
import { statusBadgeClass } from "@/lib/status-colors";
import { Card } from "@/components/ui/card";
import { Activity, UploadCloud } from "lucide-react";

export default async function RunsPage() {
  const workspace = await resolveWorkspace();
  if (!workspace) redirect("/sign-in");

  const { orgId } = workspace;

  const runs = await prisma.verificationRun.findMany({
    where: { orgId },
    include: { document: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Verification Runs"
        description="View all citation verification runs."
      />

      {runs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 border-dashed py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent">
            <Activity className="size-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">No verification runs yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a document to start your first citation verification.
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
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run: { id: string; status: string; startedAt: Date | null; completedAt: Date | null; document: { filename: string } }) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-medium hover:underline"
                    >
                      {run.document.filename}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusBadgeClass(run.status)}
                    >
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.startedAt
                      ? run.startedAt.toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {run.completedAt
                      ? run.completedAt.toLocaleString()
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
