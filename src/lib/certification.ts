export interface CertificationBlock {
  jurisdiction: string;
  text: string;
  limitations: string[];
  disclaimers: string[];
}

const SUPPORTED_JURISDICTIONS = [
  "federal",
  "california",
  "new_york",
  "texas",
  "florida",
  "illinois",
] as const;

type Jurisdiction = (typeof SUPPORTED_JURISDICTIONS)[number];

interface JurisdictionConfig {
  text: string;
  limitations: string[];
  disclaimers: string[];
}

const JURISDICTION_CONFIGS: Record<Jurisdiction, JurisdictionConfig> = {
  federal: {
    text:
      "This document has been verified in accordance with Federal Rules of Civil Procedure and applicable federal standards for citation verification. The verification process checked citation existence, metadata accuracy, and quoted text fidelity against available authority databases.",
    limitations: [
      "Verification is limited to publicly available authority databases",
      "Does not constitute legal advice or opinion",
      "Proposition support analysis is experimental and not included",
      "Results are snapshot-in-time and do not account for subsequent changes in law",
    ],
    disclaimers: [
      "This verification does not guarantee admissibility in any federal court",
      "Users should independently verify all citations before filing",
      "Legal Citer is not a law firm and does not provide legal representation",
    ],
  },
  california: {
    text:
      "This document has been verified in accordance with California Rules of Court and the California Style Manual standards. The verification process evaluated citations against California-specific authority databases and the California Case Law system.",
    limitations: [
      "Verification is limited to publicly available California authority databases",
      "Does not account for unpublished California opinions designated as non-citable",
      "Proposition support analysis is experimental and not included",
      "Does not verify compliance with California specific formatting requirements",
    ],
    disclaimers: [
      "This verification does not constitute a guarantee of compliance with California Rules of Court",
      "Users should independently verify all citations before filing in California courts",
      "Legal Citer is not a law firm and does not provide legal representation",
    ],
  },
  new_york: {
    text:
      "This document has been verified in accordance with the New York Rules of Professional Conduct and the New York Law Reporting Bureau standards. The verification process evaluated citations against New York-specific authority databases.",
    limitations: [
      "Verification is limited to publicly available New York authority databases",
      "Does not verify compliance with New York court-specific citation formats",
      "Proposition support analysis is experimental and not included",
      "May not cover all New York administrative codes and regulations",
    ],
    disclaimers: [
      "This verification does not constitute a guarantee of compliance with New York citation standards",
      "Users should independently verify all citations before filing in New York courts",
      "Legal Citer is not a law firm and does not provide legal representation",
    ],
  },
  texas: {
    text:
      "This document has been verified in accordance with the Texas Rules of Civil Procedure and the Texas Rules of Appellate Procedure citation standards. The verification process evaluated citations against Texas-specific authority databases.",
    limitations: [
      "Verification is limited to publicly available Texas authority databases",
      "Does not verify compliance with Texas court-specific local rules",
      "Proposition support analysis is experimental and not included",
      "May not cover all Texas administrative codes",
    ],
    disclaimers: [
      "This verification does not constitute a guarantee of compliance with Texas citation standards",
      "Users should independently verify all citations before filing in Texas courts",
      "Legal Citer is not a law firm and does not provide legal representation",
    ],
  },
  florida: {
    text:
      "This document has been verified in accordance with the Florida Rules of Civil Procedure and Florida Standard for Citations. The verification process evaluated citations against Florida-specific authority databases.",
    limitations: [
      "Verification is limited to publicly available Florida authority databases",
      "Does not verify compliance with Florida court-specific local rules",
      "Proposition support analysis is experimental and not included",
      "May not cover all Florida administrative codes and regulations",
    ],
    disclaimers: [
      "This verification does not constitute a guarantee of compliance with Florida citation standards",
      "Users should independently verify all citations before filing in Florida courts",
      "Legal Citer is not a law firm and does not provide legal representation",
    ],
  },
  illinois: {
    text:
      "This document has been verified in accordance with the Illinois Supreme Court Rules and Illinois citation standards. The verification process evaluated citations against Illinois-specific authority databases.",
    limitations: [
      "Verification is limited to publicly available Illinois authority databases",
      "Does not verify compliance with Illinois court-specific local rules",
      "Proposition support analysis is experimental and not included",
      "May not cover all Illinois administrative codes and regulations",
    ],
    disclaimers: [
      "This verification does not constitute a guarantee of compliance with Illinois citation standards",
      "Users should independently verify all citations before filing in Illinois courts",
      "Legal Citer is not a law firm and does not provide legal representation",
    ],
  },
};

export function generateCertificationBlock(params: {
  jurisdiction: string;
  findings: Record<string, unknown>[];
  riskBand: string;
}): CertificationBlock {
  const jurisdiction = (
    SUPPORTED_JURISDICTIONS as readonly string[]
  ).includes(params.jurisdiction)
    ? (params.jurisdiction as Jurisdiction)
    : "federal";

  const config = JURISDICTION_CONFIGS[jurisdiction];

  const failureCount = params.findings.filter(
    (f) => f.result === "fail"
  ).length;
  const unresolvedCount = params.findings.filter(
    (f) => f.result === "unresolved"
  ).length;

  const summarySuffix = ` Risk band: ${params.riskBand}. Failures: ${failureCount}. Unresolved: ${unresolvedCount}.`;

  return {
    jurisdiction,
    text: config.text + summarySuffix,
    limitations: [...config.limitations],
    disclaimers: [...config.disclaimers],
  };
}
