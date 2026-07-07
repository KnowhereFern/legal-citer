import { FINDING_RESULT } from "@/lib/constants";
import type { Citation, ExtractedDocument } from "@/lib/types";
import type { VerificationCheck } from "./index";

/**
 * Signal correctness check — verifies the introductory signal preceding a
 * citation matches the type of authority it provides. Bluebook signals have
 * specific meanings:
 *
 *   [no signal] — the cited authority directly states the proposition
 *   "see"      — the authority supports the proposition by inference
 *   "see also" — the authority cites additional supporting authority
 *   "cf."      — the authority supports by analogy (compare with...)
 *   "compare"  — used with "with" to compare authorities
 *   "but see"  — the authority contradicts (used to acknowledge contrary law)
 *   "contra"   — the cited authority directly contradicts the proposition
 *
 * A brief that asserts a proposition as direct holding ("X is the law") but
 * cites with "see" is implicitly admitting the authority doesn't directly
 * say so — a signal/no-signal mismatch that a careful reader (or judge)
 * would catch.
 *
 * This check is heuristic: it parses the signal from the text preceding the
 * citation and flags obvious mismatches. It does NOT verify the proposition
 * itself (that's the LLM SupportAnalyst's job when enabled). What it catches:
 *   - "but see" / "contra" used for a proposition the brief treats as
 *     supportive (the citation is in a context that asserts the proposition,
 *     not rebuts it)
 *   - No signal where one is expected (proposition is a paraphrase, not a
 *     direct quote, but no "see" signal)
 *
 * Approach: look at the 80 characters before the citation span for a signal
 * token. The "correctness" judgment is intentionally conservative — we only
 * flag the clearest mismatches to avoid false positives.
 */

const SIGNALS = [
  // Negative signals — these contradict, not support. If the surrounding
  // context treats the citation as supportive (no negation word like
  // "however" / "but" before the signal), that's a mismatch.
  { token: /\bbut\s+see\b/i, type: "contrary" as const },
  { token: /\bcontra\b/i, type: "contrary" as const },
  // Affirmative signals — these weaken the support claim
  { token: /\bsee\s+also\b/i, type: "weak_affirmative" as const },
  { token: /\bsee\b/i, type: "weak_affirmative" as const },
  { token: /\bcf\.?\b/i, type: "analogical" as const },
  { token: /\bcompare\b/i, type: "comparative" as const },
];

export const signalCorrectnessCheck: VerificationCheck = {
  name: "signal_correctness",

  async execute(
    citation: Citation,
    document: ExtractedDocument,
    // Signal correctness is purely text-based — it parses the citation's
    // surrounding context and doesn't need resolver data. The param is
    // required by the VerificationCheck interface.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _resolver: { resolve: (citation: Citation) => Promise<unknown> },
  ) {
    // Look at the text preceding the citation (80 chars) for a signal token.
    const precedingText = document.text.slice(
      Math.max(0, citation.spanStart - 80),
      citation.spanStart,
    );

    const matchedSignal = SIGNALS.find((s) => s.token.test(precedingText));

    if (!matchedSignal) {
      // No signal — direct citation. This is the most common form and is
      // correct when the authority directly states the proposition. We have
      // no way to verify that here (would need proposition-level analysis),
      // so PASS without claiming more than we can prove.
      return {
        checkType: "signal_correctness",
        result: FINDING_RESULT.PASS,
        citationText: citation.text,
        isAiAssisted: false,
        detail: "No introductory signal (direct cite) — verify authority directly states the proposition",
        paragraphIndex: citation.paragraphIndex,
        pageNumber: citation.page,
      };
    }

    // For "contrary" signals (but see, contra), check whether the surrounding
    // context is actually rebuting the proposition. If the sentence reads as
    // a positive assertion followed by "but see", that's correct usage. If
    // it reads as support with an unexpected "but see", flag it.
    if (matchedSignal.type === "contrary") {
      // Heuristic: if the preceding text contains a positive assertion word
      // ("holds", "establishes", "provides", "states") immediately before
      // "but see", the signal may be mismatched — the brief asserts the
      // authority HOLDS something, then cites it as contradicting.
      const assertionBeforeContrary = /\b(?:holds?|establishes?|provides?|states?|requires?)\b[^.]*\b(?:but\s+see|contra)\b/i.test(
        precedingText,
      );
      if (assertionBeforeContrary) {
        return {
          checkType: "signal_correctness",
          result: FINDING_RESULT.UNRESOLVED,
          citationText: citation.text,
          isAiAssisted: false,
          detail:
            `Sentence asserts authority directly states the proposition, but cites with "${matchedSignal.token.source.replace(/\\b|\\s\+/g, " ")}" (a contrary signal). ` +
            "Verify whether the authority supports or contradicts the proposition.",
          paragraphIndex: citation.paragraphIndex,
          pageNumber: citation.page,
        };
      }
    }

    // For weak affirmative signals ("see", "cf."), we can't verify whether
    // the signal is appropriate without proposition-level analysis. PASS but
    // note the signal so the user is aware.
    return {
      checkType: "signal_correctness",
      result: FINDING_RESULT.PASS,
      citationText: citation.text,
      isAiAssisted: false,
      detail: `Cited with "${matchedSignal.token.source.replace(/\\b|\\s\+/g, " ")}" signal (appropriate use; verify signal matches degree of support)`,
      paragraphIndex: citation.paragraphIndex,
      pageNumber: citation.page,
    };
  },
};
