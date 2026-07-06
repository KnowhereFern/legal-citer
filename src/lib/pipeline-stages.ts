/**
 * Canonical, ordered list of pipeline stage names.
 *
 * This is the SINGLE source of truth for what stages a verification run moves
 * through. It is consumed by:
 *   - `POST /api/runs` — to seed pending rows at run creation
 *   - `runVerification` / `runHybridVerification` — to update rows as work
 *     progresses
 *   - the run detail page — implicitly, by reading the rows those two wrote
 *
 * Adding/removing/reordering a stage MUST happen here, and the worker must use
 * these constants — never a string literal. Before this module existed, the API
 * route seeded one set of names (hash, extract, citations, quotes, checks,
 * scoring, report) while the worker wrote a disjoint set
 * (hash_document, extract_text, extract_citations, run_checks, compute_score,
 * persist_results). Because the worker's upsert keyed on exact-string
 * stageName, the seeded rows were never matched and stayed "pending" forever,
 * producing a permanently-stuck "Pipeline stages" table on every run.
 */
export const PIPELINE_STAGES = [
  "hash_document",
  "extract_text",
  "extract_citations",
  "run_checks",
  "compute_score",
  "persist_results",
] as const;

export type PipelineStageName = (typeof PIPELINE_STAGES)[number];

/**
 * Hybrid-only stages, appended after the base pipeline when LLM support
 * analysis is enabled. Kept separate so the base run's "Step X of Y" progress
 * math (which only counts base stages) stays stable.
 */
export const HYBRID_PIPELINE_STAGES = [
  "support_analysis_eligibility",
  "llm_support_analysis",
  "hybrid_recompute_score",
] as const;

export type HybridPipelineStageName = (typeof HYBRID_PIPELINE_STAGES)[number];
