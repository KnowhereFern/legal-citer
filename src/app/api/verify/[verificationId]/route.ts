import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildPublicVerificationPayload } from "@/lib/report-data";
import { verifyManifest } from "@/lib/manifest";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ verificationId: string }> }
) {
  const { verificationId } = await params;

  // Look up by signed manifest id only. The previous code accepted a bare
  // report id as a "legacy path" — but report ids are CUIDs, which are
  // enumerable, and the route returned the full risk/coverage/finding
  // payload with no signature check. Anyone who could guess or brute-force
  // a CUID could read any org's report data. Manifest ids are also CUIDs,
  // but a manifest only validates if its HMAC signature verifies against
  // MANIFEST_SIGNING_KEY, so the leak surface is bounded to manifests the
  // signing key holder has explicitly signed.
  const manifest = await prisma.verificationManifest.findUnique({
    where: { id: verificationId },
  });

  if (!manifest) {
    return NextResponse.json({ verified: false }, { status: 404 });
  }

  // Respect the org-level opt-in toggle. The org explicitly chooses whether
  // verification results are world-readable; a missing/false setting must
  // not fall through to a 200 with the payload. (Neither VerificationManifest
  // nor VerificationRun exposes a Prisma relation to Organization, so we
  // look the org up directly by orgId.)
  const run = await prisma.verificationRun.findUnique({
    where: { id: manifest.runId },
    select: { orgId: true },
  });
  if (!run) {
    return NextResponse.json({ verified: false }, { status: 404 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: run.orgId },
    select: { publicVerificationEnabled: true },
  });
  if (!org?.publicVerificationEnabled) {
    return NextResponse.json(
      { verified: false, reason: "Public verification is disabled for this workspace." },
      { status: 403 },
    );
  }

  // Require a valid signature. An unsigned manifest (or one whose signature
  // doesn't verify against the current signing key) gets a 404 rather than
  // a payload — there's no cryptographic proof the report is authentic.
  const signatureValid = await verifyManifest(verificationId);
  if (!signatureValid) {
    return NextResponse.json(
      { verified: false, reason: "Manifest signature is missing or invalid." },
      { status: 404 },
    );
  }

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
