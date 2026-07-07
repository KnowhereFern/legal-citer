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
  /\d+\s+(?:So\.|Fla\.|P\.|A\.|N\.W\.|S\.E\.|N\.E\.|S\.W\.|Cal\.|N\.Y\.S\.|Pac\.|Atl\.|N\.J\.|N\.J\.Super\.|Mich\.|Wis\.|Minn\.|Neb\.|Nev\.|Conn\.|Md\.|Mass\.|N\.C\.|S\.C\.|Tenn\.|Va\.|Wash\.|W\.Va\.|Ill\.|Ohio|Pa\.|Ind\.|Kan\.|Ky\.|Mo\.|Alaska|Haw\.|Idaho|Iowa|Me\.|Mont\.|N\.H\.|N\.D\.|N\.M\.|Okla\.|Or\.|R\.I\.|S\.D\.|Utah|Vt\.|Wyo\.|Del\.)\s*(?:2d|3d|4th)?\s+\d+/g;

// Parallel-citation separator: ", 137 S. Ct. 945, 181 L. Ed. 2d 953".
// The extractor runs each pattern independently, so a parallel pair like
// "565 U.S. 368, 132 S. Ct. 945" yields two adjacent matches — but the
// containment filter then DROPS the inner one because CASE_CITATION already
// swallowed the whole "Party v. Party, 565 U.S. 368, 132 S. Ct. 945 (2012)"
// span. To preserve parallel reporters inside a full case cite, we run a
// dedicated pass that pulls every reporter-shaped substring out of any
// longer CASE_CITATION match (see extractParallelCitations below).

// --- Short forms --------------------------------------------------------
// Short-form citations are the most common form inside a brief — once a
// case is introduced in full, every subsequent reference uses a short form.
// Previously NONE of these were extracted, so most of a real brief's cites
// were invisible. Each short form resolves against the most-recent full
// citation of the same case (handled by the resolver/composite layer).

// "id.", "id. at 456", "id. at 456-57" — refers to the immediately
// preceding authority. The "at" page locator is optional.
const ID_CITATION = /\b(id\.|id\.,?)\s*(?:at\s+\d+(?:[-–]\d+)?)?/g;

// "supra" / "infra" / "supra note 12" / "supra, at 45" — back/forward
// references to authority already cited.
const SUPRA_INFRA_CITATION =
  /\b(supra|infra)\b(?:,?\s*(?:note\s+\d+|at\s+\d+(?:[-–]\d+)?))?/g;

