import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000;
const RATE_LIMIT_DELAY_MS = 13000;
const BASE_URL = "https://www.courtlistener.com/api/rest/v4";

interface CitationLookupResult {
  clusters: Array<{
    case_name: string;
    citations: Array<{ cite: string }>;
    date_filed: string;
    sub_opinions: string[];
  }>;
}

type CitationLookupResponse = CitationLookupResult[];

interface OpinionResponse {
  plain_text: string;
  html: string;
  cluster: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries: number = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (response.status === 429) {
        if (attempt < retries) {
          let waitMs = RATE_LIMIT_DELAY_MS;
          try {
            const body = await response.clone().json();
            const match = typeof body?.detail === "string"
              ? body.detail.match(/available in (\d+) seconds/i)
              : null;
            if (match) {
              waitMs = (parseInt(match[1], 10) + 1) * 1000;
            }
          } catch {}
          await sleep(waitMs);
          continue;
        }
        return response;
      }

      if (response.status >= 500 && attempt < retries) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw lastError ?? new Error("Request failed after retries");
}

export class CourtListenerResolver implements AuthorityResolver {
  private apiKey?: string;

  // apiKey is optional: CourtListener's citation-lookup endpoint permits
  // low-volume unauthenticated reads. When a key is configured it is sent
  // for higher rate limits; when absent we still try anonymously rather
  // than skipping the source entirely (which would leave case law with no
  // resolver at all if no other source is configured).
  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      h.Authorization = `Token ${this.apiKey}`;
    }
    return h;
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    try {
      const lookupResult = await this.lookupCitation(citation.text);

      // The citation-lookup endpoint returns one entry per submitted
      // citation, each carrying a `clusters` array (cases that match) and
      // each cluster carrying `sub_opinions` (the actual opinion URLs).
      // Historically this code only inspected lookupResult[0].clusters[0]
      // and sub_opinions[0], so a citation whose first cluster had no
      // opinions — but whose second cluster did — was wrongly marked
      // unresolved. Iterate all of them and take the first opinion we can
      // actually fetch.
      for (const hit of lookupResult) {
        for (const cluster of hit.clusters ?? []) {
          const subOpinions = cluster.sub_opinions ?? [];
          for (const opinionUrl of subOpinions) {
            if (!opinionUrl) continue;
            try {
              const opinion = await this.fetchOpinion(opinionUrl);
              const content = opinion.plain_text || opinion.html || "";
              if (!content) continue;

              const caseName =
                (cluster.case_name as string) ?? "Unknown Case";
              const citationText =
                cluster.citations?.[0]?.cite ?? citation.text;
              const dateFiled = cluster.date_filed ?? null;

              return {
                status: "resolved",
                content,
                sourceId: "courtlistener",
                metadata: {
                  caseName,
                  citation: citationText,
                  court: this.extractCourtFromUrl(opinion.cluster),
                  dateFiled,
                  // Parsed subfields consumed by citation_metadata. Without
                  // these, that check false-fails every CL-resolved citation
                  // that contains a reporter ("... no reporter metadata").
                  reporter: parseReporter(citationText),
                  year: parseYear(dateFiled),
                },
              };
            } catch {
              // This opinion failed to fetch (404, network, etc.) —
              // try the next one in the cluster rather than failing
              // the whole citation.
              continue;
            }
          }
        }
      }

      return { status: "unresolved" };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "source_failure",
        error: `CourtListener API error: ${message}`,
      };
    }
  }

  private async lookupCitation(
    text: string,
  ): Promise<CitationLookupResponse> {
    const url = `${BASE_URL}/citation-lookup/`;
    const body = new URLSearchParams();
    body.append("text", text);

    const response = await fetchWithRetry(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      throw new Error(
        `Citation lookup failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<CitationLookupResponse>;
  }

  private async fetchOpinion(
    opinionUrl: string,
  ): Promise<OpinionResponse> {
    const url = opinionUrl.includes("?")
      ? `${opinionUrl}&format=json`
      : `${opinionUrl}?format=json`;

    const response = await fetchWithRetry(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(
        `Opinion fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<OpinionResponse>;
  }

  private extractCourtFromUrl(clusterUrl: string): string | null {
    try {
      const match = clusterUrl.match(/\/court\/([^/]+)\//);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

/**
 * Parse the reporter token out of a canonical citation string
 * ("565 U.S. 368" → "U.S.", "74 F.4th 1336" → "F.4th"). A canonical
 * citation is "{volume} {reporter} {page}", so the reporter is the middle
 * segment between the leading and trailing numbers. Returns null when the
 * string doesn't match that shape (e.g. null, slip opinions, statutes).
 *
 * The citation_metadata check uses this to avoid a false "no reporter
 * metadata" failure: previously it flagged any resolved case citation whose
 * text contained a reporter but whose authority metadata had no `reporter`
 * field — which fired for every CourtListener hit, because CourtListener
 * only returned the canonical citation STRING, not a parsed reporter.
 */
function parseReporter(canonicalCitation: string | null | undefined): string | null {
  if (!canonicalCitation) return null;
  const match = canonicalCitation.match(/^\d+\s+(.+?)\s+\d+/);
  return match ? match[1] : null;
}

/**
 * Extract the 4-digit year from an ISO date string ("2012-03-21" → 2012)
 * or from a bare year ("2012" → 2012). Returns null when no year is found.
 * Used by citation_metadata to populate meta.year so the year-mismatch
 * check has something to compare against.
 */
function parseYear(dateFiled: string | null | undefined): number | null {
  if (!dateFiled) return null;
  const match = String(dateFiled).match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : null;
}
