/**
 * In-process artifact store for the multi-agent system.
 *
 * Purpose (research-anchored): Anthropic's MARS recommends "artifact systems
 * where specialized agents can create outputs that persist independently.
 * Subagents call tools to store their work… then pass lightweight references
 * back to the coordinator. This prevents information loss during multi-stage
 * processing and reduces token overhead."
 * https://www.anthropic.com/engineering/multi-agent-research-system
 *
 * Concretely here: the resolver-agent fetches a (potentially large) opinion
 * text and stores it by citationId. It returns only a {citationId, sourceId}
 * reference. The support-analyst-agent later reads the text by reference,
 * so the large body never flows through the supervisor's message history.
 *
 * Scope is one verification run / one process. Not persisted; the DB remains
 * the durable store (consistent with the rest of the pipeline).
 */
export interface StoredAuthority {
  sourceId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export class ArtifactStore {
  private authorities = new Map<string, StoredAuthority>();
  // Per-citation call counters — the enforcement surface for effort budgets.
  // (Anthropic MARS: "proactively mitigated unintended side effects by setting
  // explicit guardrails to prevent the agents from spiraling out of control."
  // Prompts alone are not a guarantee; the tool must refuse gracefully.)
  private locateCallCounts = new Map<string, number>();
  static readonly LOCATE_PASSAGE_BUDGET = 3;

  /** Cache the resolved authority text under the citation id. */
  putAuthority(citationId: string, authority: StoredAuthority): void {
    this.authorities.set(citationId, authority);
  }

  /** Retrieve cached authority text by citation id. Returns null if absent. */
  getAuthority(citationId: string): StoredAuthority | null {
    return this.authorities.get(citationId) ?? null;
  }

  /** Whether a citation already has a cached authority (used to skip the resolver). */
  hasAuthority(citationId: string): boolean {
    return this.authorities.has(citationId);
  }

  /**
   * Increment and return the locate_passage call count for a citation.
   * Returns the count AFTER incrementing, so callers compare against
   * LOCATE_PASSAGE_BUDGET to decide whether to allow the call.
   */
  incrementLocateCalls(citationId: string): number {
    const next = (this.locateCallCounts.get(citationId) ?? 0) + 1;
    this.locateCallCounts.set(citationId, next);
    return next;
  }

  locateCallCount(citationId: string): number {
    return this.locateCallCounts.get(citationId) ?? 0;
  }
}