// Short-form case cite: "Smith, 123 F.4th at 456" / "Smith, 570 U.S. at 544"
// / "Mims, 565 U.S. at 372". The party name (one or two capitalized tokens)
// is followed by a comma, a reporter volume+abbreviation+page, then "at NN".
// This is THE dominant citation form in legal briefs after the first full cite.
const SHORT_FORM_CASE =
  /\b([A-Z][A-Za-z.'\-]+(?:\s+v\.\s[A-Z][A-Za-z.'\-]+)?),\s*\d+\s+(?:U\.S\.|F\.\s*(?:2d|3d|4th|Supp\.(?:\s*(?:2d|3d))?|App'x|Appx)|S\.\s*Ct\.|L\.\s*Ed\.\s*(?:2d)?|So\.\s*(?:2d|3d)?|Fla\.\s*(?:2d|3d)?|N\.W\.\s*(?:2d|3d)?|S\.E\.\s*(?:2d|3d)?|N\.E\.\s*(?:2d|3d)?|S\.W\.\s*(?:2d|3d)?|Pac\.\s*(?:2d|3d)?|Atl\.\s*(?:2d|3d)?)\s+at\s+\d+(?:[-–]\d+)?/g;

// --- Regulations --------------------------------------------------------

// Code of Federal Regulations: "29 C.F.R. § 1910.120", "40 C.F.R. § 1500.3".
const CFR_REGULATION = /\d+\s+C\.?F\.?R\.?\s*§\s*\d+(?:\.\d+)*/g;

// Federal Register: "85 Fed. Reg. 41,672", "80 Fed. Reg. 12345".
const FED_REG = /\d+\s+Fed\.\s*Reg\.\s+\d{1,6}(?:,\d{3})*/g;

// --- Constitutional -----------------------------------------------------

// "U.S. Const. amend. XIV", "U.S. Const. art. I, § 8, cl. 3".
// "Fla. Const. art. I, § 23". State constitutions follow the same shape.
const CONSTITUTIONAL =
  /(?:U\.S\.|[A-Z][a-z]+)\.?\s*Const\.?\s*(?:amend\.\s+[IVXLCDM]+|art\.\s+[IVXLCDM]+,?\s*§\s*\d+(?:,\s*cl\.\s*\d+)?)/g;

// --- Court rules --------------------------------------------------------

// Federal rules: "Fed. R. Civ. P. 12(b)(6)", "Fed. R. Evid. 803(2)",
// "Fed. R. App. P. 28(a)", "Fed. R. Crim. P. 11".
const FEDERAL_RULES =
  /Fed\.\s*R\.\s*(?:Civ\.?\s*P\.|Evid\.?|App\.\s*P\.|Crim\.?\s*P\.)\s*\d+(?:\([a-z0-9]+\))*/g;

// Florida rules: "Fla. R. Civ. P. 1.110", "Fla. R. Gen. Prac. & Jud. Admin. 2.515".
const FLORIDA_RULES =
  /Fla\.\s*R\.\s*(?:Civ\.?\s*P\.|Fam\.?\s*L\.?\s*R\.|Crim\.?\s*P\.|App\.?\s*P\.|Jud\.?\s*Admin\.?\s*2\.\d+|Gen\.\s*Prac\.\s*&\s*Jud\.\s*Admin\.)\s*\d+(?:\.\d+)?(?:\([a-z0-9]+\))?/g;

const CITATION_PATTERNS = [
  CASE_CITATION,
  USCODE_STATUTE,
  FLA_STATUE_FORWARD,
  FLA_STATUTE_REVERSED,
  FEDERAL_REPORTER,
  SUPREME_COURT_REPORTER,
  STATE_REPORTER,
  CFR_REGULATION,
  FED_REG,
  CONSTITUTIONAL,
  FEDERAL_RULES,
  FLORIDA_RULES,
];

// Short forms are extracted in a separate pass because they don't fit the
// "longest match wins" containment model — "id." legitimately appears inside
// many sentences, and short-form case cites ("Smith, 123 F.4th at 456") would
// be wrongly swallowed by CASE_CITATION's greedy party-name capture.
const SHORT_FORM_PATTERNS = [
  SHORT_FORM_CASE,
  ID_CITATION,
  SUPRA_INFRA_CITATION,
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

  const addMatch = (matchText: string, index: number) => {
    const citeText = matchText.trim().replace(/\s+/g, " ");
    const normKey = citeText.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!seen.has(normKey)) {
      seen.add(normKey);
      results.push({
        text: citeText,
        spanStart: index,
        spanEnd: index + matchText.length,
      });
    }
  };

  for (const pattern of CITATION_PATTERNS) {
    let match: RegExpExecArray | null;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      addMatch(match[0], match.index);
    }
  }

  // Containment filter — drop matches fully nested inside a longer match of
  // *different* text. Without this, "565 U.S. 368" is emitted as a separate
  // citation even though CASE_CITATION already captured the full
  // "Party v. Party, 565 U.S. 368 (2012)" span.
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

  // Short forms + parallel-citation rescue. These run AFTER the containment
  // filter so they can recover the parallel reporters that filter just
  // dropped (the inner "132 S. Ct. 945" of a "565 U.S. 368, 132 S. Ct. 945"
  // pair) and add short-form cites that the main patterns don't catch.
  const shortFormResults: Citation[] = [];

  // Short forms: id., supra, infra, "Smith, 123 F.4th at 456".
  for (const pattern of SHORT_FORM_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const citeText = match[0].trim().replace(/\s+/g, " ");
      const normKey = "short:" + citeText.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normKey)) {
        seen.add(normKey);
        shortFormResults.push({
          text: citeText,
          spanStart: match.index,
          spanEnd: match.index + match[0].length,
        });
      }
    }
  }

  // Parallel-citation rescue: walk each full CASE_CITATION match and emit any
  // reporter-shaped substrings inside it as standalone citations, so parallel
  // reporters survive the containment filter. "565 U.S. 368, 132 S. Ct. 945,
  // 181 L. Ed. 2d 953" → three separate citations, each independently
  // resolvable and verifiable.
  const reporterInsideCase =
    /\d+\s+(?:U\.S\.|S\.\s*Ct\.|L\.\s*Ed\.\s*(?:2d)?|F\.\s*(?:2d|3d|4th|Supp\.(?:\s*(?:2d|3d))?|App'x|Appx)|So\.\s*(?:2d|3d)?|Fla\.\s*(?:2d|3d)?|N\.W\.\s*(?:2d|3d)?|S\.E\.\s*(?:2d|3d)?|N\.E\.\s*(?:2d|3d)?|S\.W\.\s*(?:2d|3d)?|Pac\.\s*(?:2d|3d)?|Atl\.\s*(?:2d|3d)?)\s+\d+/g;
  const caseRegex = new RegExp(CASE_CITATION.source, CASE_CITATION.flags);
  let caseMatch: RegExpExecArray | null;
  while ((caseMatch = caseRegex.exec(text)) !== null) {
    const caseSpan = caseMatch[0];
    const caseStart = caseMatch.index;
    const inner = new RegExp(reporterInsideCase.source, "g");
    let innerMatch: RegExpExecArray | null;
    while ((innerMatch = inner.exec(caseSpan)) !== null) {
      const citeText = innerMatch[0].trim().replace(/\s+/g, " ");
      const normKey = citeText.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seen.has(normKey)) {
        seen.add(normKey);
        shortFormResults.push({
          text: citeText,
          spanStart: caseStart + innerMatch.index,
          spanEnd: caseStart + innerMatch.index + innerMatch[0].length,
        });
      }
    }
  }

  const all = [...filtered, ...shortFormResults];
  all.sort((a, b) => a.spanStart - b.spanStart);
  return all;
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
