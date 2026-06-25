import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { orgId: clerkOrgId } = await getAuthContext();

  if (!clerkOrgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { clerkOrgId },
  });

  if (!org) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 }
    );
  }

  const { runId } = await params;

  const run = await prisma.verificationRun.findUnique({
    where: { id: runId },
    include: {
      pipelineStages: { orderBy: { createdAt: "asc" } },
      findings: true,
    },
  });

  if (!run || run.orgId !== org.id) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  return NextResponse.json(run);
}
