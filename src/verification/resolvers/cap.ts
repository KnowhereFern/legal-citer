import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";

const BASE_URL = "https://api.case.law/v1";

const REPORTER_ABBREVIATIONS: Record<string, string[]> = {
  "U.S.": ["U.S."],
  "S.Ct.": ["S. Ct.", "S.Ct."],
  "L.Ed.": ["L. Ed.", "L.Ed."],
  "L.Ed.2d": ["L. Ed. 2d", "L.Ed.2d"],
  "F.": ["F."],
  "F.2d": ["F.2d", "F. 2d"],
  "F.3d": ["F.3d", "F. 3d"],
  "F.4th": ["F.4th", "F. 4th"],
  "F. Supp.": ["F. Supp.", "F.Supp."],
  "F. Supp. 2d": ["F. Supp. 2d", "F.Supp.2d"],
  "F. Supp. 3d": ["F. Supp. 3d", "F.Supp.3d"],
  "B.R.": ["B.R.", "B. R."],
  "Vt.": ["Vt."],
  "N.Y.S.": ["N.Y.S.", "N. Y. S."],
  "N.E.": ["N.E.", "N. E."],
  "N.W.": ["N.W.", "N. W."],
  "S.E.": ["S.E.", "S. E."],
  "So.": ["So.", "So. "],
  "P.": ["P."],
  "P.2d": ["P.2d", "P. 2d"],
  "P.3d": ["P.3d", "P. 3d"],
  "A.": ["A."],
  "A.2d": ["A.2d", "A. 2d"],
  "A.3d": ["A.3d", "A. 3d"],
  "Cal.": ["Cal."],
  "Cal. App.": ["Cal. App.", "Cal.App."],
  "Tex.": ["Tex."],
  "Ill.": ["Ill."],
  "Ohio St.": ["Ohio St.", "Ohio St."],
};

interface CAPCaseResult {
  count: number;
  results: Array<{
    case_name: string;
    decision_date: string;
    url: string;
    frontend_url: string;
    citations: Array<{ cite: string; reporter: string }>;
    court: { name: string; url: string };
    body_text?: string;
  }>;
}

interface CAPCaseDetail {
  case_name: string;
  decision_date: string;
  body_text?: string;
  court: { name: string; url: string };
  citations: Array<{ cite: string; reporter: string }>;
}

export class CAPResolver implements AuthorityResolver {
  async resolve(citation: Citation): Promise<ResolverResult> {
    try {
      const parsed = this.parseCitation(citation.text);
      if (!parsed) {
        return { status: "unresolved" };
      }

      const searchResult = await this.searchCases(citation.text);

      if (
        !searchResult.results ||
        searchResult.results.length === 0
      ) {
        return { status: "unresolved" };
      }

      const caseEntry = searchResult.results[0];

      let caseText = caseEntry.body_text ?? "";
      if (!caseText && caseEntry.url) {
        const detail = await this.fetchCaseDetail(caseEntry.url);
        caseText = detail.body_text ?? "";
      }

      if (!caseText) {
        return { status: "unresolved" };
      }

      return {
        status: "resolved",
        content: caseText,
        sourceId: "cap",
        metadata: {
          caseName: caseEntry.case_name,
          citation: citation.text,
          court: caseEntry.court?.name ?? null,
          dateFiled: caseEntry.decision_date ?? null,
          ...parsed,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return {
        status: "source_failure",
        error: `CAP API error: ${message}`,
      };
    }
  }

  parseCitation(
    text: string,
  ): { volume: number; reporter: string; page: number } | null {
    const normalized = text.trim().replace(/\s+/g, " ");

    const patterns = [
      /^(\d+)\s+([A-Za-z][A-Za-z\s.]*?)\s+(\d+)$/,
      /^(\d+)\s+(\S+)\s+(\d+)$/,
    ];

    for (const pattern of patterns) {
      const match = normalized.match(pattern);
      if (match) {
        const volume = parseInt(match[1], 10);
        const reporter = match[2].trim();
        const page = parseInt(match[3], 10);

        if (this.isValidReporter(reporter)) {
          return { volume, reporter, page };
        }
      }
    }

    return null;
  }

  private isValidReporter(reporter: string): boolean {
    for (const variants of Object.values(REPORTER_ABBREVIATIONS)) {
      if (variants.includes(reporter)) {
        return true;
      }
    }

    if (/^[A-Z][A-Za-z.]+\d*(?:d|th)?$/.test(reporter)) {
      return true;
    }

    return false;
  }

  private async searchCases(cite: string): Promise<CAPCaseResult> {
    const encodedCite = encodeURIComponent(cite);
    const url = `${BASE_URL}/cases/?cite=${encodedCite}&format=json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `CAP search failed: ${response.status} ${response.statusText}`,
      );
    }

    return response.json() as Promise<CAPCaseResult>;
  }

  private async fetchCaseDetail(
    caseUrl: string,
  ): Promise<CAPCaseDetail> {
    const url = caseUrl.includes("?")
      ? `${caseUrl}&format=json`
      : `${caseUrl}?format=json`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `CAP case detail fetch failed: ${response.status}`,
      );
    }

    return response.json() as Promise<CAPCaseDetail>;
  }
}
