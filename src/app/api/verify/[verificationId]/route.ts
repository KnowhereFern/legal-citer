import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPublicVerificationPayload } from "@/lib/report-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ verificationId: string }> }
) {
  const { verificationId } = await params;

  const manifest = await prisma.verificationManifest.findUnique({
    where: { id: verificationId },
  });

  if (manifest) {
    const report = await prisma.report.findFirst({
      where: { runId: manifest.runId },
    });
    const findings = await prisma.finding.findMany({
      where: { runId: manifest.runId },
      select: { result: true, reviewerState: true },
    });

    return NextResponse.json(
      buildPublicVerificationPayload({
        verificationId,
        documentHash: manifest.documentHash,
        signedAt: manifest.signedAt,
        generatedAt: report?.generatedAt ?? null,
        riskBand: report?.riskBand ?? null,
        coveragePct: report?.coveragePct ?? null,
        authoritiesExtracted: report?.citationCount ?? null,
        authoritiesVerified: report?.authoritiesVerified ?? null,
        authoritiesUnresolved: report?.authoritiesUnresolved ?? null,
        quotationsChecked: report?.quotationsChecked ?? null,
        quotationsMatched: report?.quotationsMatched ?? null,
        recordCitationsChecked: report?.recordCitationsChecked ?? null,
        recordCitationsUnresolved: report?.recordCitationsUnresolved ?? null,
        findings,
      })
    );
  }

  // Fall back to lookup by report id (legacy path).
  const report = await prisma.report.findUnique({
    where: { id: verificationId },
    include: {
      run: {
        include: {
          findings: { select: { result: true, reviewerState: true } },
          document: { select: { documentHash: true } },
        },
      },
    },
  });

  if (report) {
    return NextResponse.json(
      buildPublicVerificationPayload({
        verificationId,
        documentHash: report.run.document.documentHash,
        signedAt: null,
        generatedAt: report.generatedAt,
        riskBand: report.riskBand,
        coveragePct: report.coveragePct,
        authoritiesExtracted: report.citationCount,
        authoritiesVerified: report.authoritiesVerified,
        authoritiesUnresolved: report.authoritiesUnresolved,
        quotationsChecked: report.quotationsChecked,
        quotationsMatched: report.quotationsMatched,
        recordCitationsChecked: report.recordCitationsChecked,
        recordCitationsUnresolved: report.recordCitationsUnresolved,
        findings: report.run.findings,
      })
    );
  }

  return NextResponse.json({ verified: false }, { status: 404 });
}
