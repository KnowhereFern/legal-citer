/**
 * Centralized legal/policy defaults for BaddieLegal.
 *
 * These values are the single source of truth for the entity name, addresses,
 * contacts, and dispute-resolution defaults referenced by the Terms of Service
 * and Privacy Policy. Update them here and every legal page stays in sync.
 *
 * Replace the placeholder defaults below with confirmed values before launch.
 */
export const LEGAL = {
  /** Formal entity name used in the operative clause of each agreement. */
  entityName: "BaddieLegal LLC",

  /** Entity state for governing-law and arbitration defaults. */
  governingState: "Florida",

  /** County/venue for arbitration proceedings. */
  arbitrationVenue: "Miami-Dade County, Florida",

  /** Arbitration administrator: "AAA" or "JAMS". */
  arbitrationAdmin: "AAA",

  /** Mailing address line(s) shown in the Contact section. */
  mailingAddress: "BaddieLegal LLC\n[Street Address]\nMiami, FL [ZIP]",

  /** Public support inbox. */
  supportEmail: "support@baddielegal.com",

  /** Privacy / DPO inbox used for privacy requests. */
  privacyEmail: "privacy@baddielegal.com",
} as const;

/** ISO-style date string for the "Last updated" line on legal pages. */
export const LEGAL_LAST_UPDATED = "July 2, 2026";
