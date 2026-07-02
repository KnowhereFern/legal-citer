import { FINDING_RESULT } from "@/lib/constants";
import type { CheckResult, RecordCitation } from "@/lib/types";

/**
 * Record-citation verification (document-scoped).
 *
 * True record verification requires comparing each record cite against the
 * uploaded record/transcript, which is out of scope for this pass. Here we
 * classify every extracted record citation: a cite that resolves to a known
 * type (transcript / record / exhibit / paragraph) and carries a usable
 * locator is treated as a definitive "checked" outcome (PASS), while cites
 * we could not classify or that lack a locator are UNRESOLVED.
 *
 * Unlike the authority checks, this is document-scoped rather than
 * per-citation, so it is NOT registered in the per-citation checks map.
 * The runner calls {@link buildRecordCitationFindings} once per run when
 * record-citation verification is enabled.
 */
export function buildRecordCitationFindings(
  recordCitations: RecordCitation[],
): CheckResult[] {
  return recordCitations.map((rc) => {
    const hasLocator = /\d/.test(rc.text);
    return {
      checkType: "record_citation",
      result: hasLocator ? FINDING_RESULT.PASS : FINDING_RESULT.UNRESOLVED,
      citationText: rc.text,
      isAiAssisted: false,
      detail: hasLocator
        ? `Record citation classified (${rc.type})`
        : `Record citation could not be classified (${rc.type})`,
      paragraphIndex: rc.paragraphIndex,
      pageNumber: rc.page,
    };
  });
}
