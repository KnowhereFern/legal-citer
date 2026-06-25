export interface SensitiveDataFinding {
  type: string;
  start: number;
  end: number;
  matchedText: string;
  severity: "low" | "medium" | "high" | "critical";
}

export interface SensitiveDataResult {
  findings: SensitiveDataFinding[];
  hasSensitiveData: boolean;
}

const SSN_PATTERN = /\b(?!000|666|9\d{2})\d{3}[-\s]?(?!00)\d{2}[-\s]?(?!0000)\d{4}\b/g;
const CREDIT_CARD_PATTERN =
  /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g;
const BANK_ACCOUNT_PATTERN = /\b\d{8,17}\b/g;
const DOB_PATTERN =
  /\b(?:date\s*of\s*birth|dob|born)\s*[:=]?\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\b/gi;

interface PatternDef {
  regex: RegExp;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
}

const PATTERNS: PatternDef[] = [
  { regex: SSN_PATTERN, type: "ssn", severity: "critical" },
  { regex: CREDIT_CARD_PATTERN, type: "credit_card", severity: "critical" },
  { regex: DOB_PATTERN, type: "date_of_birth", severity: "high" },
  { regex: BANK_ACCOUNT_PATTERN, type: "bank_account", severity: "medium" },
];

export function scanForSensitiveData(text: string): SensitiveDataResult {
  const findings: SensitiveDataFinding[] = [];

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      findings.push({
        type: pattern.type,
        start: match.index,
        end: match.index + match[0].length,
        matchedText: match[0],
        severity: pattern.severity,
      });
    }
  }

  findings.sort((a, b) => a.start - b.start);

  return {
    findings,
    hasSensitiveData: findings.length > 0,
  };
}
