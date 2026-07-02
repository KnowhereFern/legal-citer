import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logAuditEvent } from "@/lib/audit";
import { resolveWorkspace } from "@/lib/workspace";
import { deleteWorkspaceSchema } from "@/lib/constants";

/**
 * Destructive: hard-deletes all verification data (reports, manifests,
 * findings, pipeline stages, runs, documents) for the current workspace.
 * The Organization row itself and its AuditEvent trail are preserved so the
 * action is itself auditable; retention policies are also preserved.
 */
export async function POST(request: Request) {
  const workspace = await resolveWorkspace();
  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { orgId, userId } = workspace;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = deleteWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Confirmation required", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Verify the typed confirmation matches the workspace name.
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org || parsed.data.confirm.trim().toLowerCase() !== org.name.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "Confirmation text does not match the workspace name" },
      { status: 400 }
    );
  }

  // Capture counts before deletion for the audit record.
  const runs = await prisma.verificationRun.findMany({
    where: { orgId },
    select: { id: true },
  });
  const runIds = runs.map((r) => r.id);

  const counts = await prisma.$transaction(async (tx) => {
    const reports = await tx.report.deleteMany({ where: { runId: { in: runIds } } });
    const manifests = await tx.verificationManifest.deleteMany({
      where: { runId: { in: runIds } },
    });
    const findings = await tx.finding.deleteMany({ where: { runId: { in: runIds } } });
    const stages = await tx.pipelineStage.deleteMany({
      where: { runId: { in: runIds } },
    });
    const deletedRuns = await tx.verificationRun.deleteMany({ where: { orgId } });
    const documents = await tx.document.deleteMany({ where: { orgId } });
    return {
      reports: reports.count,
      manifests: manifests.count,
      findings: findings.count,
      pipelineStages: stages.count,
      runs: deletedRuns.count,
      documents: documents.count,
    };
  });

  await logAuditEvent({
    orgId,
    eventType: "settings.workspace_data_deleted",
    actorId: userId,
    subjectType: "organization",
    subjectId: orgId,
    detail: { ...counts },
  });

  return NextResponse.json({ success: true, deleted: counts });
}
