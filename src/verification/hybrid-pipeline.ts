import { prisma } from "@/lib/db";
import { FINDING_RESULT, RUN_STATUS } from "@/lib/constants";
import { HYBRID_PIPELINE_STAGES } from "@/lib/pipeline-stages";
import type { CheckResult, PipelineConfig } from "@/lib/types";

import { runVerification } from "./pipeline/runner";
import { SupportAnalyst } from "./support-analyst";
import { computeScore } from "./scoring";

const CASE_CITATION_PATTERN = /[A-Z][a-zA-Z'.\-]+ v\. [A-Z][a-zA-Z'.\-]+/;

function isCaseLawCitation(text: string): boolean {
  return CASE_CITATION_PATTERN.test(text);
}

async function upsertStage(
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

export async function runHybridVerification(params: {
  runId: string;
  documentBuffer: Buffer;
  contentType: string;
  config: PipelineConfig;
  enableSupportAnalysis?: boolean;
}): Promise<void> {
  const { runId, documentBuffer, contentType, config, enableSupportAnalysis } =
    params;

  // Run the base pipeline first (citations → checks → score → report).
  await runVerification({ runId, documentBuffer, contentType, config });

  if (!enableSupportAnalysis) {
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    await upsertStage(runId, HYBRID_PIPELINE_STAGES[0], "completed", {
      skipped: true,
      reason: "OPENROUTER_API_KEY not configured",
    });
    return;
  }

  // The base pipeline marked the run COMPLETED at the end of persist_results.
  // We're about to run more work (LLM analysis + score recompute), so flip
  // back to RUNNING so the UI doesn't briefly show "completed" while the
  // LLM is still grinding through case-law citations. The processor sets
  // COMPLETED again once this whole function returns.
  await prisma.verificationRun.update({
    where: { id: runId },
    data: { status: RUN_STATUS.RUNNING },
  });

  await upsertStage(runId, HYBRID_PIPELINE_STAGES[0], "running");

  const findings = await prisma.finding.findMany({ where: { runId } });
  const caseLawCitations = new Set<string>();

  for (const finding of findings) {
    if (finding.citationText && isCaseLawCitation(finding.citationText)) {
      caseLawCitations.add(finding.citationText);
    }
  }

  await upsertStage(runId, HYBRID_PIPELINE_STAGES[0], "completed", {
    eligibleCitations: caseLawCitations.size,
  });

  if (caseLawCitations.size === 0) {
    return;
  }

  await upsertStage(runId, HYBRID_PIPELINE_STAGES[1], "running");

  const analyst = new SupportAnalyst(apiKey);
  const resolvedSources = new Map<string, string>();

  for (const finding of findings) {
    if (
      finding.checkType === "citation_existence" &&
      finding.result === FINDING_RESULT.PASS &&
      finding.citationText
    ) {
      resolvedSources.set(
        finding.citationText,
        finding.snippetUsed ?? ""
      );
    }
  }

  const supportFindings: CheckResult[] = [];

  for (const citationText of caseLawCitations) {
    const sourceContent = resolvedSources.get(citationText) ?? "";

    const result = await analyst.analyzeCitation({
      citation: { text: citationText },
      sourceContent,
      caseLawOnly: true,
    });

    const checkResult: CheckResult = {
      checkType: "proposition_support_analysis",
      result:
        result.propositionSupported === true
          ? FINDING_RESULT.PASS
          : result.propositionSupported === false
            ? FINDING_RESULT.FAIL
            : FINDING_RESULT.UNRESOLVED,
      citationText: result.citationText,
      isAiAssisted: true,
      aiModelName: process.env.LLM_MODEL ?? "deepseek/deepseek-r1",
      detail: result.analysis,
    };

    supportFindings.push(checkResult);
  }

  await prisma.$transaction(
    supportFindings.map((finding) =>
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
        },
      })
    )
  );

  await upsertStage(runId, HYBRID_PIPELINE_STAGES[1], "completed", {
    analyzedCitations: supportFindings.length,
  });

  await upsertStage(runId, HYBRID_PIPELINE_STAGES[2], "running");

  const allFindings = await prisma.finding.findMany({ where: { runId } });
  const checkResults: CheckResult[] = allFindings.map((f) => ({
    checkType: f.checkType,
    result: f.result as import("@/lib/constants").FindingResult,
    citationText: f.citationText ?? undefined,
    sourceQueried: f.sourceQueried ?? undefined,
    snippetUsed: f.snippetUsed ?? undefined,
    ruleId: f.ruleId ?? undefined,
    isAiAssisted: f.isAiAssisted,
    aiModelName: f.aiModelName ?? undefined,
    aiModelVersion: f.aiModelVersion ?? undefined,
    detail:
      f.metadata && typeof f.metadata === "object" && "detail" in f.metadata
        ? (f.metadata as Record<string, unknown>).detail as string | undefined
        : undefined,
  }));

  const score = computeScore(checkResults);

  await upsertStage(runId, HYBRID_PIPELINE_STAGES[2], "completed", { ...score });

  const report = await prisma.report.findFirst({ where: { runId } });
  if (report) {
    await prisma.report.update({
      where: { id: report.id },
      data: {
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
      },
    });
  }
}
