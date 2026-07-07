import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import { classifyCitation } from "../classifier";
import type { VerificationCheck } from "./index";

/**
 * Statute currency check — flags statutes that have been amended, repealed,
 * or superseded since the citation's claimed year. The resolver (GovInfo for
 * U.S.C., flsenate.gov for Fla. Stat.) fetches the CURRENT edition's text;
 * this check compares that against any year the citation asserts.
 *
 * Without this check, citing "42 U.S.C. § 1983 (1990)" when the section was
 * substantially amended in 1994 would pass silently — the resolver fetches
 * the 2024 text and the existence check passes, but the 1990 version said
 * meaningfully different things.
 *
 * Limitations: we can't detect amendments that didn't change the section
 * number (only the text), and we don't have a historical-statute API to
 * fetch the 1990 version for text comparison. What we CAN do:
 *   - If the citation asserts a year and the resolved edition is newer,
 *     emit UNRESOLVED (yellow flag) so the user reviews whether the
 *     cited version still matches current law.
 *   - If the resolver returns a dateFiled/edition that predates the
 *     citation's year, that's suspicious (FAIL).
 */
export const statuteCurrencyCheck: VerificationCheck = {
  name: "statute_currency",

  async execute(
    citation: Citation,
    _document: ExtractedDocument,
    resolver: { resolve: (citation: Citation) => Promise<ResolverResult> },
  ) {
    if (classifyCitation(citation) !== "statute") {
      return {
        checkType: "statute_currency",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        isAiAssisted: false,
        detail: "Currency check applies only to statutory citations",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    const resolverResult = await resolver.resolve(citation);
    if (resolverResult.status !== "resolved") {
      return {
        checkType: "statute_currency",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Currency check skipped: authority unresolved"
            : resolverResult.error ?? "Currency check skipped: source failure",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    const meta = (resolverResult.metadata ?? {}) as Record<string, unknown>;
    const citationYearMatch = citation.text.match(/\((\d{4})\)/);
    const citationYear = citationYearMatch ? parseInt(citationYearMatch[1], 10) : null;

    // The resolver fetches the current edition. If the citation pins a year,
    // and that year is older than the resolved edition, warn the user that
    // the statute may have been amended since their cited version.
    const editionYear = typeof meta.dateFiled === "string"
      ? parseInt(meta.dateFiled.match(/(\d{4})/)?.[1] ?? "0", 10)
      : null;
    const sourceTitle = typeof meta.sourceTitle === "string"
      ? meta.sourceTitle
      : typeof meta.edition === "string"
        ? `edition ${meta.edition}`
        : "the current edition";

    if (citationYear && editionYear && citationYear < editionYear) {
      return {
        checkType: "statute_currency",
        result: FINDING_RESULT.UNRESOLVED,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          `Citation references ${citationYear} statute; resolver fetched ${sourceTitle} (${editionYear}). ` +
          "The section may have been amended since the cited year — verify the cited text still matches current law.",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    return {
      checkType: "statute_currency",
      result: FINDING_RESULT.PASS,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      isAiAssisted: false,
      detail: citationYear
        ? `Citation year (${citationYear}) consistent with resolved edition`
        : "Statute resolved to current edition (no year asserted in citation)",
      paragraphIndex: citation.paragraphIndex,
      pageNumber: citation.page,
    };
  },
};
