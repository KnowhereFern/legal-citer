import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import type { VerificationCheck } from "./index";

export const citationExistenceCheck: VerificationCheck = {
  name: "citation_existence",

  async execute(
    citation: Citation,
    _document: ExtractedDocument,
    resolver: {
      resolve: (citation: Citation) => Promise<ResolverResult>;
    }
  ) {
    const resolverResult = await resolver.resolve(citation);

    const resultMap: Record<string, import("@/lib/constants").FindingResult> = {
      resolved: FINDING_RESULT.PASS,
      unresolved: FINDING_RESULT.UNRESOLVED,
      source_failure: FINDING_RESULT.ERROR,
    };

    return {
      checkType: "citation_existence",
      result: resultMap[resolverResult.status] ?? FINDING_RESULT.ERROR,
      citationText: citation.text,
      sourceQueried: resolverResult.sourceId,
      isAiAssisted: false,
      detail:
        resolverResult.status === "resolved"
          ? "Citation resolved successfully"
          : resolverResult.status === "unresolved"
            ? "Citation could not be resolved"
            : resolverResult.error ?? "Source lookup failed",
    };
  },
};
