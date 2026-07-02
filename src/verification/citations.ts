import type { Citation, QuotedSpan } from "@/lib/types";

const CASE_CITATION =
  /[A-Z][A-Za-z'.\-,&\s]+?\sv\.\s[A-Z][A-Za-z'.\-,&\s]+?\d+\s+[A-Z][A-Za-z0-9.]+(?:\s+[A-Za-z0-9.]+)*\s+\d+(?:,\s*\d+)?\s*\([^)]*\d{4}\)/g;

const STATUTE_CITATION = /\d+\s+U\.S\.C\.\s*§\s*\d+[a-z0-9\-]*/g;

const FEDERAL_REPORTER = /\d+\s+F\.(2d|3d|4th|Supp\.)\s+\d+/g;

const STATE_REPORTER =
  /\d+\s+(?:So\.|Fla\.|P\.|A\.|N\.W\.|S\.E\.|N\.E\.|S\.W\.|Cal\.|N\.Y\.S\.|Pac\.|Atl\.)\s*(?:2d|3d|4th)?\s+\d+/g;

const CITATION_PATTERNS = [
  CASE_CITATION,
  STATUTE_CITATION,
  FEDERAL_REPORTER,
  STATE_REPORTER,
];

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+,\s*/g, ", ")
    .replace(/\s+;\s*/g, "; ");
}

export function extractCitations(rawText: string): Citation[] {
  const text = normalizeText(rawText);
  const results: Citation[] = [];
  const seen = new Set<string>();

  for (const pattern of CITATION_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const citeText = match[0].trim().replace(/\s+/g, " ");
      const normKey = citeText.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normKey)) {
        seen.add(normKey);
        results.push({
          text: citeText,
          spanStart: match.index,
          spanEnd: match.index + match[0].length,
        });
      }
    }
  }

  const filtered = results.filter((c) => {
    const isInsideAnother = results.some(
      (other) =>
        other !== c &&
        other.text !== c.text &&
        other.spanStart <= c.spanStart &&
        other.spanEnd >= c.spanEnd
    );
    return !isInsideAnother;
  });

  filtered.sort((a, b) => a.spanStart - b.spanStart);
  return filtered;
}

export function extractQuotedSpans(text: string): QuotedSpan[] {
  const results: QuotedSpan[] = [];
  const quotePattern = /"([^"]{31,})"/g;
  let match: RegExpExecArray | null;

  while ((match = quotePattern.exec(text)) !== null) {
    const fullMatch = match[0];
    results.push({
      text: fullMatch,
      spanStart: match.index,
      spanEnd: match.index + fullMatch.length,
    });
  }

  return results;
}
