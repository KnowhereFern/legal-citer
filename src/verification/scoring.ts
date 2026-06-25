import { FINDING_RESULT, RISK_BANDS } from "@/lib/constants";
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
      f.checkType === "quote_matching" && f.result === FINDING_RESULT.FAIL
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

  return {
    riskBand,
    coveragePct,
    citationCount,
    quoteIssues,
    unresolvedItems: unresolvedCount,
  };
}
