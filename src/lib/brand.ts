export const BRAND = {
  company: "BaddieLegal",
  product: "BaddieLegal Verify",
  artifact: "Pre-Filing Verification Record",
  artifactSummary: "AI Use & Citation Verification Summary",
  tagline: "Receipts for every cite.",
  headline: "Check your filing before you file",
  subheadline:
    "Upload a legal filing. BaddieLegal checks citations, quotes, and AI-use disclosure issues, then creates a clean verification record you can review, save, or attach.",
  domain: "baddielegal.com",
  baseUrl: "https://baddielegal.com",
  verificationPathPrefix: "/v",
} as const;

export function publicVerificationUrl(verificationId: string): string {
  return `${BRAND.baseUrl}${BRAND.verificationPathPrefix}/${verificationId}`;
}

export function relativeVerificationPath(verificationId: string): string {
  return `${BRAND.verificationPathPrefix}/${verificationId}`;
}
