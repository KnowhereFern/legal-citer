import { getJurisdiction } from "@/lib/jurisdictions";
import { AI_TOOLS, type AiAssisted } from "@/lib/constants";

export interface DisclosureGuidanceInput {
  jurisdictionKey?: string | null;
  aiAssisted?: string | null;
  aiTool?: string | null;
}

export interface DisclosureGuidance {
  /** Visual weight: "info" (neutral), "action" (you need to do something), "none" (nothing required). */
  tone: "info" | "action" | "none";
  heading: string;
  body: string;
  /** Whether this jurisdiction's order requires naming the specific AI tool(s) on the filing. */
  mustNameTools: boolean;
}

/**
 * Map an AI tool value (e.g. "chatgpt") to its display label (e.g. "ChatGPT").
 */
export function aiToolLabel(value?: string | null): string | null {
  if (!value) return null;
  return AI_TOOLS.find((t) => t.value === value)?.label ?? value;
}

/**
 * Answers the practical question every AI-aware standing order raises:
 * "Do I need disclosure language in this filing, and if so, what?"
 *
 * Driven entirely by JurisdictionConfig (requiresToolDisclosure, placementNote,
 * filingBlockText) plus the user's answer to whether generative AI was used.
 */
export function getDisclosureGuidance(
  input: DisclosureGuidanceInput
): DisclosureGuidance {
  const { jurisdictionKey, aiAssisted, aiTool } = input;
  const config = getJurisdiction(jurisdictionKey ?? "");
  const aiUsed: AiAssisted | undefined = isAiAssistedValue(aiAssisted)
    ? (aiAssisted as AiAssisted)
    : undefined;

  const toolName = aiToolLabel(aiTool);
  const mustNameTools = config.requiresToolDisclosure;

  // --- No generative AI used -------------------------------------------------
  if (aiUsed === "no") {
    return {
      tone: "none",
      heading: "No generative-AI disclosure required",
      body:
        "Generative AI was not used to prepare this filing, so no AI-use disclosure is needed. " +
        "Traditional AI tools — rule-based legal research, spelling and grammar checks, and " +
        "similar deterministic aids — generally do not require disclosure under the AI standing " +
        "orders we model. The verification certification below still applies to this filing.",
      mustNameTools: false,
    };
  }

  // --- AI used (yes) or unsure ----------------------------------------------
  // The 17th Circuit is the strict model: tool name(s) must appear on the face of the filing.
  if (mustNameTools) {
    return {
      tone: "action",
      heading: "Disclosure required — name the AI tool(s) on the filing",
      body: aiUsed === "unsure"
        ? `If generative AI was used, ${shortCourt(config.label)} requires disclosure on the face of the filing that identifies the specific tool(s) used. When in doubt, disclose. ${toolSuffix(toolName)}This certification does not replace the court's required certification that factual assertions, legal authority, and citations were independently reviewed.`
        : `${shortCourt(config.label)} requires disclosure on the face of the filing that identifies the specific AI tool(s) used. ${toolSuffix(toolName)}The certification also requires you to certify that factual assertions, legal authority, and citations were independently reviewed and verified. Noncompliance may be sanctioned.`,
      mustNameTools: true,
    };
  }

  // Jurisdictions that recommend a certification block but do not require naming the tool.
  // 11th / 18th-style orders: cert block above the signature; 2.515 statewide: no separate disclosure.
  const isStatewide = jurisdictionKey === "florida_rule_2515";
  const isFederal = jurisdictionKey === "federal_rule_11";

  if (isStatewide) {
    return {
      tone: "info",
      heading: "No separate AI disclosure required by the statewide rule",
      body:
        "Florida Rule 2.515(d)(2) does not require a separate AI-use disclosure — the representation " +
        "as to legal authorities is made by signing the filing. The 11th/18th-circuit certification " +
        "block below is available as optional enhanced disclosure if you prefer to state explicitly " +
        "that AI was used. " +
        toolSuffix(toolName),
      mustNameTools: false,
    };
  }

  if (isFederal) {
    return {
      tone: "info",
      heading: "Check your judge's local standing order",
      body:
        "Federal Rule 11(b) certification is made by signing the filing and does not itself require " +
        "AI disclosure. However, individual federal judges issue standing orders with AI-specific " +
        "requirements — check your court's local rules and the presiding judge's procedures. " +
        toolSuffix(toolName),
      mustNameTools: false,
    };
  }

  // 11th / 18th-style superseded orders: certification block recommended above the signature.
  return {
    tone: "action",
    heading: "Recommended: add the AI-use certification block",
    body: aiUsed === "unsure"
      ? `If generative AI was used, ${shortCourt(config.label)} calls for a certification that all factual assertions, legal authority, and citations were independently reviewed — placed at the conclusion of the filing or immediately above the signature block. When in doubt, include it. ${toolSuffix(toolName)}`
      : `${shortCourt(config.label)} calls for a certification that all factual assertions, legal authority, and citations were independently reviewed and verified — placed at the conclusion of the filing or immediately above the signature block. ${toolSuffix(toolName)}`,
    mustNameTools: false,
  };
}

function isAiAssistedValue(v: unknown): v is AiAssisted {
  return v === "yes" || v === "no" || v === "unsure";
}

/** "Florida — 11th Circuit (Miami-Dade) AO 26-04 (superseded)" -> "this court" */
function shortCourt(label: string): string {
  // Keep it simple and reference the court generically; the full label appears in the select.
  void label;
  return "this court's standing order";
}

/** Trailing sentence about the named tool, if the user selected one. */
function toolSuffix(toolName: string | null): string {
  if (!toolName) return "";
  return `You indicated ${toolName} was used. `;
}
