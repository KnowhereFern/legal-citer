import { createHash } from "crypto";
import { mkdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

import { prisma } from "@/lib/db";
import { RUN_STATUS, FINDING_RESULT } from "@/lib/constants";
import { PIPELINE_STAGES } from "@/lib/pipeline-stages";
import type { CheckResult, PipelineConfig } from "@/lib/types";

import { extractDocument } from "../extractor";
import { getAllChecks } from "../checks";
import { buildRecordCitationFindings } from "../checks/record-citation";
import { createResolver } from "../resolvers";
import { computeScore } from "../scoring";
import { createManifest, signManifest } from "@/lib/manifest";

async function updateStage(
  runId: string,
  stageName: string,
  status: "running" | "completed" | "failed",
  output?: Record<string, unknown>,
  failureDetail?: string
) {
  const existing = await prisma.pipelineStage.findFirst({
    where: { runId, stageName },
  });

  if (existing) {
    await prisma.pipelineStage.update({
      where: { id: existing.id },
      data: {
        status,
        ...(status === "running" ? { startedAt: new Date() } : {}),
        ...(status === "completed" || status === "failed"
          ? { completedAt: new Date() }
          : {}),
        ...(output ? { output: JSON.parse(JSON.stringify(output)) as never } : {}),
        ...(failureDetail ? { failureDetail } : {}),
      },
    });
  } else {
    await prisma.pipelineStage.create({
      data: {
        runId,
        stageName,
        status,
        startedAt: status === "running" ? new Date() : undefined,
        completedAt:
          status === "completed" || status === "failed"
            ? new Date()
            : undefined,
        output: output ? (JSON.parse(JSON.stringify(output)) as never) : undefined,
        failureDetail: failureDetail ?? undefined,
      },
    });
  }
}

async function failRun(runId: string, reason: string) {
  await prisma.verificationRun.update({
    where: { id: runId },
    data: {
      status: RUN_STATUS.FAILED,
      failureReason: reason,
      completedAt: new Date(),
    },
  });
}

export async function runVerification(params: {
  runId: string;
  documentBuffer: Buffer;
  contentType: string;
  config: PipelineConfig;
}): Promise<void> {
  const { runId, documentBuffer, contentType, config } = params;
  let workspace: string | undefined;

  try {
    await prisma.verificationRun.update({
      where: { id: runId },
      data: { status: RUN_STATUS.RUNNING, startedAt: new Date() },
    });

    workspace = join(tmpdir(), `legal-citer-${runId}`);
    await mkdir(workspace, { recursive: true });

    if (documentBuffer.length > config.fileSizeLimit) {
      await failRun(runId, "File exceeds size limit");
      return;
    }

    const documentHash = createHash("sha256")
      .update(documentBuffer)
      .digest("hex");

    await updateStage(runId, PIPELINE_STAGES[0], "running");
    await updateStage(runId, PIPELINE_STAGES[0], "completed", { documentHash });

    await updateStage(runId, PIPELINE_STAGES[1], "running");
    const doc = await extractDocument(documentBuffer, contentType);

    if (doc.pageCount > config.pageCountLimit) {
      await failRun(runId, "Document exceeds page limit");
      return;
    }

    await updateStage(runId, PIPELINE_STAGES[1], "completed", {
      pageCount: doc.pageCount,
      paragraphCount: doc.paragraphs.length,
      citationCount: doc.citations.length,
      quotedSpanCount: doc.quotedSpans.length,
    });

    await updateStage(runId, PIPELINE_STAGES[2], "running");
    await updateStage(runId, PIPELINE_STAGES[2], "completed", {
      citations: doc.citations.length,
      quotedSpans: doc.quotedSpans.length,
    });

    await updateStage(runId, PIPELINE_STAGES[3], "running");

    const resolver = createResolver();
    const checks = getAllChecks();
    const allFindings: CheckResult[] = [];

    for (const citation of doc.citations) {
      for (const check of checks) {
        try {
          const result = await check.execute(citation, doc, resolver);
          allFindings.push(result);
        } catch {
          allFindings.push({
            checkType: check.name,
            result: FINDING_RESULT.ERROR,
            citationText: citation.text,
            isAiAssisted: false,
            detail: "Check execution failed",
            paragraphIndex: citation.paragraphIndex,
            pageNumber: citation.page,
          });
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // Record-citation check is document-scoped: emit one finding per detected
    // record citation when the check is enabled. It is intentionally not part
    // of the per-citation checks map above.
    if (config.enableRecordCitations) {
      allFindings.push(...buildRecordCitationFindings(doc.recordCitations ?? []));
    }

    await updateStage(runId, PIPELINE_STAGES[3], "completed", {
      totalFindings: allFindings.length,
    });

    await updateStage(runId, PIPELINE_STAGES[4], "running");
    const score = computeScore(allFindings);
    await updateStage(runId, PIPELINE_STAGES[4], "completed", { ...score });

    await updateStage(runId, PIPELINE_STAGES[5], "running");

    await prisma.$transaction(
      allFindings.map((finding) =>
        prisma.finding.create({
          data: {
            runId,
            checkType: finding.checkType,
            result: finding.result,
            citationText: finding.citationText,
            sourceQueried: finding.sourceQueried,
            snippetUsed: finding.snippetUsed,
            ruleId: finding.ruleId,
            isAiAssisted: finding.isAiAssisted,
            aiModelName: finding.aiModelName,
            aiModelVersion: finding.aiModelVersion,
            detail: finding.detail,
            canonicalCitation: finding.canonicalCitation,
            canonicalCaseName: finding.canonicalCaseName,
            canonicalCourt: finding.canonicalCourt,
            paragraphIndex: finding.paragraphIndex,
            pageNumber: finding.pageNumber,
          },
        })
      )
    );

    await prisma.report.create({
      data: {
        runId,
        reportType: "full",
        status: "ready",
        riskBand: score.riskBand,
        coveragePct: score.coveragePct,
        citationCount: score.citationCount,
        quoteIssues: score.quoteIssues,
        unresolvedItems: score.unresolvedItems,
        authoritiesVerified: score.authoritiesVerified,
        authoritiesUnresolved: score.authoritiesUnresolved,
        quotationsChecked: score.quotationsChecked,
        quotationsMatched: score.quotationsMatched,
        recordCitationsChecked: score.recordCitationsChecked,
        recordCitationsUnresolved: score.recordCitationsUnresolved,
        documentHash,
        generatedAt: new Date(),
      },
    });

    await updateStage(runId, PIPELINE_STAGES[5], "completed");

    await createManifest(runId, documentHash);
    const manifestRecord = await prisma.verificationManifest.findUniqueOrThrow({
      where: { runId },
    });
    await signManifest(manifestRecord.id);

    await prisma.verificationRun.update({
      where: { id: runId },
      data: {
        status: RUN_STATUS.COMPLETED,
        completedAt: new Date(),
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown pipeline error";
    try {
      await failRun(runId, message);
    } catch {}
    throw err;
  } finally {
    if (workspace) {
      try {
        await rm(workspace, { recursive: true, force: true });
      } catch {}
    }
  }
}
