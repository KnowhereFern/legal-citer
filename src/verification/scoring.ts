import { CHECK_TYPES, FINDING_RESULT, RISK_BANDS } from "@/lib/constants";
import type { CheckResult, ScoreResult } from "@/lib/types";

export function computeScore(findings: CheckResult[]): ScoreResult {
  const failCount = findings.filter(
    (f) => f.result === FINDING_RESULT.FAIL
  ).length;
  const unresolvedCount = findings.filter(
    (f) => f.result === FINDING_RESULT.UNRESOLVED
  ).length;
  const definitiveCount = findings.filter(
    (f) =>
      f.result === FINDING_RESULT.PASS || f.result === FINDING_RESULT.FAIL
  ).length;

  const uniqueCitations = new Set(
    findings.map((f) => f.citationText).filter(Boolean)
  );
  const citationCount = uniqueCitations.size;

  const quoteIssues = findings.filter(
    (f) =>
      f.checkType === CHECK_TYPES.QUOTE_MATCHING && f.result === FINDING_RESULT.FAIL
  ).length;

  const coveragePct =
    findings.length > 0
      ? Math.round((definitiveCount / findings.length) * 100)
      : 100;

  let riskBand: string;
  if (failCount >= 3) {
    riskBand = RISK_BANDS.CRITICAL;
  } else if (failCount > 0) {
    riskBand = RISK_BANDS.HIGH;
  } else if (unresolvedCount >= 3) {
    riskBand = RISK_BANDS.HIGH;
  } else if (unresolvedCount >= 1) {
    riskBand = RISK_BANDS.MEDIUM;
  } else {
    riskBand = RISK_BANDS.LOW;
  }

  // --- Authority (citation_existence) counts ---
  const existenceFindings = findings.filter(
    (f) => f.checkType === CHECK_TYPES.CITATION_EXISTENCE
  );
  const authoritiesVerified = existenceFindings.filter(
    (f) => f.result === FINDING_RESULT.PASS
  ).length;
  const authoritiesUnresolved = existenceFindings.filter(
    (f) => f.result === FINDING_RESULT.UNRESOLVED
  ).length;

  // --- Quotation counts (exclude not_applicable from "checked") ---
  const quoteFindings = findings.filter(
    (f) => f.checkType === CHECK_TYPES.QUOTE_MATCHING
  );
  const quotationsChecked = quoteFindings.filter(
    (f) => f.result !== FINDING_RESULT.NOT_APPLICABLE
  ).length;
  const quotationsMatched = quoteFindings.filter(
    (f) => f.result === FINDING_RESULT.PASS
  ).length;

  // --- Record-citation counts (undefined when the check never ran) ---
  const recordFindings = findings.filter(
    (f) => f.checkType === CHECK_TYPES.RECORD_CITATION
  );
  const hasRecordCitations = recordFindings.length > 0;
  const recordCitationsChecked = hasRecordCitations
    ? recordFindings.filter((f) => f.result !== FINDING_RESULT.NOT_APPLICABLE).length
    : undefined;
  const recordCitationsUnresolved = hasRecordCitations
    ? recordFindings.filter((f) => f.result === FINDING_RESULT.UNRESOLVED).length
    : undefined;

  return {
    riskBand,
    coveragePct,
    citationCount,
    quoteIssues,
    unresolvedItems: unresolvedCount,
    authoritiesVerified,
    authoritiesUnresolved,
    quotationsChecked,
    quotationsMatched,
    recordCitationsChecked,
    recordCitationsUnresolved,
  };
}
