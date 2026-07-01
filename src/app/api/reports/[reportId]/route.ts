import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const workspace = await resolveWorkspace();

  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = workspace;
  const { reportId } = await params;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      run: {
        include: {
          pipelineStages: { orderBy: { createdAt: "asc" } },
          findings: true,
          document: { select: { id: true, filename: true, documentHash: true } },
        },
      },
    },
  });

  if (!report || report.run.orgId !== orgId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
