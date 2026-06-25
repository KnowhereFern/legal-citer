import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthContext } from "@/lib/auth-context";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const { userId } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { findingIds?: string[]; action?: string; note?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { reportId } = await params;
  const { findingIds, action, note } = body;

  if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
    return NextResponse.json(
      { error: "findingIds must be a non-empty array" },
      { status: 400 }
    );
  }

  if (!action) {
    return NextResponse.json(
      { error: "action is required" },
      { status: 400 }
    );
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { run: true },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const findings = await prisma.finding.findMany({
    where: {
      id: { in: findingIds },
      runId: report.runId,
    },
  });

  if (findings.length !== findingIds.length) {
    return NextResponse.json(
      { error: "Some findings not found in this report" },
      { status: 404 }
    );
  }

  await prisma.$transaction([
    ...findingIds.map((id: string) =>
      prisma.finding.update({
        where: { id },
        data: { reviewerState: action },
      })
    ),
    prisma.auditEvent.create({
      data: {
        orgId: report.run.orgId,
        eventType: "reviewer_acknowledgment",
        actorId: userId,
        subjectType: "report",
        subjectId: reportId,
        detail: {
          action,
          note: note ?? null,
          findingIds,
        },
      },
    }),
  ]);

  return NextResponse.json({ success: true });
}
