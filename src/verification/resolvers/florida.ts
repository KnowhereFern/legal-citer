import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";
import { classifyCitation } from "../classifier";

// Matches the common forms a Florida statute citation takes in a brief:
//   "Fla. Stat. § 501.205"
//   "Fla. Stat. Ann. § 501.205"
//   "§ 501.205, Fla. Stat."
//   "§§ 501.205, 501.206" (range/list — we resolve the first section only)
// Florida section numbers are chapter.section: a 1-4 digit chapter, optional
// dot + subsection digits (e.g. 501.205, 95.11, 627.4015, 817.034).
const FLA_STATUTE_PATTERN = /§§?\s*(\d{1,4}(?:\.\d+)?)\b/;

// The Florida Senate publishes the current statutes at a stable, predictable
// URL: https://www.flsenate.gov/Laws/Statutes/{YEAR}/{SECTION}
// Both zero-padded ("0501.205") and bare ("501.205") section forms resolve;
// we use the bare form. The edition year is bumped annually after the regular
// legislative session concludes (typically July).
//
// There is no API and no auth; robots.txt asks for a 1-second crawl-delay,
// which the surrounding pipeline already satisfies (one resolve per citation,
// spaced by extraction/processing). Verified returning clean HTML for every
// section tested (501.205, 817.034, 95.11, 627.4015).
const BASE_URL = "https://www.flsenate.gov/Laws/Statutes";

// Current published edition. Update annually after the session concludes.
// (Fla. Stat. citations in briefs almost never pin a year — they cite "Fla.
// Stat." bare — so resolving to current is the expected behavior.)
const CURRENT_EDITION = "2025";

export class FloridaStatuteResolver implements AuthorityResolver {
  async resolve(citation: Citation): Promise<ResolverResult> {
    // Only Florida statutory citations are in scope. Federal statutes go to
    // GovInfo; case law goes to CourtListener/CAP/PACER.
    if (classifyCitation(citation) !== "statute") {
      return { status: "unresolved" };
    }

    // Reject non-Florida statutes outright. Without this gate, this resolver
    // would try to fetch "47 U.S.C. § 227" as section "227" of chapter "47"
    // from flsenate.gov, which would 404 (or worse, return a wrong section).
    if (!/\bFla\.\s*Stat\.(\s*Ann\.)?/i.test(citation.text)) {
      return { status: "unresolved" };
    }

    const match = citation.text.match(FLA_STATUTE_PATTERN);
    if (!match) return { status: "unresolved" };

    const section = match[1];
    const url = `${BASE_URL}/${CURRENT_EDITION}/${section}`;

    try {
      const response = await fetch(url, {
        headers: {
          // Identify the bot — flsenate.gov is a public records site and
          // publishes no ToS restricting programmatic access, but naming
          // ourselves is good citizenship.
          "User-Agent": "BaddieLegal-Research/1.0 (legal citation verification)",
          Accept: "text/html",
        },
      });

      // 404 means the section number doesn't exist in this edition (typo in
      // the brief, or a section that was renumbered). Not a source failure.
      if (response.status === 404) {
        return { status: "unresolved" };
      }
      if (!response.ok) {
        // 5xx / unexpected — the source had a problem, not the citation.
        return {
          status: "source_failure",
          error: `flsenate.gov returned HTTP ${response.status} for ${url}`,
        };
      }

      const html = await response.text();
      const content = stripHtml(html);

      // Defensive: if the page came back empty after stripping, treat as
      // unresolved rather than feeding an empty authority to quote_matching.
      if (!content.trim()) {
        return { status: "unresolved" };
      }

      return {
        status: "resolved",
        content,
        sourceId: `flsenate:${CURRENT_EDITION}/${section}`,
        metadata: {
          // Shape mirrors GovInfoResolver so the metadata check works without
          // case-by-case branching. Statutes carry no reporter/court; the
          // citation_metadata check is gated on case_law anyway (PR #11).
          citation: citation.text,
          section,
          edition: CURRENT_EDITION,
          sourceTitle: "Florida Statutes",
          dateFiled: null,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown Florida statute error";
      return {
        status: "source_failure",
        error: `Florida statute lookup failed: ${message}`,
      };
    }
  }
}

/**
 * Strip flsenate.gov HTML down to readable statute text.
 *
 * The section pages render the statute body inside <div class="Section"> with
 * nested <p> tags for subsections. We strip all tags and collapse whitespace,
 * which yields the plain text of the section (history line, source notes, and
 * all — same as GovInfo returns for U.S.C.).
 *
 * flsenate.gov emits several HTML entities (named and numeric hex) that we
 * decode explicitly — including the numeric hex form (&#x2003; etc.), which
 * Node's built-in htmlEntities table does not always collapse to plain text.
 */
function stripHtml(html: string): string {
  // Try to isolate the section body first; fall back to the whole document
  // if the markup doesn't match (defensive against flsenate.gov redesigns).
  const sectionMatch = html.match(
    /<div[^>]*class="[^"]*Section[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/,
  );
  const scope = sectionMatch ? sectionMatch[1] : html;

  return scope
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
