import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";
import { generateFilingBlock } from "@/lib/filing-block";
import {
  buildPublicExhibitData,
  buildReportData,
  type BuildReportDataParams,
} from "@/lib/report-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  const workspace = await resolveWorkspace();
  if (!workspace) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { reportId } = await params;
  const sp = request.nextUrl.searchParams;
  const view = sp.get("view") ?? "public";
  const aiTools = sp.get("aiTools") ?? "";
  const docTitle = sp.get("docTitle") ?? "";

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      run: {
        include: {
          document: true,
          findings: true,
        },
      },
    },
  });

  if (!report || report.run.orgId !== workspace.orgId) {
    return new Response("Report not found", { status: 404 });
  }

  const run = report.run;
  const isPublicView = view !== "full";

  // Fall back to the jurisdiction captured at upload time when no override is present.
  const jurisdictionKey =
    sp.get("jurisdiction") ?? run.document.jurisdiction ?? "florida_rule_2515";

  const documentHash = report.documentHash ?? run.document.documentHash;
  const timestamp = (report.generatedAt ?? run.createdAt).toISOString();
  const generatedAt = new Date(timestamp).toLocaleString();

  const manifest = await prisma.verificationManifest.findFirst({
    where: { runId: run.id },
  });

  const filingBlock = generateFilingBlock({
    jurisdictionKey,
    documentTitle: report.filingTitle ?? docTitle,
    aiToolsUsed: report.aiToolsDisclosed ?? aiTools,
    runId: run.id,
    documentHash,
    riskBand: report.riskBand ?? "unknown",
    coveragePct: report.coveragePct ?? 0,
    timestamp,
  });

  // Shared source data for both the public exhibit and the full report.
  const base: Omit<BuildReportDataParams, "filingBlock"> = {
    reportId,
    filename: run.document.filename,
    generatedAt,
    documentHash,
    runId: run.id,
    riskBand: report.riskBand,
    coveragePct: report.coveragePct,
    verificationId: manifest?.id ?? null,
    caseNumber: report.caseNumber,
    filingTitle: report.filingTitle,
    aiToolsDisclosed: report.aiToolsDisclosed,
    attorneyName: report.attorneyName,
    barNumber: report.barNumber,
    lawFirm: report.lawFirm,
    party: report.party,
    verificationVendor: report.verificationVendor,
    filingTitleOverride: docTitle,
    aiToolsOverride: aiTools,
    authoritiesExtracted: report.citationCount,
    authoritiesVerified: report.authoritiesVerified,
    authoritiesUnresolved: report.authoritiesUnresolved,
    quotationsChecked: report.quotationsChecked,
    quotationsMatched: report.quotationsMatched,
    recordCitationsChecked: report.recordCitationsChecked,
    recordCitationsUnresolved: report.recordCitationsUnresolved,
    findings: run.findings.map((f) => ({
      id: f.id,
      checkType: f.checkType,
      result: f.result,
      citationText: f.citationText,
      sourceQueried: f.sourceQueried,
      snippetUsed: f.snippetUsed,
      reviewerState: f.reviewerState,
      detail: f.detail,
      canonicalCitation: f.canonicalCitation,
      canonicalCaseName: f.canonicalCaseName,
      canonicalCourt: f.canonicalCourt,
      paragraphIndex: f.paragraphIndex,
      pageNumber: f.pageNumber,
      createdAt: f.createdAt,
    })),
  };

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const pdfModule = await import("@/app/(dashboard)/reports/[reportId]/report-pdf");

  let pdfBuffer;
  if (isPublicView) {
    const publicData = buildPublicExhibitData({ ...base, filingBlock });
    pdfBuffer = await renderToBuffer(<pdfModule.PublicExhibitPdf data={publicData} />);
  } else {
    const data = buildReportData({ ...base, filingBlock });
    pdfBuffer = await renderToBuffer(<pdfModule.FullReportPdf data={data} />);
  }

  const safeFilename = run.document.filename.replace(/[^a-z0-9]/gi, "_");
  const viewLabel = isPublicView ? "summary" : "full";
  const downloadName = `BaddieLegalVerify_${safeFilename}_${viewLabel}.pdf`;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${downloadName}"`,
    },
  });
}
