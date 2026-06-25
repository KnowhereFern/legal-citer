import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
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

  if (!report || report.run.orgId !== org.id) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  return NextResponse.json(report);
}
