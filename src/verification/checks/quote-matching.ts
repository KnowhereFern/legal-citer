import { FINDING_RESULT } from "@/lib/constants";
import type {
  Citation,
  ExtractedDocument,
  ResolverResult,
} from "@/lib/types";
import type { VerificationCheck } from "./index";

export const quoteMatchingCheck: VerificationCheck = {
  name: "quote_matching",

  async execute(
    citation: Citation,
    document: ExtractedDocument,
    resolver: {
      resolve: (citation: Citation) => Promise<ResolverResult>;
    }
  ) {
    const relevantQuotes = document.quotedSpans.filter((q) => {
      const dist = Math.abs(q.spanStart - citation.spanStart);
      return dist < 2000;
    });

    if (relevantQuotes.length === 0) {
      return {
        checkType: "quote_matching",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        isAiAssisted: false,
        detail: "No quoted spans found near this citation",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    const resolverResult = await resolver.resolve(citation);

    if (resolverResult.status !== "resolved" || !resolverResult.content) {
      // Same rationale as citation_metadata: if the authority couldn't be
      // resolved, there is no source text to match quotes against. Emit
      // NOT_APPLICABLE, not UNRESOLVED, so a single missed resolution doesn't
      // produce three risk-driving findings for the same citation.
      return {
        checkType: "quote_matching",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Quote check skipped: authority unresolved (see citation existence)"
            : resolverResult.error ?? "Quote check skipped: source failure during lookup",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    // Normalize both sides before matching. Legal authority text and the
    // brief's quotation of it routinely differ in ways that aren't substantive:
    //   - Whitespace: line breaks, multiple spaces, em-spaces (&#x2003;)
    //   - Punctuation: curly vs straight quotes, em-dash vs hyphen, § vs section
    //   - Bracketed alterations: [the defendant] inserted into a quote
    //   - Ellipses: ... or … indicating omitted text
    // The previous exact-substring match would FAIL on any of these, producing
    // false positives on every quote that wasn't a byte-for-byte copy. We
    // normalize to a comparison key: lowercase, strip whitespace, collapse
    // punctuation variants, drop bracketed insertions, and treat ellipses as
    // a wildcard (split on them and require each segment present in order).
    const authorityNorm = normalizeForQuoteMatch(resolverResult.content);

    const failures: string[] = [];

    for (const quote of relevantQuotes) {
      const innerText = quote.text.slice(1, -1);
      const quoteNorm = normalizeForQuoteMatch(innerText);
      if (!quoteMatchesNormalized(quoteNorm, authorityNorm)) {
        failures.push(`Quote not found in authority: "${quote.text.slice(0, 50)}..."`);
      }
    }

    if (failures.length > 0) {
      return {
        checkType: "quote_matching",
        result: FINDING_RESULT.FAIL,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        snippetUsed: relevantQuotes[0].text.slice(0, 200),
        isAiAssisted: false,
        detail: failures.join("; "),
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    return {
      checkType: "quote_matching",
      result: FINDING_RESULT.PASS,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      snippetUsed: relevantQuotes[0].text.slice(0, 200),
      isAiAssisted: false,
      detail: `${relevantQuotes.length} quote(s) matched against authority`,
      paragraphIndex: citation.paragraphIndex,
      pageNumber: citation.page,
    };
  },
};

/**
 * Normalize text for quote matching: lowercase, collapse all whitespace to
 * single spaces, strip typographic-quote variants, normalize dashes, drop
 * bracketed alterations like "[the defendant]", and standardize §/section.
 * Returns a string with no whitespace at all (every non-word char collapsed)
 * so the comparison is robust to line-wrap and pagination artifacts.
 */
function normalizeForQuoteMatch(text: string): string {
  return text
    .toLowerCase()
    // Drop bracketed editorial insertions: "[the defendant]" → ""
    .replace(/\[[^\]]*\]/g, "")
    // Standardize ellipses (… or ... or . . .) to a single token we split on
    .replace(/\s*\.\s*\.\s*\.\s*/g, " \u0000 ")
    .replace(/\u2026/g, " \u0000 ")
    // Normalize dash variants to a single hyphen
    .replace(/[\u2013\u2014\u2212]/g, "-")
    // Normalize curly quotes to straight
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    // Drop all whitespace and remaining non-alphanumeric chars (keeps the
    // comparison purely about the word sequence)
    .replace(/[^a-z0-9\u0000]/g, "");
}

/**
 * Check whether a normalized quote appears in normalized authority text,
 * allowing for ellipsis wildcards. A quote with an ellipsis splits into
 * segments; each segment must appear in the authority in order (not
 * necessarily adjacent), which models the legal meaning of "..." (omitted
 * text) without letting a quote span unrelated passages.
 */
function quoteMatchesNormalized(quoteNorm: string, authorityNorm: string): boolean {
  if (!quoteNorm) return true;
  // No ellipsis → simple substring check
  if (!quoteNorm.includes("\u0000")) {
    return authorityNorm.includes(quoteNorm);
  }
  // Ellipsis present → split on the wildcard, require each segment present
  // in order (allowing any text between, including nothing).
  const segments = quoteNorm.split("\u0000").filter((s) => s.length > 0);
  if (segments.length === 0) return true;
  let searchFrom = 0;
  for (const segment of segments) {
    const idx = authorityNorm.indexOf(segment, searchFrom);
    if (idx === -1) return false;
    searchFrom = idx + segment.length;
  }
  return true;
}
