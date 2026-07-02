import { FINAL_STATUS, FINDING_RESULT } from "@/lib/constants";
import { BRAND } from "@/lib/brand";
import type { FilingBlockResult } from "@/lib/filing-block";

/**
 * Shared report model consumed by both the PDF renderer and the HTML report
 * page. Built once from the persisted Report + Findings + manifest + filing
 * params so the two surfaces never drift.
 */

export interface IdentificationBlock {
  caseNumber: string;
  filingTitle: string;
  reviewedVersionAt: string;
  runId: string;
  documentHash: string;
  aiToolsDisclosed: string;
  verificationVendor: string;
}

export interface VerificationScopeItem {
  label: string;
  /** "ran" | "not_enabled" | "n/a" */
  status: "ran" | "not_enabled" | "n/a";
}

export interface SummaryOfResults {
  authoritiesExtracted: number;
  authoritiesVerified: number;
  authoritiesUnresolved: number;
  quotationsChecked: number;
  quotationsMatched: number;
  recordCitationsChecked: number | null; // null ⇒ not enabled
  recordCitationsUnresolved: number | null;
  exceptionsRemaining: number;
  finalStatus: string;
}

export interface ExceptionItem {
  checkType: string;
  result: string;
  citationText: string | null;
  detail: string | null;
}

export interface AppendixRow {
  paragraph: string | null;
  citationAsWritten: string | null;
  canonicalAuthority: string | null;
  sourceUsed: string | null;
  quoteMatch: string | null;
  metadataMatch: string | null;
  reviewerDisposition: string;
  timestamp: string;
}

export interface ReportData {
  reportId: string;
  verificationId: string | null;
  filename: string;
  generatedAt: string;
  riskBand: string | null;
  coveragePct: number | null;

  identification: IdentificationBlock;
  purpose: string;
  verificationScope: VerificationScopeItem[];
  summary: SummaryOfResults;
  exceptions: ExceptionItem[];
  limitations: string[];

  filingBlock: FilingBlockResult;
  filingBlockSource: string;
  superseded: boolean;

  /** Appendix A — only populated for the full (private) view. */
  appendix?: AppendixRow[];

  signature: {
    attorneyName: string;
    barNumber: string;
    lawFirm: string;
    party: string;
    datedLabel: string;
  };
}

/**
 * Bare public-facing exhibit. This is the version safe to file on the public
 * docket: brand-forward, no case caption, no attorney signature, no per-item
 * exceptions, no detailed counts. Only the identity of the verification run,
 * what was checked, and the single workflow status line.
 *
 * Confidentiality note: per Florida Bar Opinion 24-1, the public exhibit
 * intentionally omits citation text, exceptions, and any document content.
 */
export interface PublicExhibitData {
  reportId: string;
  verificationId: string | null;
  generatedAt: string;
  documentHash: string;
  runId: string;
  aiToolsDisclosed: string;
  verificationVendor: string;
  verificationScope: VerificationScopeItem[];
  finalStatus: string;
  /** Two short limitation lines + the "supports but does not replace" line. */
  limitations: string[];
  supportsNote: string;
}

/**
 * Thin public web-verification payload (the growth-loop lookup). May carry
 * aggregate counts (no excerpts), but never citation text or internal notes.
 */
export interface PublicVerificationPayload {
  verificationId: string;
  verified: boolean;
  documentHash: string;
  signedAt: string | null;
  generatedAt: string | null;
  verificationScope: VerificationScopeItem[];
  finalStatus: string;
  riskBand: string | null;
  coveragePct: number | null;
  counts: {
    authoritiesExtracted: number;
    authoritiesVerified: number;
    authoritiesUnresolved: number;
    quotationsChecked: number;
    quotationsMatched: number;
    recordCitationsChecked: number | null;
    recordCitationsUnresolved: number | null;
    exceptionsRemaining: number;
  };
}

export interface BuildReportDataParams {
  reportId: string;
  filename: string;
  generatedAt: string;
  documentHash: string;
  runId: string;
  riskBand: string | null;
  coveragePct: number | null;

  verificationId: string | null;

  // Persisted filing identification (may be null until the user fills the form)
  caseNumber: string | null;
  filingTitle: string | null;
  aiToolsDisclosed: string | null;
  attorneyName: string | null;
  barNumber: string | null;
  lawFirm: string | null;
  party: string | null;
  verificationVendor: string | null;

  // URL-param overrides (legacy docTitle / aiTools) — used as fallbacks
  filingTitleOverride?: string;
  aiToolsOverride?: string;

  // Summary counts
  authoritiesExtracted: number | null;
  authoritiesVerified: number | null;
  authoritiesUnresolved: number | null;
  quotationsChecked: number | null;
  quotationsMatched: number | null;
  recordCitationsChecked: number | null;
  recordCitationsUnresolved: number | null;

  // Findings
  findings: Array<{
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
    createdAt: Date | string;
  }>;

  filingBlock: FilingBlockResult;
}

const ACKNOWLEDGED_REVIEWER_STATES = new Set([
  "acknowledged",
  "accepted",
  "reviewed",
  "resolved",
]);

