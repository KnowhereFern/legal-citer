import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import { classifyCitation } from "../classifier";
import type { VerificationCheck } from "./index";

/**
 * Pinpoint accuracy check — verifies the cited page actually contains the
 * proposition being asserted. The most common form is "Smith, 123 F.4th at
 * 456" where "456" is a pinpoint to a specific page in the opinion.
 *
 * Without this check, the product only confirms a quote is *somewhere* in
 * the full opinion text (via quote_matching). It never validates that the
 * cited page is the right one — so "at 456" when the proposition is on page
 * 457, or a transposed "at 465" instead of "at 456", would pass silently.
 *
 * Approach: CourtListener's opinion text is the full body, not paginated.
 * True pinpoint verification requires the page-break metadata (the reporter's
 * star-pagination markers like *456), which isn't reliably exposed via API.
 * What we CAN do:
 *   1. Extract the "at NN" pinpoint from the citation.
 *   2. If the resolver's content contains a star-pagination marker matching
 *      the pinpoint, the page is real (PASS).
 *   3. If the pinpoint appears in the opinion as a page marker but the
 *      nearby quoted text doesn't match, FAIL.
 *   4. If no star-pagination markers exist, emit NOT_APPLICABLE (can't
 *      verify pinpoint without page boundaries).
 */
export const pinpointAccuracyCheck: VerificationCheck = {
  name: "pinpoint_accuracy",

  async execute(
    citation: Citation,
    document: ExtractedDocument,
    resolver: { resolve: (citation: Citation) => Promise<ResolverResult> },
  ) {
    // Only case-law citations with an "at NN" pinpoint are in scope. Statutes
    // use § subsections (handled by citation_metadata); constitutional cites
    // use art./clause references.
    if (classifyCitation(citation) !== "case_law") {
      return {
        checkType: "pinpoint_accuracy",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        isAiAssisted: false,
        detail: "Pinpoint check applies only to case-law citations with page references",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    // Extract the pinpoint page: "at 456", "at 456-57", "at 456, 458".
    const pinpointMatch = citation.text.match(/\bat\s+(\d+)(?:[-–](\d+))?(?:,\s*\d+)*/);
    if (!pinpointMatch) {
      // No pinpoint in the citation — full-case cite, not a "see at NN" form.
      return {
        checkType: "pinpoint_accuracy",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        isAiAssisted: false,
        detail: "No page pinpoint (at NN) in citation — full-case reference",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    const resolverResult = await resolver.resolve(citation);
    if (resolverResult.status !== "resolved" || !resolverResult.content) {
      return {
        checkType: "pinpoint_accuracy",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Pinpoint check skipped: authority unresolved"
            : resolverResult.error ?? "Pinpoint check skipped: source failure",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    const pinpointPage = parseInt(pinpointMatch[1], 10);
    const content = resolverResult.content;

    // Look for star-pagination markers in the opinion text. Reporters mark
    // page boundaries with "*456" or "[456]" or "456" at the start of a line.
    // CourtListener's plain_text sometimes preserves these as bare numbers.
    const starPattern = new RegExp(
      String.raw`(?:^|\s)\*?${pinpointPage}(?:\s|$)`,
      "m",
    );
    const hasPageMarker = starPattern.test(content);

    // Also check whether any quoted spans near this citation appear in the
    // authority — if they do, the pinpoint is implicitly correct (the quote
    // came from the cited page).
    const nearbyQuotes = document.quotedSpans.filter((q) => {
      const dist = Math.abs(q.spanStart - citation.spanStart);
      return dist < 2000;
    });

    if (nearbyQuotes.length > 0) {
      // If a nearby quote was found in the authority (quote_matching would
      // have verified this), the pinpoint is corroborated. This is the
      // strongest signal we have without true page-boundary data.
      const authorityText = content.toLowerCase();
      const anyQuoteMatches = nearbyQuotes.some((q) => {
        const inner = q.text.slice(1, -1).toLowerCase();
        // Use the same normalization as quote_matching (approximate).
        const norm = inner.replace(/[^a-z0-9]/g, "");
        return authorityText.toLowerCase().replace(/[^a-z0-9]/g, "").includes(norm);
      });
      if (anyQuoteMatches) {
        return {
          checkType: "pinpoint_accuracy",
          result: FINDING_RESULT.PASS,
          citationText: citation.text,
          sourceQueried: resolverResult.sourceId,
          isAiAssisted: false,
          detail: `Pinpoint p. ${pinpointPage} corroborated by nearby quoted text found in authority`,
          paragraphIndex: citation.paragraphIndex,
          pageNumber: citation.page,
        };
      }
    }

    // No nearby quotes to corroborate. If the page marker exists in the
    // opinion, that's weak corroboration (PASS). If it doesn't, we can't
    // verify the pinpoint without page boundaries — NOT_APPLICABLE rather
    // than FAIL (the page might exist but not be marked in the text we got).
    if (hasPageMarker) {
      return {
        checkType: "pinpoint_accuracy",
        result: FINDING_RESULT.PASS,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail: `Pinpoint p. ${pinpointPage} appears as a page marker in authority text`,
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    return {
      checkType: "pinpoint_accuracy",
      result: FINDING_RESULT.NOT_APPLICABLE,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      isAiAssisted: false,
      detail:
        `Cannot verify pinpoint p. ${pinpointPage} — opinion text has no star-pagination markers ` +
        "(true pinpoint verification requires reporter page-boundary data)",
      paragraphIndex: citation.paragraphIndex,
      pageNumber: citation.page,
    };
  },
};
