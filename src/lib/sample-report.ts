import { generateFilingBlock } from "@/lib/filing-block";
import { buildReportData, type ReportData } from "@/lib/report-data";
import { FINDING_RESULT } from "@/lib/constants";

/**
 * Static, self-contained sample verification report. Used only by the public
 * /sample landing route to show prospective users what a report looks like.
 *
 * Every value below is fictional. The findings are fed through the REAL
 * buildReportData() + generateFilingBlock() transforms so the rendered sample
 * is always structurally consistent with a genuine report (counts, risk band,
 * final status, filing block all derived from the same code path).
 */

const SAMPLE_RUN_ID = "ck_sample_run_0X4mZq7rT2vB8sL3kH9nW4";
const SAMPLE_REPORT_ID = "ck_sample_rpt_2P9aKx1cVb6dFg3jY7mN5";
const SAMPLE_DOCUMENT_HASH =
  "9f1c4a8e2b7d6035fa48c10e2b9d7651c3f0a842e6b5d9037c1fa48c10e2b9d7";
const SAMPLE_GENERATED_AT = "2026-06-28T14:22:11.000Z";

type SampleFinding = {
  id: string;
  checkType: string;
  result: string;
  citationText: string | null;
  sourceQueried: string | null;
  snippetUsed: string | null;
  reviewerState: string | null;
  detail: string | null;
  canonicalCitation: string | null;
  canonicalCaseName: string | null;
  canonicalCourt: string | null;
  paragraphIndex: number | null;
  pageNumber: number | null;
  createdAt: Date;
};

/**
 * The mock findings. One resolved-but-acknowledged exception (a mismatched
 * quote the reviewer accepted) plus one still-open unresolved citation, so the
 * sample shows a realistic "CLEARED WITH DISCLOSED EXCEPTIONS" report with an
 * exceptions list and a populated appendix — the most informative state to
 * preview. Replace freely; counts/final status recompute automatically.
 */
