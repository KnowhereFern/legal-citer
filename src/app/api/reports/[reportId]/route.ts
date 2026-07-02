import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";

const filingDetailsSchema = z.object({
  caseNumber: z.string().trim().optional(),
  filingTitle: z.string().trim().optional(),
  aiToolsDisclosed: z.string().trim().optional(),
  attorneyName: z.string().trim().optional(),
  barNumber: z.string().trim().optional(),
  lawFirm: z.string().trim().optional(),
  party: z.string().trim().optional(),
  verificationVendor: z.string().trim().optional(),
});

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const workspace = await resolveWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = workspace;
  const { reportId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = filingDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Confirm ownership before writing.
  const existing = await prisma.report.findUnique({
    where: { id: reportId },
    select: { id: true, run: { select: { orgId: true } } },
  });
  if (!existing || existing.run.orgId !== orgId) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}
