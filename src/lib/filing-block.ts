export interface FilingBlock {
  verificationId: string;
  documentHash: string;
  riskBand: string;
  coveragePct: number;
  timestamp: string;
  json: string;
  plainText: string;
}

export function generateFilingBlock(params: {
  documentHash: string;
  runId: string;
  riskBand: string;
  coveragePct: number;
  timestamp: string;
}): FilingBlock {
  const data = {
    verificationId: params.runId,
    documentHash: params.documentHash,
    riskBand: params.riskBand,
    coveragePct: params.coveragePct,
    timestamp: params.timestamp,
  };

  const json = JSON.stringify(data, null, 2);

  const plainText = [
    `VERIFICATION ID: ${data.verificationId}`,
    `DOCUMENT HASH: ${data.documentHash}`,
    `RISK BAND: ${data.riskBand}`,
    `COVERAGE: ${data.coveragePct.toFixed(1)}%`,
    `TIMESTAMP: ${data.timestamp}`,
  ].join("\n");

  return {
    verificationId: params.runId,
    documentHash: params.documentHash,
    riskBand: params.riskBand,
    coveragePct: params.coveragePct,
    timestamp: params.timestamp,
    json,
    plainText,
  };
}
