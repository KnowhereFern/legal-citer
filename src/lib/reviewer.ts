import { prisma } from "@/lib/db";

export async function captureAcknowledgment(params: {
  reportId: string;
  reviewerId: string;
  action: string;
  note?: string;
}): Promise<void> {
  const report = await prisma.report.findUnique({
    where: { id: params.reportId },
    include: { run: { include: { findings: true } } },
  });

  if (!report) {
    throw new Error(`Report not found: ${params.reportId}`);
  }

  const findingIds = report.run.findings.map((f: { id: string }) => f.id);

  await prisma.$transaction([
    ...findingIds.map((id: string) =>
      prisma.finding.update({
        where: { id },
        data: { reviewerState: params.action },
      })
    ),
    prisma.auditEvent.create({
      data: {
        orgId: report.run.orgId,
        eventType: "reviewer_acknowledgment",
        actorId: params.reviewerId,
        subjectType: "report",
        subjectId: params.reportId,
        detail: {
          action: params.action,
          note: params.note ?? null,
          findingCount: findingIds.length,
        },
      },
    }),
  ]);
}
