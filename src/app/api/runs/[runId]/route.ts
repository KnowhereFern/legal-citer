import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const workspace = await resolveWorkspace();

  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = workspace;
  const { runId } = await params;

  const run = await prisma.verificationRun.findUnique({
    where: { id: runId },
    include: {
      pipelineStages: { orderBy: { createdAt: "asc" } },
      findings: true,
    },
  });

  if (!run || run.orgId !== orgId) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
