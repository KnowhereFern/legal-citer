import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startRunSchema, RUN_STATUS } from "@/lib/constants";
import { getAuthContext } from "@/lib/auth-context";
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
  const { orgId: clerkOrgId, userId } = await getAuthContext();

  if (!clerkOrgId || !userId) {
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

  if (!document || document.orgId !== org.id) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  const run = await prisma.verificationRun.create({
    data: {
      orgId: org.id,
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

  const runs = await prisma.verificationRun.findMany({
    where: { orgId: org.id },
    orderBy: { createdAt: "desc" },
    include: {
      document: { select: { id: true, filename: true } },
    },
  });

  return NextResponse.json(runs);
}
