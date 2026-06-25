export interface SupportAnalysisResult {
  citationText: string;
  propositionSupported: boolean | "inconclusive";
  confidence: number;
  evidenceSpans: { text: string; startOffset: number; endOffset: number }[];
  analysis: string;
  skipped: boolean;
  skipReason?: string;
}

const CASE_CITATION_PATTERN = /[A-Z][a-zA-Z'.\-]+ v\. [A-Z][a-zA-Z'.\-]+/;

function isCaseLawCitation(text: string): boolean {
  return CASE_CITATION_PATTERN.test(text);
}

function skippedResult(
  citationText: string,
  skipReason: string
): SupportAnalysisResult {
  return {
    citationText,
    propositionSupported: "inconclusive",
    confidence: 0,
    evidenceSpans: [],
    analysis: `Skipped: ${skipReason}`,
    skipped: true,
    skipReason,
  };
}

function inconclusiveResult(
  citationText: string,
  analysis: string
): SupportAnalysisResult {
  return {
    citationText,
    propositionSupported: "inconclusive",
    confidence: 0,
    evidenceSpans: [],
    analysis,
    skipped: false,
  };
}

export class SupportAnalyst {
  private llmApiKey: string | undefined;
  private llmBaseUrl: string;

  constructor(llmApiKey?: string, llmBaseUrl?: string) {
    this.llmApiKey = llmApiKey;
    this.llmBaseUrl = llmBaseUrl ?? "https://openrouter.ai/api/v1";
  }

  async analyzeCitation(params: {
    citation: { text: string };
    sourceContent: string;
    caseLawOnly: boolean;
  }): Promise<SupportAnalysisResult> {
    const { citation, sourceContent, caseLawOnly } = params;

    if (caseLawOnly && !isCaseLawCitation(citation.text)) {
      return skippedResult(citation.text, "Not case law");
    }

    if (!this.llmApiKey) {
      return skippedResult(citation.text, "LLM not configured");
    }

    try {
      const response = await fetch(`${this.llmBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.llmApiKey}`,
          "HTTP-Referer": "https://legalciter.app",
          "X-Title": "Legal Citer",
        },
        body: JSON.stringify({
          model: "openai/gpt-5.5",
          reasoning: { effort: "xhigh" },
          temperature: 1,
          messages: [
            {
              role: "system",
              content:
                "You are a legal citation support analyst. Analyze whether the cited proposition is supported by the source text. Return JSON with: propositionSupported (boolean or 'inconclusive'), confidence (0-1), evidenceSpans (array of {text, startOffset, endOffset}), analysis (string explanation). If the source text is insufficient, return inconclusive.",
            },
            {
              role: "user",
              content: `Citation: ${citation.text}\n\nSource content:\n${sourceContent}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        return inconclusiveResult(
          citation.text,
          `LLM request failed: ${response.status}`
        );
      }

      const data = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return inconclusiveResult(citation.text, "Empty LLM response");
      }

      const parsed = JSON.parse(content);

      return {
        citationText: citation.text,
        propositionSupported:
          parsed.propositionSupported === true ||
          parsed.propositionSupported === false
            ? parsed.propositionSupported
            : "inconclusive",
        confidence:
          typeof parsed.confidence === "number" ? parsed.confidence : 0,
        evidenceSpans: Array.isArray(parsed.evidenceSpans)
          ? parsed.evidenceSpans
          : [],
        analysis: typeof parsed.analysis === "string" ? parsed.analysis : "",
        skipped: false,
      };
    } catch {
      return inconclusiveResult(citation.text, "LLM analysis failed");
    }
  }
}
