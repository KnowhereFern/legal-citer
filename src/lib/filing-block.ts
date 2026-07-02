import { getJurisdiction } from "@/lib/jurisdictions";

export interface FilingBlockParams {
  jurisdictionKey: string;
  documentTitle?: string;
  aiToolsUsed?: string;
  runId: string;
  documentHash: string;
  riskBand: string;
  coveragePct: number;
  timestamp: string;
}

export interface FilingBlockResult {
  jurisdictionLabel: string;
  certificationText: string;
  placementNote: string;
  limitations: string[];
  source: string;
  superseded: boolean;
  verificationSummary: string;
}

export function generateFilingBlock(
  params: FilingBlockParams
): FilingBlockResult {
  const config = getJurisdiction(params.jurisdictionKey);

  let text = config.filingBlockText;

  if (text.includes("{DOCUMENT_TITLE}")) {
    text = text.replaceAll(
      "{DOCUMENT_TITLE}",
      params.documentTitle?.trim() || "[TITLE OF FILING]"
    );
  }

  if (text.includes("{AI_TOOLS}")) {
    text = text.replaceAll(
      "{AI_TOOLS}",
      params.aiToolsUsed?.trim() || "[TOOL NAME(S)]"
    );
  }

  const verificationSummary = [
    `Verification Run ID: ${params.runId}`,
    `Document Hash (SHA-256): ${params.documentHash}`,
    `Risk Band: ${params.riskBand}`,
    `Coverage: ${params.coveragePct.toFixed(1)}%`,
    `Verified at: ${params.timestamp}`,
  ].join("\n");

  return {
    jurisdictionLabel: config.label,
    certificationText: text,
    placementNote: config.placementNote,
    limitations: config.limitations,
    source: config.source,
    superseded: config.superseded ?? false,
    verificationSummary,
  };
}
