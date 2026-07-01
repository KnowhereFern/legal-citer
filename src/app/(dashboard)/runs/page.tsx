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
import { Activity, UploadCloud } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-yellow-500/15 text-yellow-700 border-yellow-500/25",
  running: "bg-blue-500/15 text-blue-700 border-blue-500/25",
  completed: "bg-green-500/15 text-green-700 border-green-500/25",
  failed: "bg-red-500/15 text-red-700 border-red-500/25",
  cancelled: "bg-gray-500/15 text-gray-700 border-gray-500/25",
};

export default async function RunsPage() {
  const { userId, orgId: clerkOrgId } = await getAuthContext();
  if (!userId) redirect("/sign-in");

  const runs = clerkOrgId
    ? await prisma.verificationRun.findMany({
        where: {
          document: { organization: { clerkOrgId } },
        },
        include: { document: true },
        orderBy: { createdAt: "desc" },
      })
    : await prisma.verificationRun.findMany({
        where: {
          createdBy: userId,
          document: { organization: { clerkOrgId: { equals: null } } },
        },
        include: { document: true },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verification Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View all citation verification runs.
        </p>
      </div>

      {runs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-accent">
            <Activity className="size-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium">No verification runs yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a document to start your first citation verification.
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
                      className={STATUS_COLORS[run.status] ?? ""}
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