/**
 * Public-facing scope list (4 items) — used by the filed exhibit and the
 * public verification page. Intentionally simpler than the full report's
 * 6-item scope.
 */
export function buildPublicScope(recordEnabled: boolean): VerificationScopeItem[] {
  return [
    { label: "Citation existence", status: "ran" },
    { label: "Citation metadata", status: "ran" },
    { label: "Quote verification", status: "ran" },
    {
      label: "Record-citation verification",
      status: recordEnabled ? "ran" : "not_enabled",
    },
  ];
}

export function computeFinalStatus(
  findings: Array<{ result: string; reviewerState: string | null }>
): string {
  const exceptionFindings = findings.filter(
    (f) => f.result === FINDING_RESULT.UNRESOLVED || f.result === FINDING_RESULT.FAIL
  );
  const hasUnacknowledged = exceptionFindings.some(
    (f) => !ACKNOWLEDGED_REVIEWER_STATES.has(f.reviewerState ?? "")
  );
  if (exceptionFindings.length === 0) return FINAL_STATUS.CLEARED;
  return hasUnacknowledged ? FINAL_STATUS.NOT_CLEARED : FINAL_STATUS.CLEARED_WITH_EXCEPTIONS;
}

export const PUBLIC_SUPPORTS_NOTE =
  "Supports but does not replace the filer's own certification.";

export const PUBLIC_LIMITATIONS = [
  "This summary confirms only that the listed checks were run on the identified version of the filing.",
  "It does not opine on legal merit, completeness of the record, or likelihood of success.",
];

function resolveQuoteMatchState(findings: BuildReportDataParams["findings"], citationText: string | null): string | null {
  if (!citationText) return null;
  const row = findings.find(
    (f) => f.checkType === "quote_matching" && f.citationText === citationText
  );
  if (!row) return null;
  if (row.result === FINDING_RESULT.NOT_APPLICABLE) return "n/a";
  return row.result;
}

function resolveMetadataMatchState(findings: BuildReportDataParams["findings"], citationText: string | null): string | null {
  if (!citationText) return null;
  const row = findings.find(
    (f) => f.checkType === "citation_metadata" && f.citationText === citationText
  );
  if (!row) return null;
  return row.result;
}

export function buildReportData(params: BuildReportDataParams): ReportData {
  const filingTitle =
    params.filingTitle?.trim() ||
    params.filingTitleOverride?.trim() ||
    "[TITLE OF FILING]";
  const aiTools =
    params.aiToolsDisclosed?.trim() ||
    params.aiToolsOverride?.trim() ||
    "[TOOL NAME(S)]";
  const vendor = params.verificationVendor?.trim() || `${BRAND.product} v1`;

  const exceptionFindings = params.findings.filter(
    (f) => f.result === FINDING_RESULT.UNRESOLVED || f.result === FINDING_RESULT.FAIL
  );

  const finalStatus = computeFinalStatus(params.findings);

  const recordEnabled =
    params.recordCitationsChecked !== null &&
    params.recordCitationsChecked !== undefined;

  // Full private report uses the detailed 6-item scope.
  const verificationScope: VerificationScopeItem[] = [
    { label: "Citation extraction and normalization", status: "ran" },
    { label: "Authority existence check", status: "ran" },
    { label: "Court / reporter / year / metadata check", status: "ran" },
    { label: "Quote verification", status: "ran" },
    {
      label: "Record citation verification",
      status: recordEnabled ? "ran" : "not_enabled",
    },
    { label: "Exception logging and review status", status: "ran" },
  ];

  const exceptions: ExceptionItem[] = exceptionFindings.map((f) => ({
    checkType: f.checkType,
    result: f.result,
    citationText: f.citationText,
    detail: f.detail,
  }));

  // Appendix A — one row per finding, with quote/metadata match resolved by
  // joining sibling findings on citationText.
  const appendix: AppendixRow[] = params.findings.map((f) => {
    const paragraph =
      f.paragraphIndex !== null && f.pageNumber !== null
        ? `¶${f.paragraphIndex} (p.${f.pageNumber})`
        : f.paragraphIndex !== null
          ? `¶${f.paragraphIndex}`
          : f.pageNumber !== null
            ? `p.${f.pageNumber}`
            : null;

    const canonical = [
      f.canonicalCaseName,
      f.canonicalCitation,
      f.canonicalCourt,
    ]
      .filter(Boolean)
      .join(" — ");

    return {
      paragraph,
      citationAsWritten: f.citationText,
      canonicalAuthority: canonical || null,
      sourceUsed: f.sourceQueried,
      quoteMatch: resolveQuoteMatchState(params.findings, f.citationText),
      metadataMatch: resolveMetadataMatchState(params.findings, f.citationText),
      reviewerDisposition: f.reviewerState ?? "unreviewed",
      timestamp: new Date(f.createdAt).toISOString(),
    };
  });

  return {
    reportId: params.reportId,
    verificationId: params.verificationId,
    filename: params.filename,
    generatedAt: params.generatedAt,
    riskBand: params.riskBand,
    coveragePct: params.coveragePct,

    identification: {
      caseNumber: params.caseNumber?.trim() || "[CASE NUMBER]",
      filingTitle,
      reviewedVersionAt: params.generatedAt,
      runId: params.runId,
      documentHash: params.documentHash,
      aiToolsDisclosed: aiTools,
      verificationVendor: vendor,
    },
    purpose:
      "This exhibit summarizes a machine-assisted pre-filing verification workflow performed in support of the filing party's AI-use certification. This exhibit does not opine on the merits of the filing and does not replace counsel's independent professional judgment.",
    verificationScope,
    summary: {
      authoritiesExtracted: params.authoritiesExtracted ?? 0,
      authoritiesVerified: params.authoritiesVerified ?? 0,
      authoritiesUnresolved: params.authoritiesUnresolved ?? 0,
      quotationsChecked: params.quotationsChecked ?? 0,
      quotationsMatched: params.quotationsMatched ?? 0,
      recordCitationsChecked: recordEnabled ? (params.recordCitationsChecked ?? 0) : null,
      recordCitationsUnresolved: recordEnabled ? (params.recordCitationsUnresolved ?? 0) : null,
      exceptionsRemaining: exceptionFindings.length,
      finalStatus,
    },
    exceptions,
    limitations: params.filingBlock.limitations,
    filingBlock: params.filingBlock,
    filingBlockSource: params.filingBlock.source,
    superseded: params.filingBlock.superseded,
    appendix,
    signature: {
      attorneyName: params.attorneyName?.trim() || "[ATTORNEY NAME]",
      barNumber: params.barNumber?.trim() || "[FLORIDA BAR NO.]",
      lawFirm: params.lawFirm?.trim() || "[LAW FIRM]",
      party: params.party?.trim() || "[PARTY]",
      datedLabel: new Date(params.generatedAt).toLocaleDateString(),
    },
  };
}

