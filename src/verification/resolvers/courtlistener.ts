import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const BASE_URL = "https://www.courtlistener.com/api/rest/v3";

interface CitationLookupResult {
  clusters: Array<{
    case_name: string;
    citations: Array<{ cite: string }>;
    date_filed: string;
    sub_opinions: Array<{ resource_uri: string }>;
  }>;
}

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
          await sleep(RETRY_DELAY_MS * (attempt + 1));
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
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private get headers(): Record<string, string> {
    return {
      Authorization: `Token ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    try {
      const lookupResult = await this.lookupCitation(citation.text);

      if (
        !lookupResult.clusters ||
        lookupResult.clusters.length === 0
      ) {
        return { status: "unresolved" };
      }

      const cluster = lookupResult.clusters[0];
      const subOpinions = cluster.sub_opinions;

      if (!subOpinions || subOpinions.length === 0) {
        return { status: "unresolved" };
      }

      const opinionUrl = subOpinions[0].resource_uri;
      const opinion = await this.fetchOpinion(opinionUrl);

      const caseName =
        (cluster.case_name as string) ?? "Unknown Case";
      const citationText =
        cluster.citations?.[0]?.cite ?? citation.text;
      const dateFiled = cluster.date_filed ?? null;

      return {
        status: "resolved",
        content: opinion.plain_text || opinion.html || "",
        sourceId: "courtlistener",
        metadata: {
          caseName,
          citation: citationText,
          court: this.extractCourtFromUrl(opinion.cluster),
          dateFiled,
        },
      };
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
  ): Promise<CitationLookupResult> {
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

    return response.json() as Promise<CitationLookupResult>;
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
