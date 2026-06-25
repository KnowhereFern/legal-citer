import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";
import type { PacerAuthManager } from "./pacer-auth";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const PCL_BASE_URL = "https://pcl.uscourts.gov/pcl-public-api/rest";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface PCLSearchResult {
  caseId?: string;
  caseName?: string;
  caseNumber?: string;
  courtId?: string;
  dateFiled?: string;
  documents?: Array<{
    documentId?: string;
    documentType?: string;
    pageCount?: number;
  }>;
}

interface PCLSearchResponse {
  totalMatches?: number;
  cases?: PCLSearchResult[];
}

interface PCLDocumentResponse {
  documentId?: string;
  plainText?: string;
  html?: string;
}

export class PacerResolver implements AuthorityResolver {
  private authManager: PacerAuthManager;

  constructor(authManager: PacerAuthManager) {
    this.authManager = authManager;
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    try {
      const token = await this.authManager.getToken();

      const searchResult = await this.searchPCL(token, citation.text);

      if (
        !searchResult.cases ||
        searchResult.cases.length === 0
      ) {
        return { status: "unresolved" };
      }

      const caseEntry = searchResult.cases[0];

      if (
        !caseEntry.documents ||
        caseEntry.documents.length === 0
      ) {
        return {
          status: "resolved",
          content: "",
          sourceId: "pacer",
          metadata: {
            caseName: caseEntry.caseName ?? null,
            caseNumber: caseEntry.caseNumber ?? null,
            courtId: caseEntry.courtId ?? null,
            dateFiled: caseEntry.dateFiled ?? null,
            citation: citation.text,
          },
        };
      }

      const opinionDoc = caseEntry.documents.find(
        (d) =>
          d.documentType &&
          /opinion|order|memorandum/i.test(d.documentType),
      );

      const targetDoc = opinionDoc ?? caseEntry.documents[0];

      if (!targetDoc.documentId) {
        return { status: "unresolved" };
      }

      const docContent = await this.fetchDocument(
        token,
        targetDoc.documentId,
      );

      const content =
        docContent.plainText || docContent.html || "";

      if (!content) {
        return { status: "unresolved" };
      }

      return {
        status: "resolved",
        content,
        sourceId: "pacer",
        metadata: {
          caseName: caseEntry.caseName ?? null,
          caseNumber: caseEntry.caseNumber ?? null,
          courtId: caseEntry.courtId ?? null,
          dateFiled: caseEntry.dateFiled ?? null,
          citation: citation.text,
          documentId: targetDoc.documentId,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "source_failure",
        error: `PACER error: ${message}`,
      };
    }
  }

  private async searchPCL(
    token: string,
    citationText: string,
  ): Promise<PCLSearchResponse> {
    const encodedCite = encodeURIComponent(citationText);
    const url = `${PCL_BASE_URL}/cases/search?caseNumber=${encodedCite}`;

    const response = await this.fetchWithRetry(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: `nextGenCSO=${token}`,
      },
    });

    if (response.status === 404) {
      return { totalMatches: 0, cases: [] };
    }

    if (!response.ok) {
      throw new Error(
        `PCL search failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<PCLSearchResponse>;
  }

  private async fetchDocument(
    token: string,
    documentId: string,
  ): Promise<PCLDocumentResponse> {
    const url = `${PCL_BASE_URL}/documents/${documentId}`;

    const response = await this.fetchWithRetry(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: `nextGenCSO=${token}`,
      },
    });

    if (!response.ok) {
      return {};
    }

    return response.json() as Promise<PCLDocumentResponse>;
  }

  private async fetchWithRetry(
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
}
