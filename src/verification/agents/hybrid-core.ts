/**
 * Pure agent-invocation core for the hybrid pipeline.
 *
 * This is the DB-free seam that runHybridVerification calls. Extracting it
 * serves two purposes:
 *  1. Separation of concerns — agent orchestration is decoupled from Prisma
 *     persistence, so the production function reads as "seed → run agents →
 *     persist" instead of one tangled loop.
 *  2. Testability — the agent path can be exercised against real APIs
 *     (CourtListener, OpenRouter) without a running Postgres, because the
 *     infrastructure dependency is layered above this function.
 *
 * IMPORTANT: this is NOT a mock. The agent calls inside (runCitationVerification
 * → real resolvers + real LLM) are 100% live. Only the DB is bypassed, by the
 * caller choosing not to persist.
 */
import { FINDING_RESULT } from "@/lib/constants";
import type { CheckResult } from "@/lib/types";

import { ArtifactStore, runCitationVerification } from "./citation-graph";
import type { CitationTask } from "./schemas";

/** A resolved finding from the deterministic pipeline, used to pre-seed the store. */
export interface SeedFinding {
  checkType: string;
  result: string;
  citationText: string | null;
  snippetUsed: string | null;
  sourceQueried: string | null;
}

export interface CitationTraceSummary {
  citationText: string;
  citationId: string;
  status: "completed" | "failed";
  result: string;
  events: number;
  detail: string;
  sample?: string;
}

export interface AgentSupportResult {
  findings: CheckResult[];
  traces: CitationTraceSummary[];
  preSeededCount: number;
}

/** Derive a stable citationId from citation text (findings key on text, not id). */
export function citationIdFor(citationText: string): string {
  return `cite-${citationText.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`;
}

/**
 * Pre-seed an artifact store from the deterministic pipeline's resolved
 * findings. Returns the store and the count of seeded authorities.
 *
 * This is the no-duplicate-work contract: the CompositeResolver already
 * fetched opinion text for PASS citation_existence findings; by seeding the
 * store, the supervisor sees hasAuthority === true and skips the
 * resolver-agent, going straight to support_analyst.
 */
export function seedStoreFromFindings(
  store: ArtifactStore,
  findings: SeedFinding[],
): number {
  let count = 0;
  for (const finding of findings) {
    if (
      finding.checkType === "citation_existence" &&
      finding.result === FINDING_RESULT.PASS &&
      finding.citationText &&
      (finding.snippetUsed ?? "").length > 0
    ) {
      store.putAuthority(citationIdFor(finding.citationText), {
        sourceId: finding.sourceQueried ?? "deterministic-pipeline",
        content: finding.snippetUsed ?? "",
      });
      count += 1;
    }
  }
  return count;
}

/**
 * Run the multi-agent support analysis for a set of case-law citations.
 *
 * Pure: no DB. Calls runCitationVerification (real agents) per citation.
 * Failure-recoverable: a per-citation agent error produces an ERROR finding
 * and a failed trace entry, then processing continues to the next citation
 * (criterion #5).
 */
export async function runAgentSupportAnalysis(params: {
  caseLawCitations: Set<string>;
  store: ArtifactStore;
  modelName: string;
}): Promise<AgentSupportResult> {
  const { caseLawCitations, store, modelName } = params;
  const findings: CheckResult[] = [];
  const traces: CitationTraceSummary[] = [];

  for (const citationText of caseLawCitations) {
    const citationId = citationIdFor(citationText);
    const task: CitationTask = {
      citationId,
      citationText,
      // The pipeline does not extract the proposition from brief context, so
      // the citation text stands in as the proposition — same as the legacy
      // SupportAnalyst, which only had citation text + source content.
      proposition: citationText,
    };

    try {
      const { output, trace } = await runCitationVerification(task, store);
      const result =
        output.propositionSupported === "yes"
          ? FINDING_RESULT.PASS
          : output.propositionSupported === "no" ||
              output.propositionSupported === "partial"
            ? FINDING_RESULT.FAIL
            : FINDING_RESULT.UNRESOLVED;

      findings.push({
        checkType: "proposition_support_analysis",
        result,
        citationText,
        isAiAssisted: true,
        aiModelName: modelName,
        detail: output.analysis,
      });
      traces.push({
        citationText,
        citationId,
        status: "completed",
        result,
        events: trace.length,
        detail: output.analysis.slice(0, 200),
        sample: trace[trace.length - 1]?.outcome?.slice(0, 120),
      });
    } catch (err) {
      // Failure recovery: record an ERROR finding (visible in the report) and
      // a failed trace entry, then CONTINUE to the next citation. One agent
      // failure must not abort the whole run.
      const message =
        err instanceof Error ? err.message : "Unknown agent error";
      findings.push({
        checkType: "proposition_support_analysis",
        result: FINDING_RESULT.ERROR,
        citationText,
        isAiAssisted: true,
        aiModelName: modelName,
        detail: `Agent system failed: ${message}`,
      });
      traces.push({
        citationText,
        citationId,
        status: "failed",
        result: FINDING_RESULT.ERROR,
        events: 0,
        detail: message.slice(0, 200),
      });
    }
  }

  return { findings, traces, preSeededCount: 0 };
}
