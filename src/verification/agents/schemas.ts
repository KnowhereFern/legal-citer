/**
 * Structured schemas for the multi-agent citation system.
 *
 * These exist so handoffs pass *structured state, not raw text blobs*
 * (success criterion #3). Every agent output and every tool result is
 * schema-validated; the supervisor and each subagent declare a
 * `responseFormat` drawn from this file.
 *
 * Design source: Anthropic's MARS — "implement artifact systems where
 * specialized agents can create outputs that persist independently… pass
 * lightweight references back to the coordinator."
 * https://www.anthropic.com/engineering/multi-agent-research-system
 */
import { z } from "zod";

/** What the resolver-agent returns for one citation. */
export const resolverAgentOutputSchema = z.object({
  resolved: z.boolean().describe("Whether an authority source was found."),
  sourceId: z
    .string()
    .nullable()
    .describe("Stable id of the resolved authority, e.g. 'courtlistener'. Null if unresolved."),
  citationId: z
    .string()
    .describe("The citation id whose source is now cached in the artifact store."),
  rationale: z
    .string()
    .describe("One sentence: which source matched and why, or why nothing matched."),
});
export type ResolverAgentOutput = z.infer<typeof resolverAgentOutputSchema>;

/** What the support-analyst-agent returns. Superset of the legacy SupportAnalysisResult. */
export const supportAnalystOutputSchema = z.object({
  propositionSupported: z
    .enum(["yes", "no", "partial", "inconclusive"])
    .describe("Whether the located source text supports the cited proposition."),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in the judgment, 0 to 1."),
  evidenceSpans: z
    .array(
      z.object({
        text: z.string().describe("The quoted span from the source that supports/refutes."),
        location: z.string().describe("Where it was found, e.g. 'paragraph 14' or 'offset 4302'."),
      }),
    )
    .describe("Concrete spans from the source backing the judgment. Empty if inconclusive."),
  analysis: z
    .string()
    .describe("2-4 sentence reasoning grounded in the evidence spans."),
});
export type SupportAnalystOutput = z.infer<typeof supportAnalystOutputSchema>;

/** Final synthesized answer from the supervisor. */
export const supervisorOutputSchema = z.object({
  citationText: z.string(),
  authorityResolved: z.boolean(),
  propositionSupported: supportAnalystOutputSchema.shape.propositionSupported,
  confidence: supportAnalystOutputSchema.shape.confidence,
  analysis: z.string(),
  trace: z
    .array(
      z.object({
        agent: z.string(),
        action: z.string(),
        outcome: z.string(),
      }),
    )
    .describe("Ordered list of which agent did what, for auditability."),
});
export type SupervisorOutput = z.infer<typeof supervisorOutputSchema>;

/** Input task envelope passed into the supervisor graph. */
export const citationTaskSchema = z.object({
  citationId: z.string().describe("Stable id used as the artifact-store key."),
  citationText: z.string().describe("The citation string as it appears in the brief."),
  proposition: z
    .string()
    .describe("The proposition the citation is meant to support, from surrounding text."),
});
export type CitationTask = z.infer<typeof citationTaskSchema>;
