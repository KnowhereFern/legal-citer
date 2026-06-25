import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";
import { classifyCitation } from "../classifier";

const USC_PATTERN = /(\d+)\s+U\.S\.C\.\s*§§?\s*([\w\-]+)/;

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export class GovInfoResolver implements AuthorityResolver {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? "";
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    if (classifyCitation(citation) !== "statute") {
      return { status: "unresolved" };
    }

    const match = citation.text.match(USC_PATTERN);
    if (!match) return { status: "unresolved" };

    const title = match[1];
    const section = match[2];

    const params = this.apiKey ? `?api_key=${this.apiKey}` : "";
    const url = `https://api.govinfo.gov/content/pkg/USCODE-2024-title${title}/xml/USCODE-2024-title${title}-sect${section}.xml${params}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        return {
          status: "unresolved",
          error: `GovInfo returned ${response.status}`,
        };
      }

      const xml = await response.text();
      const content = stripXmlTags(xml);

      if (!content || content.length < 10) {
        return { status: "unresolved" };
      }

      return {
        status: "resolved",
        content,
        sourceId: `govinfo:USCODE-2024-title${title}-sect${section}`,
        metadata: { title, section },
      };
    } catch (err) {
      return {
        status: "source_failure",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
