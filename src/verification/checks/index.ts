import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import { citationExistenceCheck } from "./citation-existence";
import { citationMetadataCheck } from "./citation-metadata";
import { quoteMatchingCheck } from "./quote-matching";

export interface VerificationCheck {
  name: string;
  execute(
    citation: Citation,
    document: ExtractedDocument,
    resolver: { resolve: (citation: Citation) => Promise<ResolverResult> }
  ): Promise<import("@/lib/types").CheckResult>;
}

const checks: Map<string, VerificationCheck> = new Map();

function registerCheck(check: VerificationCheck) {
  checks.set(check.name, check);
}

registerCheck(citationExistenceCheck);
registerCheck(citationMetadataCheck);
registerCheck(quoteMatchingCheck);

export function getCheck(name: string): VerificationCheck | undefined {
  return checks.get(name);
}

export function getAllChecks(): VerificationCheck[] {
  return Array.from(checks.values());
}
