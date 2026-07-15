/**
 * Unit tests for the multi-agent system's structural guarantees.
 *
 * These verify the success criteria that don't require a live LLM:
 *  - lane isolation: each agent's toolset is disjoint (criterion #2)
 *  - structured handoffs: every schema is valid zod + round-trips (criterion #3)
 *  - effort budgets: the artifact store enforces the cap (criterion #4)
 *  - artifact-store reference passing: writes are keyed by citationId (criterion #3)
 *
 * The live end-to-end trace (scripts/run-agent-trace.ts) covers criterion #1
 * (≥N workflows run end-to-end) and #5 (failures show in the trace).
 */
import { describe, it, expect } from "vitest";

import {
  resolverAgentOutputSchema,
  supportAnalystOutputSchema,
  supervisorOutputSchema,
  citationTaskSchema,
} from "@/verification/agents/schemas";
import { ArtifactStore } from "@/verification/agents/artifact-store";
import { buildResolverTools, buildAnalystTools } from "@/verification/agents/tools";

describe("schemas — structured handoffs (criterion #3)", () => {
  it("resolverAgentOutputSchema accepts a well-formed output", () => {
    const valid = {
      resolved: true,
      sourceId: "courtlistener",
      citationId: "cite-1",
      rationale: "Matched on CourtListener.",
    };
    expect(resolverAgentOutputSchema.parse(valid)).toEqual(valid);
  });

  it("resolverAgentOutputSchema rejects missing fields", () => {
    expect(() => resolverAgentOutputSchema.parse({ resolved: true })).toThrow();
  });

  it("supportAnalystOutputSchema accepts all four verdict values", () => {
    for (const v of ["yes", "no", "partial", "inconclusive"] as const) {
      const out = supportAnalystOutputSchema.parse({
        propositionSupported: v,
        confidence: 0.5,
        evidenceSpans: [],
        analysis: "reasoning",
      });
      expect(out.propositionSupported).toBe(v);
    }
  });

  it("supportAnalystOutputSchema rejects confidence out of [0,1]", () => {
    expect(() =>
      supportAnalystOutputSchema.parse({
        propositionSupported: "yes",
        confidence: 1.5,
        evidenceSpans: [],
        analysis: "x",
      }),
    ).toThrow();
  });

  it("supervisorOutputSchema round-trips a full verdict", () => {
    const verdict = {
      citationText: "Smith v. Jones, 1 U.S. 1",
      authorityResolved: true,
      propositionSupported: "yes",
      confidence: 0.9,
      analysis: "The opinion directly holds so.",
      trace: [{ agent: "resolver", action: "called search_courtlistener", outcome: "found" }],
    };
    expect(supervisorOutputSchema.parse(verdict)).toEqual(verdict);
  });

  it("citationTaskSchema requires citationId, citationText, proposition", () => {
    expect(() =>
      citationTaskSchema.parse({ citationId: "x", citationText: "y" }),
    ).toThrow();
  });
});

describe("artifact store — reference-based handoffs (criterion #3, #4)", () => {
  it("stores authority by citationId and returns it by the same key", () => {
    const store = new ArtifactStore();
    store.putAuthority("cite-1", {
      sourceId: "courtlistener",
      content: "opinion text...",
    });
    expect(store.hasAuthority("cite-1")).toBe(true);
    expect(store.hasAuthority("cite-2")).toBe(false);
    expect(store.getAuthority("cite-1")?.content).toBe("opinion text...");
  });

  it("enforces the locate_passage budget and reports exhaustion", () => {
    const store = new ArtifactStore();
    const budget = ArtifactStore.LOCATE_PASSAGE_BUDGET;
    // First `budget` calls increment normally.
    for (let i = 1; i <= budget; i++) {
      expect(store.incrementLocateCalls("cite-1")).toBe(i);
    }
    // The next call is over budget.
    expect(store.incrementLocateCalls("cite-1")).toBe(budget + 1);
    expect(store.locateCallCount("cite-1")).toBe(budget + 1);
  });

  it("counts are per-citation, not global", () => {
    const store = new ArtifactStore();
    store.incrementLocateCalls("cite-1");
    store.incrementLocateCalls("cite-1");
    expect(store.locateCallCount("cite-2")).toBe(0);
  });
});

describe("lane isolation — each agent has only its own tools (criterion #2)", () => {
  const store = new ArtifactStore();

  it("resolver's toolset contains ONLY resolver sources", () => {
    const resolverTools = buildResolverTools(store);
    const names = resolverTools.map((t) => t.name).sort();
    // No analyst tools leak in.
    expect(names).not.toContain("fetch_source_text");
    expect(names).not.toContain("locate_passage");
    // All four sources are present.
    expect(names).toEqual(
      ["search_cap", "search_courtlistener", "search_florida", "search_govinfo"].sort(),
    );
  });

  it("support_analyst's toolset contains ONLY read tools", () => {
    const analystTools = buildAnalystTools(store);
    const names = analystTools.map((t) => t.name).sort();
    expect(names).toEqual(["fetch_source_text", "locate_passage"].sort());
    // No resolver sources leak in.
    expect(names).not.toContain("search_courtlistener");
    expect(names).not.toContain("search_govinfo");
  });

  it("the two toolsets are disjoint", () => {
    const resolverNames: Set<string> = new Set(buildResolverTools(store).map((t) => t.name));
    const analystNames: Set<string> = new Set(buildAnalystTools(store).map((t) => t.name));
    const overlap = [...resolverNames].filter((n) => analystNames.has(n));
    expect(overlap).toEqual([]);
  });
});
