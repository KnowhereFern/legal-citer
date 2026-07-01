import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startRunSchema, RUN_STATUS } from "@/lib/constants";
import { resolveWorkspace } from "@/lib/workspace";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/types";
import { enqueueVerificationJob } from "@/worker/queue";

const PIPELINE_STAGES = [
  "hash",
  "extract",
  "citations",
  "quotes",
  "checks",
  "scoring",
  "report",
];

export async function POST(request: NextRequest) {
  const workspace = await resolveWorkspace();

  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId, userId } = workspace;

  const body = await request.json();
  const parsed = startRunSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { documentId } = parsed.data;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!document || document.orgId !== orgId) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  const run = await prisma.verificationRun.create({
    data: {
      orgId,
      createdBy: userId,
      documentId,
      status: RUN_STATUS.QUEUED,
      pipelineStages: {
        create: PIPELINE_STAGES.map((stageName) => ({
          stageName,
          status: "pending",
        })),
      },
    },
    include: { pipelineStages: true },
  });

  console.log(
    `[Worker] Enqueuing verification run ${run.id} for document ${documentId}`
  );
  await enqueueVerificationJob({
    runId: run.id,
    documentId,
    config: {
      ...DEFAULT_PIPELINE_CONFIG,
      enableSupportAnalysis: parsed.data.enableSupportAnalysis,
    },
  });

  return NextResponse.json(run, { status: 201 });
}

export async function GET() {
  const workspace = await resolveWorkspace();

  if (!workspace) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orgId } = workspace;

  const runs = await prisma.verificationRun.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: {
      document: { select: { id: true, filename: true } },
    },
  });

  return NextResponse.json(runs);
}
