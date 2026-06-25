import type { Citation, QuotedSpan } from "@/lib/types";

const CASE_CITATION =
  /[A-Z][a-zA-Z'.\-]+ v\. [A-Z][a-zA-Z'.\-]+,?\s*\d+\s+[A-Z0-9.a-z ]+\d+\s*\(\d{4}\)/g;

const STATUTE_CITATION = /\d+\s+U\.S\.C\.\s*§\s*\d+[a-z0-9\-]*/g;

const FEDERAL_REPORTER = /\d+\s+F\.(2d|3d|4th)\s+\d+/g;

const STATE_REPORTER =
  /\d+\s+[A-Z]{2,}\.(?:S\.(?:2d|3d|4th)|2d|3d|4th)?\s+\d+/g;

const CITATION_PATTERNS = [
  CASE_CITATION,
  STATUTE_CITATION,
  FEDERAL_REPORTER,
  STATE_REPORTER,
];

export function extractCitations(text: string): Citation[] {
  const results: Citation[] = [];
  const seen = new Set<string>();

  for (const pattern of CITATION_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}:${match[0]}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          text: match[0],
          spanStart: match.index,
          spanEnd: match.index + match[0].length,
        });
      }
    }
  }

  results.sort((a, b) => a.spanStart - b.spanStart);
  return results;
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
