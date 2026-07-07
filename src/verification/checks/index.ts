import type { Citation, ExtractedDocument, ResolverResult } from "@/lib/types";
import { citationExistenceCheck } from "./citation-existence";
import { citationMetadataCheck } from "./citation-metadata";
import { pinpointAccuracyCheck } from "./pinpoint-accuracy";
import { quoteMatchingCheck } from "./quote-matching";
import { signalCorrectnessCheck } from "./signal-correctness";
import { statuteCurrencyCheck } from "./statute-currency";
import { subsequentHistoryCheck } from "./subsequent-history";

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
registerCheck(subsequentHistoryCheck);
registerCheck(pinpointAccuracyCheck);
registerCheck(statuteCurrencyCheck);
registerCheck(signalCorrectnessCheck);

export function getCheck(name: string): VerificationCheck | undefined {
  return checks.get(name);
}

export function getAllChecks(): VerificationCheck[] {
  return Array.from(checks.values());
}
