import type { Citation } from "@/lib/types";

export type CitationType = "case_law" | "statute" | "regulation" | "unknown";

export interface ClassifiedCitation extends Citation {
  citationType: CitationType;
}

const REPORTERS = [
  /U\.S\.\s*\d/,
  /F\.\s*\d/,
  /F\.2d\s*\d/,
  /F\.3d\s*\d/,
  /F\.4th\s*\d/,
  /S\. Ct\.\s*\d/,
  /L\. Ed\.\s*\d/,
  /N\.E\.\s*\d/,
  /N\.W\.\s*\d/,
  /S\.E\.\s*\d/,
  /S\.W\.\s*\d/,
  /Cal\.\s*\d/,
  /N\.Y\.S\.\s*\d/,
  /Tex\.\s*\d/,
  /Ill\.\s*\d/,
  /Fla\.\s*\d/,
];

function isCaseLaw(text: string): boolean {
  if (/\bv\.\s|\bvs\.\s|\bversus\s/i.test(text)) return true;
  return REPORTERS.some((r) => r.test(text));
}

function isStatute(text: string): boolean {
  return (
    /U\.S\.C\.\s*§/.test(text) ||
    /C\.F\.R\.\s*§/.test(text) ||
    /\bFla\.\s*Stat\.(\s*Ann\.)?\s*§\s*\d/.test(text) ||
    /§\s*\d{1,4}(\.\d+)?,?\s*Fla\.\s*Stat\./.test(text) ||
    /\bsection\s+\d/.test(text)
  );
}

function isRegulation(text: string): boolean {
  return /C\.F\.R\.|Fed\.\s*Reg\./.test(text);
}

export function classifyCitation(citation: { text: string }): CitationType {
  const text = citation.text;
  if (isRegulation(text) && !isStatute(text)) return "regulation";
  if (isStatute(text)) return "statute";
  if (isCaseLaw(text)) return "case_law";
  return "unknown";
}

export function classifyCitations(citations: Citation[]): ClassifiedCitation[] {
  return citations.map((c) => ({
    ...c,
    citationType: classifyCitation(c),
  }));
}
