/**
 * Tests for the hybrid pipeline's agent-invocation seam (runAgentSupportAnalysis).
 *
 * These prove criterion #5 (failures show up in the trace and are recoverable)
 * with an INJECTED hard failure: the first citation's agent call is mocked to
 * throw, the second to succeed. We assert that:
 *  - the failed citation produces an ERROR finding (visible in the report)
 *  - the failed citation produces a "failed" trace entry
 *  - processing CONTINUES to the second citation (the run does not abort)
 *  - the second citation produces a normal PASS finding
 *
 * The mock is necessary because exercising the real agent costs live tokens
 * and time per citation; the failure-recovery CONTRACT is what matters here
 * and is pure control-flow logic in runAgentSupportAnalysis. The live trace
 * (scripts/run-pipeline-trace.ts) covers the real-agent path.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the citation-graph module BEFORE importing the seam that depends on it.
// We control which citations throw vs succeed via the citationId.
vi.mock("@/verification/agents/citation-graph", () => {
  class FakeArtifactStore {
    private map = new Map<string, unknown>();
    putAuthority(id: string, a: unknown) {
      this.map.set(id, a);
    }
    getAuthority(id: string) {
      return this.map.get(id) ?? null;
    }
    hasAuthority(id: string) {
      return this.map.has(id);
    }
    incrementLocateCalls() {
      return 1;
    }
    locateCallCount() {
      return 0;
    }
  }
  return {
    ArtifactStore: FakeArtifactStore,
    runCitationVerification: vi.fn(),
  };
});

// Import AFTER the mock is registered.
import { runAgentSupportAnalysis, citationIdFor } from "@/verification/agents/hybrid-core";
import { FINDING_RESULT } from "@/lib/constants";
import { runCitationVerification } from "@/verification/agents/citation-graph";

describe("runAgentSupportAnalysis — failure recovery (criterion #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("continues to the next citation when one agent call throws", async () => {
    const store = new (await import("@/verification/agents/citation-graph")).ArtifactStore();
    const goodCitation = "Good v. Good, 100 U.S. 100";
    const badCitation = "Bad v. Bad, 999 U.S. 999";

    // Inject: the bad citation throws, the good one succeeds.
    vi.mocked(runCitationVerification).mockImplementation(async (task) => {
      if (task.citationText === badCitation) {
        throw new Error("simulated agent crash (e.g. LLM provider 500)");
      }
      return {
        output: {
          citationText: task.citationText,
          authorityResolved: true,
          propositionSupported: "yes" as const,
          confidence: 0.9,
          analysis: "Source supports the proposition.",
          trace: [],
        },
        trace: [
          { agent: "support_analyst", action: "produced output", outcome: "ok", ts: "" },
        ],
        store,
      };
    });

    const result = await runAgentSupportAnalysis({
      caseLawCitations: new Set([badCitation, goodCitation]),
      store,
      modelName: "test-model",
    });

    // Both citations were processed — the failure did NOT abort the loop.
    expect(result.findings).toHaveLength(2);
    expect(result.traces).toHaveLength(2);

    // The bad citation → ERROR finding + failed trace.
    const badFinding = result.findings.find((f) => f.citationText === badCitation);
    expect(badFinding?.result).toBe(FINDING_RESULT.ERROR);
    expect(badFinding?.detail).toContain("simulated agent crash");
    const badTrace = result.traces.find((t) => t.citationText === badCitation);
    expect(badTrace?.status).toBe("failed");
    expect(badTrace?.result).toBe(FINDING_RESULT.ERROR);

    // The good citation → PASS finding + completed trace (recovery proven).
    const goodFinding = result.findings.find((f) => f.citationText === goodCitation);
    expect(goodFinding?.result).toBe(FINDING_RESULT.PASS);
    const goodTrace = result.traces.find((t) => t.citationText === goodCitation);
    expect(goodTrace?.status).toBe("completed");

    // runCitationVerification was called for BOTH (loop did not break early).
    expect(runCitationVerification).toHaveBeenCalledTimes(2);
  });

  it("maps propositionSupported verdicts to the correct FindingResult", async () => {
    const store = new (await import("@/verification/agents/citation-graph")).ArtifactStore();
    const cases: Array<{ citation: string; verdict: "yes" | "no" | "partial" | "inconclusive"; expected: string }> = [
      { citation: "Yes v. Yes, 1 U.S. 1", verdict: "yes", expected: FINDING_RESULT.PASS },
      { citation: "No v. No, 2 U.S. 2", verdict: "no", expected: FINDING_RESULT.FAIL },
      { citation: "Partial v. Partial, 3 U.S. 3", verdict: "partial", expected: FINDING_RESULT.FAIL },
      { citation: "Inconc v. Inconc, 4 U.S. 4", verdict: "inconclusive", expected: FINDING_RESULT.UNRESOLVED },
    ];

    vi.mocked(runCitationVerification).mockImplementation(async (task) => {
      const verdict = cases.find((c) => c.citation === task.citationText)!.verdict;
      return {
        output: {
          citationText: task.citationText,
          authorityResolved: true,
          propositionSupported: verdict,
          confidence: 0.5,
          analysis: "x",
          trace: [],
        },
        trace: [],
        store,
      };
    });

    const result = await runAgentSupportAnalysis({
      caseLawCitations: new Set(cases.map((c) => c.citation)),
      store,
      modelName: "test-model",
    });

    for (const c of cases) {
      const finding = result.findings.find((f) => f.citationText === c.citation);
      expect(finding?.result).toBe(c.expected);
    }
  });

  it("citationIdFor produces stable, filesystem-safe ids", () => {
    expect(citationIdFor("Obergefell v. Hodges, 576 U.S. 644 (2015)")).toBe(
      "cite-obergefell-v-hodges-576-u-s-644-2015-",
    );
    // Same input → same id (stable).
    expect(citationIdFor("Smith v. Jones, 1 U.S. 1")).toBe(
      citationIdFor("Smith v. Jones, 1 U.S. 1"),
    );
  });
});
