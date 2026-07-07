import type { Citation, QuotedSpan, RecordCitation, RecordCitationType } from "@/lib/types";

const CASE_CITATION =
  /[A-Z][A-Za-z'.\-,&\s]+?\sv\.\s[A-Z][A-Za-z'.\-,&\s]+?\d+\s+[A-Z][A-Za-z0-9.]+(?:\s+[A-Za-z0-9.]+)*\s+\d+(?:,\s*\d+)?\s*\([^)]*\d{4}\)/g;

// U.S.C. — supports single section (§), plural/ranges (§§ 1981-1983), and
// trailing subsection letters/digits (§ 227(b), § 1983A).
const USCODE_STATUTE =
  /\d+\s+U\.S\.C\.\s*§§?\s*\d+(?:[a-z0-9\-]+)?(?:\s*(?:[-–,]\s*\d+(?:[a-z0-9\-]+)?))*/g;

// Florida Statutes — both the forward form ("Fla. Stat. § 501.205",
// "Fla. Stat. Ann. § 501.205") and the reversed form ("§ 501.205, Fla.
// Stat."). Section numbers are chapter.subsection (501.205, 95.11, 817.034).
const FLA_STATUE_FORWARD =
  /Fla\.?\s*Stat\.?(?:\s*Ann\.?)?\s*§§?\s*\d{1,4}(?:\.\d+)?(?:\s*(?:[-–,]\s*\d{1,4}(?:\.\d+)?))*/g;
const FLA_STATUTE_REVERSED =
  /§§?\s*\d{1,4}(?:\.\d+)?,?\s*Fla\.?\s*Stat\.?(?:\s*Ann\.?)?/g;

// Federal Reporter — all series. The prior regex glued the series group to
// "F." with no \s*, which silently dropped the entire F. Supp.* family
// (F. Supp., F. Supp. 2d, F. Supp. 3d — the dominant district-court
// reporters) plus F. App'x (unpublished circuit). The CAP resolver already
// knows these abbreviations; the extractor just never fed them.
const FEDERAL_REPORTER =
  /\d+\s+F\.\s*(?:2d|3d|4th|Supp\.(?:\s*(?:2d|3d))?|App'x|Appx)\s+\d+/g;

// Bare U.S. Supreme Court reporters — "570 U.S. 544", "137 S. Ct. 1858",
// "181 L. Ed. 2d 953". These appear constantly in briefs (often as the
// parallel cite in a full case citation, but also standalone) and were
// previously invisible to the extractor even though the classifier and CAP
// resolver both know the abbreviations.
const SUPREME_COURT_REPORTER =
  /\d+\s+(?:U\.S\.|S\.\s*Ct\.|L\.\s*Ed\.\s*(?:2d)?)\s+\d+/g;

const STATE_REPORTER =
  /\d+\s+(?:So\.|Fla\.|P\.|A\.|N\.W\.|S\.E\.|N\.E\.|S\.W\.|Cal\.|N\.Y\.S\.|Pac\.|Atl\.)\s*(?:2d|3d|4th)?\s+\d+/g;

const CITATION_PATTERNS = [
  CASE_CITATION,
  USCODE_STATUTE,
  FLA_STATUE_FORWARD,
  FLA_STATUTE_REVERSED,
  FEDERAL_REPORTER,
  SUPREME_COURT_REPORTER,
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
  // Match quoted spans using either straight ("…") or typographic curly
  // quotes ("…"). PDFs almost always emit curly quotes, so the prior
  // straight-only regex silently dropped most quotations in real briefs —
  // quote_matching then fell back to NOT_APPLICABLE for every citation.
  const quotePattern = /["\u201C]([^"\u201D]{31,})["\u201D]/g;
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

/**
 * Attach paragraph index + page number to citations/quotes/record-cites by
 * locating their span inside the source text's paragraph blocks.
 * Paragraphs are produced by splitting the same text on blank-line boundaries
 * the extractor uses (see extractor.ts buildParagraphMapFromPages), so the
 * computed offsets line up with extraction-time spanStart values.
 */
export function attachParagraphPositions<T extends { spanStart: number; page?: number; paragraphIndex?: number }>(
  items: T[],
  fullText: string,
): T[] {
  if (items.length === 0) return items;

  // Build (start, end, paragraphIndex, page) blocks by walking the text and
  // splitting on the same /\n{2,}/ separator used by the extractor.
  const blocks: Array<{ start: number; end: number; paragraphIndex: number; page: number }> = [];
  const pageBreak = /\x0c|\f/;
  const segments = fullText.split(pageBreak);
  let offset = 0;
  let paragraphIndex = 0;
  for (let pageIdx = 0; pageIdx < segments.length; pageIdx++) {
    const pageText = segments[pageIdx];
    const raw = pageText.split(/\n{2,}/);
    for (const block of raw) {
      const start = fullText.indexOf(block, offset);
      if (start === -1) {
        offset += block.length + 2;
        continue;
      }
      blocks.push({
        start,
        end: start + block.length,
        paragraphIndex,
        page: pageIdx + 1,
      });
      paragraphIndex++;
      offset = start + block.length;
    }
    // account for the page-break char we removed via split
    offset += 1;
  }

  return items.map((item) => {
    if (item.paragraphIndex !== undefined && item.page !== undefined) return item;
    const block = blocks.find((b) => item.spanStart >= b.start && item.spanStart < b.end);
    if (!block) return item;
    return { ...item, paragraphIndex: block.paragraphIndex, page: block.page };
  });
}

// --- Record-citation extraction -------------------------------------------

const RECORD_CITATION_PATTERNS: Array<{ type: RecordCitationType; re: RegExp }> = [
  // Transcript: "Tr. 45:12-15", "Tr. at 102", "T. 45", "[T.] 102"
  {
    type: "transcript",
    re: /\[?(?:Tr\.|Transcript|T\.)\]?\.?\s*(?:at\s+)?(\d+)(?::\d+(?:-\d+)?)?/g,
  },
  // Record / Clerk's record: "R. 102", "Rec. 14", "CR 200", "RR 14"
  {
    type: "record",
    re: /\b(?:R\.|Rec\.|Record|CR|RR|Clerk'?s?\s*Record)\s*(?:at\s+)?(\d+)/g,
  },
  // Exhibit: "Ex. A", "Exhibit 3", "Ex. D-2", "Pl. Ex. 12"
  {
    type: "exhibit",
    re: /\b(?:Pl\.?\s*)?(?:Df\.?\s*)?(?:Ex\.|Exhibit)\s*([A-Z0-9][A-Z0-9\-]*)/g,
  },
  // Paragraph: "¶ 7", "¶7", "Pltf's MSJ ¶7" — counts as a record cite only when explicit
  {
    type: "paragraph",
    re: /¶\s*(\d+)/g,
  },
];

export function extractRecordCitations(rawText: string): RecordCitation[] {
  const text = normalizeText(rawText);
  const results: RecordCitation[] = [];
  const seen = new Set<string>();

  for (const { type, re } of RECORD_CITATION_PATTERNS) {
    const regex = new RegExp(re.source, re.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const citeText = match[0].trim().replace(/\s+/g, " ");
      const key = `${type}:${citeText.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        results.push({
          text: citeText,
          type,
          spanStart: match.index,
          spanEnd: match.index + match[0].length,
        });
      }
    }
  }

  results.sort((a, b) => a.spanStart - b.spanStart);
  return results;
}
