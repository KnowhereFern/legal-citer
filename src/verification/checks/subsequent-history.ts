import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import type { VerificationCheck } from "./index";

/**
 * Subsequent history / "good law" check — the legal-product equivalent of
 * Shepard's / KeyCite. Confirms a cited case hasn't been overruled, vacated,
 * superseded, or otherwise drained of precedential value by a later decision.
 *
 * Without this check, the product can verify a citation EXISTS and its
 * METADATA matches, but silently green-lights cases that have been explicitly
 * overturned — the single most dangerous false-negative for a legal brief
 * reviewer.
 *
 * Signals consulted (in priority order):
 *   1. Opinion text annotations — CourtListener opinion bodies frequently
 *      contain editorial notes like "Overruled by …" / "Superseded by …".
 *      These are the strongest, most specific signals.
 *   2. precedential_status — "Unpublished" / "Non-Precedential" opinions are
 *      not binding authority; citing them as such is at least a yellow flag.
 *
 * Note on what CourtListener does NOT expose: there is no top-level
 * `overruled_by` field on the cluster or opinion. The full treatment graph
 * (Shepard's-equivalent red/yellow flags) is computed by proprietary services
 * (LexisNexis KeyCite, Westlaw KeyCite) and is not freely available via API.
 * This check is therefore conservative: it surfaces the signals that ARE
 * available, and avoids claiming a case is "good law" when we can't confirm
 * its subsequent history — the absence of a detected annotation does NOT
 * mean the case is in the clear.
 */
export const subsequentHistoryCheck: VerificationCheck = {
  name: "subsequent_history",

  async execute(
    citation: Citation,
    _document: ExtractedDocument,
    resolver: {
      resolve: (citation: Citation) => Promise<ResolverResult>;
    },
  ) {
    const resolverResult = await resolver.resolve(citation);
    const meta = (resolverResult.metadata ?? {}) as Record<string, unknown>;
    const canonical = {
      canonicalCitation: typeof meta.citation === "string" ? meta.citation : undefined,
      canonicalCaseName: typeof meta.caseName === "string" ? meta.caseName : undefined,
      canonicalCourt: typeof meta.court === "string" ? meta.court : undefined,
      paragraphIndex: citation.paragraphIndex,
      pageNumber: citation.page,
    };

    // Same prerequisite handling as the other checks: if the authority didn't
    // resolve, there's no way to inspect its subsequent history. NOT_APPLICABLE
    // (not UNRESOLVED) so a single failed resolution doesn't triple-inflate
    // the unresolved count.
    if (resolverResult.status !== "resolved") {
      return {
        checkType: "subsequent_history",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Subsequent-history check skipped: authority unresolved (see citation existence)"
            : resolverResult.error ?? "Subsequent-history check skipped: source failure during lookup",
        ...canonical,
      };
    }

    const issues: string[] = [];

    // 1. Scan the resolved opinion text for explicit subsequent-history
    // annotations. These are the editorial notes that CourtListener (and the
    // upstream case-law reporters) insert when a case is treated:
    //   "Overruled in part by Smith v. Jones, 500 U.S. 1 (2020)"
    //   "Superseded by statute as stated in …"
    //   "Abrogated by …"
    //   "Vacated by …"
    //   "Reversed by …"
    //   "Distinguished by …" (yellow flag, not red — we still flag it)
    //
    // We match case-insensitively at word boundaries. The phrases are ordered
    // roughly by severity (overruled > vacated > superseded/abrogated >
    // reversed > distinguished/criticized).
    const content = resolverResult.content ?? "";
    const TREATMENT_PATTERNS: Array<{ pattern: RegExp; severity: "red" | "yellow"; label: string }> = [
      { pattern: /\boverruled\s+(?:in\s+part\s+)?by\b/i, severity: "red", label: "Overruled" },
      { pattern: /\babrogated\s+by\b/i, severity: "red", label: "Abrogated" },
      { pattern: /\bvacated\s+by\b/i, severity: "red", label: "Vacated" },
      { pattern: /\breversed\s+and\s+remanded\b/i, severity: "yellow", label: "Reversed and remanded" },
      { pattern: /\bsuperseded\s+by\b/i, severity: "red", label: "Superseded" },
      { pattern: /\bdistinguished\s+by\b/i, severity: "yellow", label: "Distinguished" },
      { pattern: /\bcriticized\s+by\b/i, severity: "yellow", label: "Criticized" },
      { pattern: /\blimited\s+by\b/i, severity: "yellow", label: "Limited" },
    ];

    for (const { pattern, severity, label } of TREATMENT_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        // Capture a short window around the annotation so the user can see
        // which later case did the overruling.
        const start = Math.max(0, match.index! - 40);
        const end = Math.min(content.length, match.index! + match[0].length + 80);
        const snippet = content.slice(start, end).replace(/\s+/g, " ").trim();
        issues.push(
          `${label} (${severity === "red" ? "red flag" : "yellow flag"}): "${snippet}"`,
        );
      }
    }

    // 2. precedential_status flag. Unpublished / non-precedential opinions
    // are not binding; citing them as binding authority is at minimum a
    // yellow flag and sometimes a red one depending on jurisdiction rules.
    const status = typeof meta.precedentialStatus === "string"
      ? meta.precedentialStatus.toLowerCase()
      : "";
    if (status && (status.includes("unpublished") || status.includes("non-preced"))) {
      issues.push(
        `Opinion is ${meta.precedentialStatus as string} — not binding authority in most jurisdictions`,
      );
    }

    if (issues.some((_, i, arr) => arr[i].includes("red flag"))) {
      // A red flag (overruled/vacated/abrogated/superseded) is a FAIL — the
      // citation should not be relied on as good law.
      return {
        checkType: "subsequent_history",
        result: FINDING_RESULT.FAIL,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail: issues.join("; "),
        ...canonical,
      };
    }

    if (issues.length > 0) {
      // Only yellow flags — warn but don't hard-fail.
      return {
        checkType: "subsequent_history",
        result: FINDING_RESULT.UNRESOLVED,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail: `Citation has treatment flags worth reviewing: ${issues.join("; ")}`,
        ...canonical,
      };
    }

    // No annotations detected. NB: this is NOT a guarantee the case is good
    // law — CourtListener doesn't expose the full treatment graph, and an
    // overruling annotation may simply be absent from the text we fetched.
    // We PASS (the case is published and no negative treatment was detected
    // in the available signals) but the detail makes the limitation explicit
    // so users don't read it as a clean bill of health.
    return {
      checkType: "subsequent_history",
      result: FINDING_RESULT.PASS,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      isAiAssisted: false,
      detail:
        "No negative subsequent history detected in available signals (treatment graph not fully covered)",
      ...canonical,
    };
  },
};
