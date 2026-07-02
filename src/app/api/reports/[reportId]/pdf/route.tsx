import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { resolveWorkspace } from "@/lib/workspace";
import { generateFilingBlock } from "@/lib/filing-block";
import type { ReportPdfData } from "@/app/(dashboard)/reports/[reportId]/report-pdf";

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
  const jurisdictionKey = sp.get("jurisdiction") ?? "florida_rule_2515";
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
          pipelineStages: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!report || report.run.orgId !== workspace.orgId) {
    return new Response("Report not found", { status: 404 });
  }

  const run = report.run;
  const findings = run.findings;
  const isPublicView = view !== "full";

  const passedCount = findings.filter((f) => f.result === "pass").length;
  const failedCount = findings.filter((f) => f.result === "fail").length;
  const exceptionFindings = findings.filter(
    (f) => f.result === "unresolved" || f.result === "fail"
  );

  const documentHash = report.documentHash ?? run.document.documentHash;
  const timestamp = (report.generatedAt ?? run.createdAt).toISOString();

  const manifest = await prisma.verificationManifest.findFirst({
    where: { runId: run.id },
  });

  const filingBlock = generateFilingBlock({
    jurisdictionKey,
    documentTitle: docTitle,
    aiToolsUsed: aiTools,
    runId: run.id,
    documentHash,
    riskBand: report.riskBand ?? "unknown",
    coveragePct: report.coveragePct ?? 0,
    timestamp,
  });

  const data: ReportPdfData = {
    reportId,
    verificationId: manifest?.id ?? null,
    filename: run.document.filename,
    riskBand: report.riskBand,
    coveragePct: report.coveragePct,
    citationCount: report.citationCount,
    quoteIssues: report.quoteIssues,
    unresolvedItems: report.unresolvedItems,
    documentHash,
    generatedAt: timestamp,
    runId: run.id,
    filingBlock,
    isPublicView,
    exceptions: exceptionFindings.map((f) => ({
      checkType: f.checkType,
      result: f.result,
      citationText: f.citationText,
    })),
    findings: isPublicView
      ? undefined
      : findings.map((f) => ({
          checkType: f.checkType,
          result: f.result,
          citationText: f.citationText,
          sourceQueried: f.sourceQueried,
          isAiAssisted: f.isAiAssisted,
          aiModelName: f.aiModelName,
        })),
    pipelineStages: isPublicView
      ? undefined
      : run.pipelineStages.map((s) => ({
          stageName: s.stageName,
          status: s.status,
          failureDetail: s.failureDetail,
        })),
    passedCount,
    failedCount,
    totalFindings: findings.length,
  };

  const { renderToBuffer } = await import("@react-pdf/renderer");
  const { ReportPdf } = await import("@/app/(dashboard)/reports/[reportId]/report-pdf");
  const pdfBuffer = await renderToBuffer(<ReportPdf data={data} />);

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
