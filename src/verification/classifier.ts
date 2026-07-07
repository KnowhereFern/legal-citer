import type { Citation } from "@/lib/types";

export type CitationType =
  | "case_law"
  | "statute"
  | "regulation"
  | "constitutional"
  | "court_rule"
  | "unknown";

export interface ClassifiedCitation extends Citation {
  citationType: CitationType;
}

const REPORTERS = [
  /U\.S\.\s*\d/,
  /F\.\s*\d/,
  /F\.2d\s*\d/,
  /F\.3d\s*\d/,
  /F\.4th\s*\d/,
  /F\.\s*Supp/,
  /S\.\s*Ct\.\s*\d/,
  /L\.\s*Ed\.\s*\d/,
  /N\.E\.\s*\d/,
  /N\.W\.\s*\d/,
  /S\.E\.\s*\d/,
  /S\.W\.\s*\d/,
  /Cal\.\s*\d/,
  /N\.Y\.S\.\s*\d/,
  /Tex\.\s*\d/,
  /Ill\.\s*\d/,
  /Fla\.\s*\d/,
  /Pac\.\s*\d/,
  /Atl\.\s*\d/,
  /So\.\s*\d/,
];

function isCaseLaw(text: string): boolean {
  if (/\bv\.\s|\bvs\.\s|\bversus\s/i.test(text)) return true;
  // Short-form case cite: "Smith, 123 F.4th at 456" — party + comma + reporter + "at NN"
  if (/,\s*\d+\s+[A-Z][A-Za-z.]+\s+at\s+\d/.test(text)) return true;
  return REPORTERS.some((r) => r.test(text));
}

function isStatute(text: string): boolean {
  return (
    /U\.S\.C\.\s*§/.test(text) ||
    /\bFla\.\s*Stat\.(\s*Ann\.)?\s*§\s*\d/.test(text) ||
    /§\s*\d{1,4}(\.\d+)?,?\s*Fla\.\s*Stat\./.test(text) ||
    /\bsection\s+\d/.test(text)
  );
}

function isRegulation(text: string): boolean {
  // CFR is a regulation, NOT a statute (the prior isStatute regex wrongly
  // matched "C.F.R. §"). Fed. Reg. is also regulation-class.
  return /C\.F\.R\./.test(text) || /Fed\.\s*Reg\./.test(text);
}

function isConstitutional(text: string): boolean {
  return /Const\.?\s*(?:amend\.|art\.)/.test(text);
}

function isCourtRule(text: string): boolean {
  return /Fed\.\s*R\./.test(text) || /Fla\.\s*R\./.test(text);
}

export function classifyCitation(citation: { text: string }): CitationType {
  const text = citation.text;
  // Order matters: most-specific first. Constitutional/court-rule/regulation
  // must be checked before the broader statute/case-law patterns, otherwise
  // e.g. "Fed. R. Civ. P. 12" would match nothing and fall through to unknown
  // (which is correct here, but "U.S. Const. amend. XIV" must not be caught
  // by the case-law v. test etc.).
  if (isConstitutional(text)) return "constitutional";
  if (isCourtRule(text)) return "court_rule";
  if (isRegulation(text)) return "regulation";
  if (isStatute(text)) return "statute";
  if (isCaseLaw(text)) return "case_law";
  // Short-form references (id., supra, infra) refer to the immediately
  // preceding authority. They have no intrinsic type — but in practice the
  // vast majority refer to case law (the most-cited authority type in a
  // brief), and classifying them as case_law lets them flow through the
  // same resolver chain. The resolver will still return unresolved if the
  // antecedent isn't resolvable, which is the correct outcome.
  if (/^(id\.|supra|infra)(?:\s|$)/i.test(text)) return "case_law";
  return "unknown";
}

export function classifyCitations(citations: Citation[]): ClassifiedCitation[] {
  return citations.map((c) => ({
    ...c,
    citationType: classifyCitation(c),
  }));
}
