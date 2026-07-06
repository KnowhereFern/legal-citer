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

    // Reporter / court are case-law concepts. A U.S.C. citation has no
    // reporter (the "U.S.C." token isn't one) and no court (statutes are
    // enacted by Congress, not decided by one), so demanding them produces a
    // false FAIL on every statute. Only enforce their presence for case law.
    if (classifyCitation(citation) === "case_law") {
      const hasReporter = REPORTER_PATTERN.test(citation.text);
      if (hasReporter && meta.reporter === undefined) {
        issues.push("Citation contains reporter but authority has no reporter metadata");
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
