import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";
import { classifyCitation } from "../classifier";

// Matches "42 U.S.C. § 1983" and "42 U.S.C. §§ 1983-1985" (we take the first
// section for lookup; range resolution is out of scope).
const USC_PATTERN = /(\d+)\s+U\.S\.C\.\s*§§?\s*([\w\-]+)/;

const SEARCH_URL = "https://api.govinfo.gov/search";

// api.data.gov services publish a DEMO_KEY that works at low volume
// (~50 requests/day). When no GOVINFO_API_KEY is configured we fall back to
// it so statutes resolve out-of-the-box; set GOVINFO_API_KEY for higher
// rate limits.
const DEMO_KEY = "DEMO_KEY";

interface GovInfoSearchHit {
  packageId?: string;
  granuleId?: string;
  title?: string;
  dateIssued?: string;
  download?: {
    // GovInfo returns full URLs for each published format. The granule-level
    // links are what we want; package-level zipLink/xmlLink are fallbacks.
    txtLink?: string;
    htmLink?: string;
    pdfLink?: string;
    modsLink?: string;
    zipLink?: string;
    premisLink?: string;
  };
}

interface GovInfoSearchResponse {
  count?: number;
  results?: GovInfoSearchHit[];
  error?: { code?: string; message?: string };
}

function stripTags(markup: string): string {
  return markup
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Thrown when GovInfo can't be reached due to rate limits or missing
 * credentials — operationally unreachable, not "the citation doesn't exist."
 * The caller maps this to `unresolved` (not `source_failure`) so the user
 * sees a soft "couldn't verify" rather than a scary per-citation "Error"
 * just because the shared DEMO_KEY quota was tapped out.
 */
class GovInfoUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GovInfoUnreachableError";
  }
}

export class GovInfoResolver implements AuthorityResolver {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOVINFO_API_KEY || DEMO_KEY;
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    // Only U.S.C. statutory citations are in scope; case law / regulations
    // are handled by other resolvers in the chain.
    if (classifyCitation(citation) !== "statute") {
      return { status: "unresolved" };
    }

    const match = citation.text.match(USC_PATTERN);
    if (!match) return { status: "unresolved" };

    const title = match[1];
    const section = match[2];

    try {
      const hit = await this.searchSection(title, section);
      if (!hit) {
        return { status: "unresolved" };
      }

      const content = await this.fetchContent(hit);

      return {
        status: "resolved",
        // Empty content is acceptable: citation_existence treats "resolved"
        // as PASS regardless, and quote_matching falls back to NOT_APPLICABLE
        // when content is absent.
        content,
        sourceId: hit.granuleId
          ? `govinfo:${hit.granuleId}`
          : hit.packageId
            ? `govinfo:${hit.packageId}`
            : "govinfo",
        metadata: {
          title,
          section,
          packageId: hit.packageId ?? null,
          granuleId: hit.granuleId ?? null,
          citation: citation.text,
          dateFiled: hit.dateIssued ?? null,
          sourceTitle: hit.title ?? null,
        },
      };
    } catch (error) {
      // Rate-limit / auth failures mean the source was unreachable, not that
      // the citation is invalid. Surface as unresolved so the user sees a
      // soft "couldn't verify" (and citation_metadata/quote_matching N/A
      // themselves per the cascading-findings fix) rather than a per-citation
      // "Error" that inflates the failure count.
      if (error instanceof GovInfoUnreachableError) {
        return { status: "unresolved", error: error.message };
      }
      const message =
        error instanceof Error ? error.message : "Unknown GovInfo error";
      return {
        status: "source_failure",
        error: `GovInfo error: ${message}`,
      };
    }
  }

  /**
   * Search GovInfo for the most recent USCODE granule matching the given
   * title + section. Sorting by dateIssued DESC returns the current edition
   * regardless of which year's package it lives in (USCODE-2024, USCODE-2026,
   * etc.), which is why this replaced the hardcoded-edition direct fetch.
   */
  private async searchSection(
    title: string,
    section: string,
  ): Promise<GovInfoSearchHit | null> {
    const body = {
      query: `collection:(USCODE) AND packageId:USCODE-*title${title}* AND granuleId:*sect${section}*`,
      offsetMark: "*",
      pageSize: "1",
      sorts: [{ field: "dateIssued", sortOrder: "DESC" }],
    };

    const url = `${SEARCH_URL}?api_key=${encodeURIComponent(this.apiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // 429 / OVER_RATE_LIMIT surfaces as a JSON body even with HTTP 200 in
      // some api.data.gov paths, so also parse the error code below.
      if (response.status === 429 || response.status === 401 || response.status === 403) {
        throw new GovInfoUnreachableError(
          `GovInfo search unreachable (HTTP ${response.status}). Set GOVINFO_API_KEY for higher limits.`,
        );
      }
      throw new Error(
        `GovInfo search failed: HTTP ${response.status} ${response.statusText}`,
      );
    }

    const data = (await response.json()) as GovInfoSearchResponse;

    // api.data.gov sometimes returns 200 + an error body for rate limits.
    if (data.error) {
      throw new GovInfoUnreachableError(
        `GovInfo ${data.error.code ?? "error"}: ${data.error.message ?? "rate limited"}`,
      );
    }

    const results = data.results ?? [];
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Fetch readable text for a search hit. Prefer the granule's HTM (smallest,
   * cleanest text), then fall back to the package-level XML. GovInfo does not
   * reliably publish per-section XML despite the URL convention, so we use the
   * download links the search response itself provides — they're guaranteed
   * valid for this result.
   */
  private async fetchContent(hit: GovInfoSearchHit): Promise<string> {
    const links = hit.download ?? {};

    // HTM granule → strip tags to plain text.
    if (links.htmLink) {
      const text = await this.fetchUrlAsText(links.htmLink);
      const stripped = stripTags(text);
      if (stripped.length > 0) return stripped;
    }

    // TXT granule (already plain text when published).
    if (links.txtLink) {
      const text = await this.fetchUrlAsText(links.txtLink);
      if (text.trim().length > 0) return text.trim();
    }

    // MODS is structured XML metadata; usable as a last resort for content.
    if (links.modsLink) {
      const text = await this.fetchUrlAsText(links.modsLink);
      const stripped = stripTags(text);
      if (stripped.length > 0) return stripped;
    }

    return "";
  }

  private async fetchUrlAsText(url: string): Promise<string> {
    // GovInfo download links don't require the API key, but appending it
    // doesn't hurt and avoids any rate limiting on the content CDN.
    const separator = url.includes("?") ? "&" : "?";
    const keyedUrl = url.includes("api_key=")
      ? url
      : `${url}${separator}api_key=${encodeURIComponent(this.apiKey)}`;

    const response = await fetch(keyedUrl);
    if (!response.ok) {
      throw new Error(
        `GovInfo content fetch failed: HTTP ${response.status}`,
      );
    }
    return response.text();
  }
}