const SAMPLE_FINDINGS: SampleFinding[] = [
  {
    id: "f1",
    checkType: "citation_existence",
    result: FINDING_RESULT.PASS,
    citationText: "Smith v. Jones, 123 So. 3d 456 (Fla. 2021)",
    sourceQueried: "CourtListener",
    snippetUsed: null,
    reviewerState: "unreviewed",
    detail: "Authority located in source database.",
    canonicalCitation: "123 So. 3d 456",
    canonicalCaseName: "Smith v. Jones",
    canonicalCourt: "Supreme Court of Florida",
    paragraphIndex: 4,
    pageNumber: 1,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f1b",
    checkType: "citation_metadata",
    result: FINDING_RESULT.PASS,
    citationText: "Smith v. Jones, 123 So. 3d 456 (Fla. 2021)",
    sourceQueried: "CourtListener",
    snippetUsed: null,
    reviewerState: "unreviewed",
    detail: "Court, reporter, and year all matched.",
    canonicalCitation: "123 So. 3d 456",
    canonicalCaseName: "Smith v. Jones",
    canonicalCourt: "Supreme Court of Florida",
    paragraphIndex: 4,
    pageNumber: 1,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f1c",
    checkType: "quote_matching",
    result: FINDING_RESULT.PASS,
    citationText: "Smith v. Jones, 123 So. 3d 456 (Fla. 2021)",
    sourceQueried: "CourtListener",
    snippetUsed: "\u201Ctrial courts are afforded broad discretion\u201D",
    reviewerState: "unreviewed",
    detail: "Quotation matched the source opinion verbatim.",
    canonicalCitation: null,
    canonicalCaseName: null,
    canonicalCourt: null,
    paragraphIndex: 4,
    pageNumber: 1,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f2",
    checkType: "citation_existence",
    result: FINDING_RESULT.PASS,
    citationText: "Fla. Stat. § 768.81 (2023)",
    sourceQueried: "GovInfo (state legislature)",
    snippetUsed: null,
    reviewerState: "unreviewed",
    detail: "Statute located; current version confirmed.",
    canonicalCitation: "Fla. Stat. § 768.81",
    canonicalCaseName: null,
    canonicalCourt: null,
    paragraphIndex: 7,
    pageNumber: 2,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f2b",
    checkType: "citation_metadata",
    result: FINDING_RESULT.PASS,
    citationText: "Fla. Stat. § 768.81 (2023)",
    sourceQueried: "GovInfo (state legislature)",
    snippetUsed: null,
    reviewerState: "unreviewed",
    detail: "Section and year matched.",
    canonicalCitation: "Fla. Stat. § 768.81",
    canonicalCaseName: null,
    canonicalCourt: null,
    paragraphIndex: 7,
    pageNumber: 2,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f3",
    checkType: "citation_existence",
    result: FINDING_RESULT.PASS,
    citationText: "Kalin v. State, 298 So. 3d 1152 (Fla. 4th DCA 2020)",
    sourceQueried: "CourtListener",
    snippetUsed: null,
    reviewerState: "unreviewed",
    detail: "Authority located in source database.",
    canonicalCitation: "298 So. 3d 1152",
    canonicalCaseName: "Kalin v. State",
    canonicalCourt: "FL Court of Appeal, 4th District",
    paragraphIndex: 12,
    pageNumber: 3,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f3c",
    checkType: "quote_matching",
    result: FINDING_RESULT.FAIL,
    citationText: "Kalin v. State, 298 So. 3d 1152 (Fla. 4th DCA 2020)",
    sourceQueried: "CourtListener",
    snippetUsed: "\u201Ccomparative negligence applies to all negligence claims\u201D",
    reviewerState: "acknowledged",
    detail:
      "Quotation did not match the source. The located opinion reads \u201Ccomparative negligence applies in negligence actions\u201D — reviewer accepted as a fair paraphrase.",
    canonicalCitation: null,
    canonicalCaseName: null,
    canonicalCourt: null,
    paragraphIndex: 12,
    pageNumber: 3,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
  {
    id: "f4",
    checkType: "citation_existence",
    result: FINDING_RESULT.UNRESOLVED,
    citationText: "In re Verified Petition of Doe, 456 F. Supp. 3d 789 (S.D. Fla. 2022)",
    sourceQueried: "PACER",
    snippetUsed: null,
    reviewerState: "unreviewed",
    detail:
      "Could not confirm this authority. PACER lookup returned no matching opinion; a paywall or sealing may apply. Flagged for manual review.",
    canonicalCitation: null,
    canonicalCaseName: null,
    canonicalCourt: null,
    paragraphIndex: 18,
    pageNumber: 4,
    createdAt: new Date(SAMPLE_GENERATED_AT),
  },
];

function uniqueCitationCount(findings: SampleFinding[]): number {
  return new Set(findings.map((f) => f.citationText).filter(Boolean)).size;
}

function countBy(
  findings: SampleFinding[],
  checkType: string,
  result?: string
): number {
  return findings.filter(
    (f) => f.checkType === checkType && (result ? f.result === result : true)
  ).length;
}

export function buildSampleReportData(): ReportData {
  const authoritiesExtracted = uniqueCitationCount(SAMPLE_FINDINGS);
  const authoritiesVerified = countBy(
    SAMPLE_FINDINGS,
    "citation_existence",
    FINDING_RESULT.PASS
  );
  const authoritiesUnresolved = countBy(
    SAMPLE_FINDINGS,
    "citation_existence",
    FINDING_RESULT.UNRESOLVED
  );
  const quotationsChecked = SAMPLE_FINDINGS.filter(
    (f) =>
      f.checkType === "quote_matching" &&
      f.result !== FINDING_RESULT.NOT_APPLICABLE
  ).length;
  const quotationsMatched = countBy(
    SAMPLE_FINDINGS,
    "quote_matching",
    FINDING_RESULT.PASS
  );

  // Coverage = definitive (pass|fail) checks / total checks.
  const totalChecks = SAMPLE_FINDINGS.length;
  const definitive = SAMPLE_FINDINGS.filter(
    (f) => f.result === FINDING_RESULT.PASS || f.result === FINDING_RESULT.FAIL
  ).length;
  const coveragePct = totalChecks > 0 ? (definitive / totalChecks) * 100 : 100;

  // Risk band: one acknowledged fail ⇒ "high" band by the real rule, but this
  // sample is a representative post-review state, so we surface the band the
  // real scorer would assign from the raw fail count.
  const failCount = countBy(SAMPLE_FINDINGS, "quote_matching", FINDING_RESULT.FAIL);
  const riskBand =
    failCount >= 3 ? "critical" : failCount > 0 ? "high" : authoritiesUnresolved >= 3 ? "high" : authoritiesUnresolved >= 1 ? "medium" : "low";

  const filingBlock = generateFilingBlock({
    jurisdictionKey: "florida_rule_2515",
    documentTitle: "Plaintiff's Response in Opposition to Motion to Dismiss",
    aiToolsUsed: "BaddieLegal Verify (citation & quote check)",
    runId: SAMPLE_RUN_ID,
    documentHash: SAMPLE_DOCUMENT_HASH,
    riskBand,
    coveragePct,
    timestamp: new Date(SAMPLE_GENERATED_AT).toISOString(),
  });

  return buildReportData({
    reportId: SAMPLE_REPORT_ID,
    filename: "Plaintiffs_Response_in_Opposition.docx",
    generatedAt: new Date(SAMPLE_GENERATED_AT).toLocaleString(),
    documentHash: SAMPLE_DOCUMENT_HASH,
    runId: SAMPLE_RUN_ID,
    riskBand,
    coveragePct,
    verificationId: "ck_sample_vrf_8T2mQx5wRk1jZp9nL4sV",
    caseNumber: "2026-CA-014587",
    filingTitle: "Plaintiff's Response in Opposition to Motion to Dismiss",
    aiToolsDisclosed: "BaddieLegal Verify (citation & quote check)",
    attorneyName: "Jordan A. Rivera",
    barNumber: "FL Bar No. 987654",
    lawFirm: "Rivera & Associates, P.A.",
    party: "Plaintiff",
    verificationVendor: "BaddieLegal Verify v1",
    authoritiesExtracted,
    authoritiesVerified,
    authoritiesUnresolved,
    quotationsChecked,
    quotationsMatched,
    recordCitationsChecked: null,
    recordCitationsUnresolved: null,
    findings: SAMPLE_FINDINGS,
    filingBlock,
  });
}
