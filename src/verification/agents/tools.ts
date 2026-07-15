/**
 * LangChain tool wrappers exposing the existing deterministic resolvers and
 * two new read tools to the agents.
 *
 * Tool-design source: Anthropic "Building Effective Agents" Appendix 2 —
 * "invest just as much effort in creating good agent-computer interfaces
 * (ACI)" and "poka-yoke your tools." Each description states exactly when to
 * use the tool and what it returns, so the model cannot mistake one source
 * for another.
 * https://www.anthropic.com/engineering/building-effective-agents
 *
 * The resolver tools are thin wrappers: they instantiate a single resolver and
 * call .resolve(). They do NOT composite — the agent decides the order. This
 * is the supervisor/subagents-as-tools pattern; the deterministic waterfall
 * (CompositeResolver) is deliberately bypassed so the agent can pick a source
 * based on citation type, which is faster and avoids dead calls.
 */
import { tool } from "@langchain/core/tools";
import { z } from "zod";

import type { Citation, ResolverResult } from "@/lib/types";
import {
  CourtListenerResolver,
  CAPResolver,
  GovInfoResolver,
  FloridaStatuteResolver,
} from "../resolvers";
import { ArtifactStore } from "./artifact-store";

function asCitation(citationText: string): Citation {
  return { text: citationText, spanStart: 0, spanEnd: citationText.length };
}

function summarize(result: ResolverResult): {
  found: boolean;
  sourceId: string | null;
  contentLength: number;
  metadata: Record<string, unknown> | null;
} {
  return {
    found: result.status === "resolved",
    sourceId: result.sourceId ?? null,
    contentLength: result.content?.length ?? 0,
    metadata: (result.metadata as Record<string, unknown>) ?? null,
  };
}

/**
 * Build the resolver-agent's toolset. The store is injected so a successful
 * resolve caches the full text for the support-analyst-agent to read later.
 */
export function buildResolverTools(store: ArtifactStore) {
  const cacheIfFound = (citationId: string, result: ResolverResult) => {
    if (result.status === "resolved" && result.content) {
      store.putAuthority(citationId, {
        sourceId: result.sourceId ?? "unknown",
        content: result.content,
        metadata: result.metadata as Record<string, unknown> | undefined,
      });
    }
  };

  const searchCourtlistener = tool(
    async ({ citationId, citationText }) => {
      const resolver = new CourtListenerResolver(process.env.COURTLISTENER_API_KEY);
      const result = await resolver.resolve(asCitation(citationText));
      cacheIfFound(citationId, result);
      return summarize(result);
    },
    {
      name: "search_courtlistener",
      description:
        "Look up a CASE LAW citation (e.g. 'Smith v. Jones, 565 U.S. 368') against CourtListener, the primary federal/state appellate case source. " +
        "Use this FIRST for any 'X v. Y' citation. Returns {found, sourceId, contentLength, metadata}. " +
        "Do NOT use for statutes ('U.S.C.', 'Fla. Stat.'). On a match the full opinion text is cached internally.",
      schema: z.object({
        citationId: z.string().describe("The task's citationId; echo it back."),
        citationText: z.string().describe("The exact citation string to look up."),
      }),
    },
  );

  const searchCap = tool(
    async ({ citationId, citationText }) => {
      const resolver = new CAPResolver();
      const result = await resolver.resolve(asCitation(citationText));
      cacheIfFound(citationId, result);
      return summarize(result);
    },
    {
      name: "search_cap",
      description:
        "Look up a HISTORICAL case citation (pre-1923 U.S. caselaw) against the Caselaw Access Project. " +
        "Use ONLY as a fallback when search_courtlistener found nothing for an old case. " +
        "Returns {found, sourceId, contentLength, metadata}.",
      schema: z.object({
        citationId: z.string().describe("The task's citationId; echo it back."),
        citationText: z.string().describe("The exact citation string to look up."),
      }),
    },
  );

  const searchGovinfo = tool(
    async ({ citationId, citationText }) => {
      const resolver = new GovInfoResolver(process.env.GOVINFO_API_KEY);
      const result = await resolver.resolve(asCitation(citationText));
      cacheIfFound(citationId, result);
      return summarize(result);
    },
    {
      name: "search_govinfo",
      description:
        "Look up a U.S. FEDERAL STATUTE citation (matching 'NN U.S.C. § NNNN') against GovInfo. " +
        "Use ONLY for federal statutes. Do NOT use for case law or state statutes. " +
        "Returns {found, sourceId, contentLength, metadata}.",
      schema: z.object({
        citationId: z.string().describe("The task's citationId; echo it back."),
        citationText: z.string().describe("The exact statute citation string to look up."),
      }),
    },
  );

  const searchFlorida = tool(
    async ({ citationId, citationText }) => {
      const resolver = new FloridaStatuteResolver();
      const result = await resolver.resolve(asCitation(citationText));
      cacheIfFound(citationId, result);
      return summarize(result);
    },
    {
      name: "search_florida",
      description:
        "Look up a FLORIDA STATUTE citation (matching 'Fla. Stat. § NNN.NNN') against the Florida Senate. " +
        "Use ONLY for Florida statutes. Do NOT use for federal statutes or case law. " +
        "Returns {found, sourceId, contentLength, metadata}.",
      schema: z.object({
        citationId: z.string().describe("The task's citationId; echo it back."),
        citationText: z.string().describe("The exact Florida statute citation string to look up."),
      }),
    },
  );

  return [searchCourtlistener, searchCap, searchGovinfo, searchFlorida];
}

