export interface JurisdictionConfig {
  key: string;
  label: string;
  filingBlockText: string;
  requiresToolDisclosure: boolean;
  placementNote: string;
  limitations: string[];
  source: string;
  superseded?: boolean;
}

export const JURISDICTIONS: JurisdictionConfig[] = [
  {
    key: "florida_rule_2515",
    label: "Florida — Rule 2.515(d)(2) (Statewide, in effect)",
    filingBlockText:
      "Pursuant to Florida Rule of General Practice and Judicial Administration 2.515(d)(2), the undersigned represents that the legal authorities identified in this filing exist and are accurately cited.",
    requiresToolDisclosure: false,
    placementNote:
      "This representation is made by signing and filing the document. No separate disclosure of AI use is required under the statewide rule.",
    limitations: [
      "This representation applies to all filings in Florida courts regardless of whether AI was used",
      "Courts may impose sanctions for filings inconsistent with this representation after notice and an opportunity to be heard",
      "This verification does not certify legal merit, strategic soundness, or likelihood of success",
    ],
    source:
      "Fla. R. Gen. Prac. & Jud. Admin. 2.515(d)(2), amended by SC2026-0673 (eff. June 15, 2026)",
  },
  {
    key: "florida_11th",
    label: "Florida — 11th Circuit (Miami-Dade) AO 26-04 (superseded)",
    filingBlockText:
      "Generative artificial intelligence was used in the preparation of this filing. The undersigned certifies that all factual assertions, legal authority, and citations have been independently reviewed and verified for accuracy and accepts full responsibility for the contents of this filing.",
    requiresToolDisclosure: false,
    placementNote:
      "Include at the conclusion of the filing or immediately above the signature block. This order was superseded by the statewide Rule 2.515(d)(2) on June 15, 2026, but may be used as optional enhanced disclosure.",
    limitations: [
      "Superseded by statewide Rule 2.515(d)(2) effective June 15, 2026",
      "This verification does not certify legal merit, strategic soundness, or likelihood of success",
    ],
    source:
      "Eleventh Judicial Circuit AO No. 26-04 (Jan. 15, 2026)",
    superseded: true,
  },
  {
    key: "florida_17th",
    label: "Florida — 17th Circuit (Broward) AO 2026-03-Gen (superseded)",
    filingBlockText:
      "The undersigned hereby certifies that generative artificial intelligence was used to prepare this {DOCUMENT_TITLE}. The undersigned has independently verified the accuracy of every citation to the law and/or the record, and the accuracy of any language drafted by generative artificial intelligence, including quotations, citations, paraphrased assertions, facts, and legal analysis.\n\nGenerative artificial intelligence tool(s) used: {AI_TOOLS}.",
    requiresToolDisclosure: true,
    placementNote:
      "Disclosure must appear on the face of the filing. Must identify the specific AI tool(s) used. This order was superseded by the statewide Rule 2.515(d)(2) on June 15, 2026, but may be used as optional enhanced disclosure.",
    limitations: [
      "Superseded by statewide Rule 2.515(d)(2) effective June 15, 2026",
      "This verification does not certify legal merit, strategic soundness, or likelihood of success",
    ],
    source:
      "Seventeenth Judicial Circuit AO No. 2026-03-Gen (Jan. 26, 2026)",
    superseded: true,
  },
  {
    key: "florida_18th",
    label: "Florida — 18th Circuit (Brevard/Seminole) AO 26-10 (superseded)",
    filingBlockText:
      "Generative artificial intelligence was used in the preparation of this filing. The undersigned certifies that all factual assertions, legal authority, and citations have been independently reviewed and verified for accuracy, and accepts full responsibility for the contents of this filing.",
    requiresToolDisclosure: false,
    placementNote:
      "Include at the conclusion of the filing or immediately above the signature block. This order was superseded by the statewide Rule 2.515(d)(2) on June 15, 2026, but may be used as optional enhanced disclosure.",
    limitations: [
      "Superseded by statewide Rule 2.515(d)(2) effective June 15, 2026",
      "This verification does not certify legal merit, strategic soundness, or likelihood of success",
    ],
    source:
      "Eighteenth Judicial Circuit AO No. 26-10 (Feb. 13, 2026)",
    superseded: true,
  },
  {
    key: "federal_rule_11",
    label: "Federal — FRCP Rule 11(b)",
    filingBlockText:
      "By signing this filing, the undersigned certifies pursuant to Federal Rule of Civil Procedure 11(b) that, to the best of the undersigned's knowledge, information, and belief formed after an inquiry reasonable under the circumstances: the claims, defenses, and other legal contentions are warranted by existing law or by a nonfrivolous argument for extending, modifying, or reversing existing law or for establishing new law; and the factual contentions have evidentiary support.",
    requiresToolDisclosure: false,
    placementNote:
      "Rule 11 certification is made by signing the filing. Some federal courts have additional local AI-specific standing orders — check your court's local rules.",
    limitations: [
      "Individual federal judges may issue standing orders with additional AI-specific requirements",
      "This verification does not certify legal merit, strategic soundness, or likelihood of success",
    ],
    source:
      "Fed. R. Civ. P. 11(b)",
  },
];

export function getJurisdiction(key: string): JurisdictionConfig {
  return JURISDICTIONS.find((j) => j.key === key) ?? JURISDICTIONS[0];
}
