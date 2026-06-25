import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";
import { computeDiff } from "@/verification/diff";

export async function POST(request: Request) {
  const { userId, orgId } = await getAuthContext();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { documentId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { documentId } = body;
  if (!documentId) {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 }
    );
  }

  const document = await prisma.document.findFirst({
    where: { id: documentId, orgId },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const runs = await prisma.verificationRun.findMany({
    where: { documentId, status: "completed" },
    orderBy: { createdAt: "desc" },
    take: 2,
    include: { findings: true },
  });

  if (runs.length < 2) {
    return NextResponse.json(
      { error: "At least two completed runs are required for diff" },
      { status: 400 }
    );
  }

  const [currentRun, previousRun] = runs;

  const diff = computeDiff({
    previousFindings: previousRun.findings,
    currentFindings: currentRun.findings,
  });

  return NextResponse.json({
    previousRunId: previousRun.id,
    currentRunId: currentRun.id,
    diff,
  });
}