/**
 * Build the support-analyst-agent's toolset: read the cached authority text,
 * and locate spans within it.
 */
export function buildAnalystTools(store: ArtifactStore) {
  const fetchSourceText = tool(
    async ({ citationId }) => {
      const authority = store.getAuthority(citationId);
      if (!authority) {
        return { found: false, contentLength: 0, preview: "" };
      }
      // Return a preview (first 1500 chars) plus length. The full text is kept
      // in the store for locate_passage; we avoid dumping tens of KB into the
      // message history (MARS: pass references, not blobs).
      return {
        found: true,
        sourceId: authority.sourceId,
        contentLength: authority.content.length,
        preview: authority.content.slice(0, 1500),
      };
    },
    {
      name: "fetch_source_text",
      description:
        "Fetch the full text of the resolved authority for this citationId into working memory, and return a 1500-char preview plus the total length. " +
        "You MUST call this before judging support. Returns {found, sourceId, contentLength, preview}.",
      schema: z.object({
        citationId: z.string().describe("The citationId whose resolved authority to fetch."),
      }),
    },
  );

  const locatePassage = tool(
    async ({ citationId, phrase }) => {
      // Hard effort-budget cap. The prompt says max 3 calls; this enforces it
      // regardless of model compliance (poka-yoke — Anthropic "Building
      // Effective Agents" Appendix 2). Over-budget calls return a clear signal
      // so the agent stops searching and judges from what it has.
      const callNumber = store.incrementLocateCalls(citationId);
      if (callNumber > ArtifactStore.LOCATE_PASSAGE_BUDGET) {
        return {
          found: false,
          budgetExhausted: true,
          message: `locate_passage budget reached (${ArtifactStore.LOCATE_PASSAGE_BUDGET} calls). Stop searching and produce your verdict from the evidence already gathered.`,
          matches: [] as Array<{ text: string; location: string }>,
        };
      }
      const authority = store.getAuthority(citationId);
      if (!authority) {
        return { found: false, matches: [] as Array<{ text: string; location: string }> };
      }
      const text = authority.content;
      const needle = phrase.toLowerCase();
      const matches: Array<{ text: string; location: string }> = [];
      // Find up to 3 case-insensitive occurrences; quote a window around each.
      let from = 0;
      while (matches.length < 3) {
        const idx = text.toLowerCase().indexOf(needle, from);
        if (idx === -1) break;
        const start = Math.max(0, idx - 120);
        const end = Math.min(text.length, idx + phrase.length + 120);
        matches.push({
          text: text.slice(start, end).trim(),
          location: `offset ${idx}`,
        });
        from = idx + phrase.length;
      }
      return { found: matches.length > 0, matches };
    },
    {
      name: "locate_passage",
      description:
        "Search the fetched authority text for an exact phrase (case-insensitive) and return up to 3 occurrences with surrounding context. " +
        "Use this to confirm a claim or to pull an evidence span. Returns {found, matches:[{text,location}]}. " +
        "If the phrase is not found, try a shorter/different phrase; do not assume absence means the claim is false.",
      schema: z.object({
        citationId: z.string().describe("The citationId whose authority text to search."),
        phrase: z
          .string()
          .describe("A short, exact phrase to find in the source (e.g. 'qualified immunity')."),
      }),
    },
  );

  return [fetchSourceText, locatePassage];
}