/**
 * Build the bare public exhibit from the same source data as the full report.
 * Exposes only what is safe to file on the public docket.
 */
export function buildPublicExhibitData(
  params: BuildReportDataParams
): PublicExhibitData {
  const aiTools =
    params.aiToolsDisclosed?.trim() ||
    params.aiToolsOverride?.trim() ||
    "[TOOL NAME(S)]";
  const vendor = params.verificationVendor?.trim() || `${BRAND.product} v1`;
  const recordEnabled =
    params.recordCitationsChecked !== null &&
    params.recordCitationsChecked !== undefined;
  const finalStatus = computeFinalStatus(params.findings);

  return {
    reportId: params.reportId,
    verificationId: params.verificationId,
    generatedAt: params.generatedAt,
    documentHash: params.documentHash,
    runId: params.runId,
    aiToolsDisclosed: aiTools,
    verificationVendor: vendor,
    verificationScope: buildPublicScope(recordEnabled),
    finalStatus,
    limitations: PUBLIC_LIMITATIONS,
    supportsNote: PUBLIC_SUPPORTS_NOTE,
  };
}

/**
 * Build the thin public web-verification payload (counts allowed, no excerpts).
 * Used by the /v/[id] page and the JSON verify API.
 */
export function buildPublicVerificationPayload(params: {
  verificationId: string;
  documentHash: string;
  signedAt: Date | string | null;
  generatedAt: Date | string | null;
  riskBand: string | null;
  coveragePct: number | null;
  authoritiesExtracted: number | null;
  authoritiesVerified: number | null;
  authoritiesUnresolved: number | null;
  quotationsChecked: number | null;
  quotationsMatched: number | null;
  recordCitationsChecked: number | null;
  recordCitationsUnresolved: number | null;
  findings: Array<{ result: string; reviewerState: string | null }>;
}): PublicVerificationPayload {
  const recordEnabled =
    params.recordCitationsChecked !== null &&
    params.recordCitationsChecked !== undefined;
  const finalStatus = computeFinalStatus(params.findings);
  const exceptionFindings = params.findings.filter(
    (f) => f.result === FINDING_RESULT.UNRESOLVED || f.result === FINDING_RESULT.FAIL
  ).length;

  return {
    verificationId: params.verificationId,
    verified: true,
    documentHash: params.documentHash,
    signedAt: params.signedAt
      ? new Date(params.signedAt).toISOString()
      : null,
    generatedAt: params.generatedAt
      ? new Date(params.generatedAt).toISOString()
      : null,
    verificationScope: buildPublicScope(recordEnabled),
    finalStatus,
    riskBand: params.riskBand,
    coveragePct: params.coveragePct,
    counts: {
      authoritiesExtracted: params.authoritiesExtracted ?? 0,
      authoritiesVerified: params.authoritiesVerified ?? 0,
      authoritiesUnresolved: params.authoritiesUnresolved ?? 0,
      quotationsChecked: params.quotationsChecked ?? 0,
      quotationsMatched: params.quotationsMatched ?? 0,
      recordCitationsChecked: recordEnabled ? (params.recordCitationsChecked ?? 0) : null,
      recordCitationsUnresolved: recordEnabled ? (params.recordCitationsUnresolved ?? 0) : null,
      exceptionsRemaining: exceptionFindings,
    },
  };
}
