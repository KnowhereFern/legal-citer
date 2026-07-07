import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import { classifyCitation } from "../classifier";
import type { VerificationCheck } from "./index";

const YEAR_PATTERN = /\((\d{4})\)/;

// Case-law reporters (not U.S.C. — the United States Code is a statute
// collection, not a reporter, and statutes carry no court). Only citations
// classified as case_law are expected to have these in authority metadata.
const REPORTER_PATTERN =
  /(U\.S\.|F\.(2d|3d|4th)|S\.Ct\.|L\.Ed\.|[A-Z]{2,}\.(?:S\.(?:2d|3d|4th))?)/;
const COURT_PATTERN =
  /(Supreme Court|Circuit|District|Court of Appeals|S\.Ct\.|U\.S\.)/i;

export const citationMetadataCheck: VerificationCheck = {
  name: "citation_metadata",

  async execute(
    citation: Citation,
    _document: ExtractedDocument,
    resolver: {
      resolve: (citation: Citation) => Promise<ResolverResult>;
    }
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

    if (resolverResult.status !== "resolved" || !resolverResult.metadata) {
      // When the authority itself couldn't be resolved, there is no metadata
      // to compare against. This is a prerequisite failure, not a finding
      // against the citation — emit NOT_APPLICABLE so unresolvedCount (a risk
      // driver in computeScore) isn't triple-inflated. The citation_existence
      // check is the single source of truth for "authority unresolved."
      return {
        checkType: "citation_metadata",
        result: FINDING_RESULT.NOT_APPLICABLE,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Metadata check skipped: authority unresolved (see citation existence)"
            : resolverResult.error ?? "Metadata check skipped: source failure during lookup",
        ...canonical,
      };
    }

    const issues: string[] = [];

    const yearMatch = citation.text.match(YEAR_PATTERN);
    if (yearMatch && meta.year && yearMatch[1] !== String(meta.year)) {
      issues.push(
        `Year mismatch: citation says ${yearMatch[1]}, authority says ${meta.year}`
      );
    }

    // Reporter / court / volume / page / party-name are case-law concepts.
    // A U.S.C. citation has no reporter (the "U.S.C." token isn't one) and
    // no court (statutes are enacted by Congress, not decided by one), so
    // demanding them produces a false FAIL on every statute. Only enforce
    // their presence for case law.
    if (classifyCitation(citation) === "case_law") {
      // --- Reporter: presence + value comparison ---
      // Previously this check only verified the resolver RETURNED a reporter
      // field; it never compared the value. Citing "565 U.S. 368" when the
      // case is actually at "74 F.4th 1336" would pass. Now we compare.
      const citeReporter = citation.text.match(REPORTER_PATTERN)?.[0];
      if (citeReporter && meta.reporter === undefined) {
        issues.push("Citation contains reporter but authority has no reporter metadata");
      } else if (
        citeReporter &&
        typeof meta.reporter === "string" &&
        !normalizeReporter(citeReporter).includes(normalizeReporter(meta.reporter)) &&
        !normalizeReporter(meta.reporter).includes(normalizeReporter(citeReporter))
      ) {
        issues.push(
          `Reporter mismatch: citation uses "${citeReporter}", authority says "${meta.reporter}"`,
        );
      }

      // --- Volume + page: parse from citation, compare to canonical ---
      // The canonical citation (from CourtListener) is the authoritative
      // "{vol} {reporter} {page}" form. If the brief cites a different
      // volume or page for the same case, that's a mis-citation.
      const citeVolPage = citation.text.match(/(\d+)\s+[A-Z][A-Za-z0-9.]+\s+(\d+)/);
      const canonicalVolPage = typeof meta.citation === "string"
        ? meta.citation.match(/(\d+)\s+[A-Z][A-Za-z0-9.]+\s+(\d+)/)
        : null;
      if (citeVolPage && canonicalVolPage) {
        if (citeVolPage[1] !== canonicalVolPage[1]) {
          issues.push(
            `Volume mismatch: citation says vol. ${citeVolPage[1]}, authority says vol. ${canonicalVolPage[1]}`,
          );
        }
        // Only flag page mismatch when the reporter ALSO matches — otherwise
        // we'd be comparing page numbers across different reporters, which is
        // meaningless. Same reporter + different page = transposed digits or
        // a wrong pinpoint, both worth flagging.
        if (
          citeVolPage[1] === canonicalVolPage[1] &&
          citeVolPage[2] !== canonicalVolPage[2]
        ) {
          issues.push(
            `Page mismatch: citation says p. ${citeVolPage[2]}, authority says p. ${canonicalVolPage[2]}`,
          );
        }
      }

      // --- Party name accuracy ---
      // The brief's "Mims v. Arrowhead" vs the canonical "Mims v. Arrow
      // Financial Services, LLC" — a real mis-citation the previous check
      // would have missed entirely. We compare the FIRST party token (last
      // name of first party) since party names appear in many abbreviated
      // forms and exact comparison would over-flag.
      const citeParties = citation.text.match(/^([A-Z][A-Za-z.'\-]+)\s+v\.\s([A-Z][A-Za-z.'\-]+)/);
      const canonicalName = typeof meta.caseName === "string" ? meta.caseName : "";
      if (citeParties && canonicalName) {
        const firstPartyCited = citeParties[1].toLowerCase();
        const firstPartyCanonical = canonicalName.split(/\s+v\.\s/)[0]?.toLowerCase() ?? "";
        // Match if the cited token is a prefix of the canonical, or vice
        // versa ("Arrow" matches "Arrow Financial"; "Arrowhead" does NOT
        // match "Arrow Financial" — that's a real mis-citation).
        if (
          firstPartyCanonical &&
          !firstPartyCited.startsWith(firstPartyCanonical.slice(0, 4)) &&
          !firstPartyCanonical.startsWith(firstPartyCited.slice(0, 4))
        ) {
          issues.push(
            `Party name mismatch: citation says "${citeParties[1]}", authority says "${canonicalName.split(/\s+v\.\s/)[0]}"`,
          );
        }
      }

      const hasCourt = COURT_PATTERN.test(citation.text);
      if (hasCourt && meta.court === undefined) {
        issues.push("Citation references court but authority has no court metadata");
      }
    }

    if (issues.length > 0) {
      return {
        checkType: "citation_metadata",
        result: FINDING_RESULT.FAIL,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail: issues.join("; "),
        ...canonical,
      };
    }

    return {
      checkType: "citation_metadata",
      result: FINDING_RESULT.PASS,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      isAiAssisted: false,
      detail: "Citation metadata consistent with authority",
      ...canonical,
    };
  },
};

/**
 * Normalize a reporter string for fuzzy comparison. "F.3d" / "F. 3d" / "f3d"
 * should all compare equal. Strips spaces, periods, and lowercases.
 */
function normalizeReporter(reporter: string): string {
  return reporter.toLowerCase().replace(/[\s.]/g, "");
}
