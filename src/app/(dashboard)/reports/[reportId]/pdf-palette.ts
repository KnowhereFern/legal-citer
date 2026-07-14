/**
 * Centralized palette for the @react-pdf/renderer report stylesheets.
 *
 * Problem this solves: `@react-pdf/renderer` runs in its own style engine and
 * cannot read CSS custom properties from globals.css. Without this module,
 * every PDF style hardcodes hex values (#111, #888, #ffc107…) that silently
 * drift from the web theme whenever a token changes. The audit flagged this as
 * a P1 theming defect: a brand color update would change the web report but
 * not the PDF a clerk receives.
 *
 * Solution: one source of truth here, mirroring the web tokens' INTENT. The
 * PDF is intentionally a print-first surface — pure ink-on-paper neutrals, not
 * the dark neon web theme — so these values are the print palette, with a
 * comment on each mapping back to the web token it corresponds to. Update a
 * color in one place and both PDF stylesheets follow.
 *
 * When the web tokens in globals.css change materially, update the matching
 * entry here and note the web token in the comment.
 */

// Neutrals — print-first. The web theme is dark; the PDF inverts to paper.
export const pdfPalette = {
  /** Primary ink. Web: --foreground (#ffffff inverted for print). */
  ink: "#111111",
  /** Body label / secondary text. Web: --muted-foreground. */
  muted: "#555555",
  /** Tertiary / metadata text. Lighter than muted for hierarchical density. */
  subtle: "#666666",
  /** Brand-domain / footer chrome. Lightest readable on white paper. */
  faint: "#888888",
  /** Hairline rule color. */
  rule: "#cccccc",
  /** Subtle surface fill (status boxes, appendix header). Web: --muted. */
  surface: "#f5f5f5",
  /** Slightly tinted surface for the public exhibit status box. */
  surfaceTint: "#f7f7f7",
  /** Appendix header band fill. */
  bandFill: "#f0f0f0",
  /** Appendix row hairline separator. */
  rowRule: "#eeeeee",
  /** Light warning callout fill (superseded-order notice). */
  warnFill: "#fff8e1",
  /** Warning callout border. Maps to web --warning (#ffaa00). */
  warnBorder: "#ffc107",
  /** Warning callout text. Maps to web --warning-foreground. */
  warnText: "#856404",
  /** Pure white. */
  paper: "#ffffff",
} as const;

export type PdfPalette = typeof pdfPalette;
