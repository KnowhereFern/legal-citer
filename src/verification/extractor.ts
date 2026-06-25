import mammoth from "mammoth";
import pdf from "pdf-parse";
import type { ExtractedDocument } from "@/lib/types";

import { extractCitations, extractQuotedSpans } from "./citations";

function buildParagraphMap(text: string): ExtractedDocument["paragraphs"] {
  const raw = text.split(/\n{2,}/);
  return raw
    .map((p, i) => ({ index: i, text: p.trim(), page: 1 }))
    .filter((p) => p.text.length > 0);
}

function buildParagraphMapFromPages(
  pages: string[]
): ExtractedDocument["paragraphs"] {
  const paragraphs: ExtractedDocument["paragraphs"] = [];
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const raw = pages[pageIdx].split(/\n{2,}/);
    for (const block of raw) {
      const trimmed = block.trim();
      if (trimmed.length > 0) {
        paragraphs.push({
          index: paragraphs.length,
          text: trimmed,
          page: pageIdx + 1,
        });
      }
    }
  }
  return paragraphs;
}

async function extractFromDocx(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;
    const paragraphs = buildParagraphMap(text);
    const citations = extractCitations(text);
    const quotedSpans = extractQuotedSpans(text);
    return {
      text,
      paragraphs,
      citations,
      quotedSpans,
      pageCount: 1,
    };
  } catch {
    return {
      text: "",
      paragraphs: [],
      citations: [],
      quotedSpans: [],
      pageCount: 0,
    };
  }
}

async function extractFromPdf(buffer: Buffer): Promise<ExtractedDocument> {
  try {
    const data = await pdf(buffer);
    const text = data.text;
    const numPages = data.numpages;

    let paragraphs: ExtractedDocument["paragraphs"];

    const rawData = data as unknown as Record<string, unknown>;
    if (
      typeof rawData.textByPage === "object" &&
      rawData.textByPage !== null
    ) {
      const pages = rawData.textByPage as Record<string, string>;
      const pageTexts = Object.keys(pages)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => pages[k]);
      paragraphs = buildParagraphMapFromPages(pageTexts);
    } else {
      paragraphs = buildParagraphMap(text).map((p) => ({
        ...p,
        page: 1,
      }));
    }

    const citations = extractCitations(text);
    const quotedSpans = extractQuotedSpans(text);

    return {
      text,
      paragraphs,
      citations,
      quotedSpans,
      pageCount: numPages,
    };
  } catch {
    return {
      text: "",
      paragraphs: [],
      citations: [],
      quotedSpans: [],
      pageCount: 0,
    };
  }
}

export async function extractDocument(
  buffer: Buffer,
  contentType: string
): Promise<ExtractedDocument> {
  if (
    contentType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return extractFromDocx(buffer);
  }

  if (contentType === "application/pdf") {
    return extractFromPdf(buffer);
  }

  return {
    text: "",
    paragraphs: [],
    citations: [],
    quotedSpans: [],
    pageCount: 0,
  };
}

export { extractFromDocx, extractFromPdf };
