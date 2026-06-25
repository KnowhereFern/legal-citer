import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import type { VerificationCheck } from "./index";

const YEAR_PATTERN = /\((\d{4})\)/;
const REPORTER_PATTERN =
  /(U\.S\.|F\.(2d|3d|4th)|S\.Ct\.|L\.Ed\.|U\.S\.C\.|[A-Z]{2,}\.(?:S\.(?:2d|3d|4th))?)/;
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

    if (resolverResult.status !== "resolved" || !resolverResult.metadata) {
      return {
        checkType: "citation_metadata",
        result: FINDING_RESULT.UNRESOLVED,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Cannot validate metadata: citation unresolved"
            : resolverResult.error ?? "Source failure during metadata lookup",
      };
    }

    const issues: string[] = [];
    const meta = resolverResult.metadata as Record<string, unknown>;

    const yearMatch = citation.text.match(YEAR_PATTERN);
    if (yearMatch && meta.year && yearMatch[1] !== String(meta.year)) {
      issues.push(
        `Year mismatch: citation says ${yearMatch[1]}, authority says ${meta.year}`
      );
    }

    const hasReporter = REPORTER_PATTERN.test(citation.text);
    if (hasReporter && meta.reporter === undefined) {
      issues.push("Citation contains reporter but authority has no reporter metadata");
    }

    const hasCourt = COURT_PATTERN.test(citation.text);
    if (hasCourt && meta.court === undefined) {
      issues.push("Citation references court but authority has no court metadata");
    }

    if (issues.length > 0) {
      return {
        checkType: "citation_metadata",
        result: FINDING_RESULT.FAIL,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail: issues.join("; "),
      };
    }

    return {
      checkType: "citation_metadata",
      result: FINDING_RESULT.PASS,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      isAiAssisted: false,
      detail: "Citation metadata consistent with authority",
    };
  },
};
