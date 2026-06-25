import { FINDING_RESULT } from "@/lib/constants";
import type { CheckResult } from "@/lib/types";

export async function analyzePropositionSupport(params: {
  citation: Record<string, unknown>;
  quoteText: string;
  resolvedContent: string;
}): Promise<CheckResult> {
  return {
    checkType: "proposition_support_analysis",
    result: FINDING_RESULT.NOT_APPLICABLE,
    citationText: typeof params.citation?.text === "string" ? params.citation.text : undefined,
    isAiAssisted: false,
    detail:
      "Proposition support analysis is experimental and case-law only. Not evaluated in MVP.",
  };
}
