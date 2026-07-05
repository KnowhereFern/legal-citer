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
import { PageHeader } from "@/components/page-header";
import { RunStatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Activity, UploadCloud } from "lucide-react";

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
                <TableHead>Status</TableHead>
                {/* Timestamps collapse to an inline relative line on mobile. */}
                <TableHead className="hidden sm:table-cell">Started</TableHead>
                <TableHead className="hidden sm:table-cell">Completed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map(
                (run: {
                  id: string;
                  status: string;
                  startedAt: Date | null;
                  completedAt: Date | null;
                  document: { filename: string };
                }) => (
                  <TableRow key={run.id} className="relative">
                    <TableCell className="whitespace-normal break-words">
                      {/* Stretched link: the after-pseudo fills the row so the whole
                          row is clickable + keyboard-focusable; .focus-ring gives the
                          pink keyboard indicator (DESIGN.md §Focus). */}
                      <Link
                        href={`/runs/${run.id}`}
                        className="focus-ring after:absolute after:inset-0 after:content-['']"
                      >
                        <span className="relative z-10 font-medium">
                          {run.document.filename}
                        </span>
                      </Link>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {run.startedAt
                          ? `Started ${timeAgo(run.startedAt)}`
                          : "Not started yet"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="relative z-10 inline-block">
                        <RunStatusBadge value={run.status} />
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {run.startedAt ? (
                        <span title={ABS_FMT.format(run.startedAt)}>
                          {timeAgo(run.startedAt)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">
                      {run.completedAt ? (
                        <span title={ABS_FMT.format(run.completedAt)}>
                          {timeAgo(run.completedAt)}
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
