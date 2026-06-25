import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

    return NextResponse.json({
      verified: true,
      documentHash: manifest.documentHash,
      manifestHash: manifest.manifestHash,
      riskBand: report?.riskBand ?? null,
      generatedAt: report?.generatedAt ?? null,
      signedAt: manifest.signedAt,
    });
  }

  const report = await prisma.report.findUnique({
    where: { id: verificationId },
    include: {
      run: {
        include: {
          document: { select: { documentHash: true } },
        },
      },
    },
  });

  if (report) {
    return NextResponse.json({
      verified: true,
      documentHash: report.run.document.documentHash,
      riskBand: report.riskBand ?? null,
      generatedAt: report.generatedAt ?? null,
    });
  }

  return NextResponse.json({ verified: false }, { status: 404 });
}
