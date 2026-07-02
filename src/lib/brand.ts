export const BRAND = {
  company: "BaddieLegal",
  product: "BaddieLegal Verify",
  artifact: "Pre-Filing Verification Record",
  artifactSummary: "AI Use & Citation Verification Summary",
  tagline: "Receipts for every cite.",
  headline: "File with receipts.",
  subheadline:
    "Upload a filing. Verify citations, quotes, and AI-use disclosure support. Generate a court-ready verification record.",
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
