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
      };
    }

    const resolverResult = await resolver.resolve(citation);

    if (resolverResult.status !== "resolved" || !resolverResult.content) {
      return {
        checkType: "quote_matching",
        result: FINDING_RESULT.UNRESOLVED,
        citationText: citation.text,
        sourceQueried: resolverResult.sourceId,
        isAiAssisted: false,
        detail:
          resolverResult.status === "unresolved"
            ? "Cannot verify quotes: citation unresolved"
            : resolverResult.error ?? "Source failure during quote matching",
      };
    }

    const authorityText = resolverResult.content.toLowerCase();
    const failures: string[] = [];

    for (const quote of relevantQuotes) {
      const innerText = quote.text.slice(1, -1).toLowerCase();
      if (!authorityText.includes(innerText)) {
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
    };
  },
};
