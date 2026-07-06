/**
 * Normalize a citation string into a cache/identity key.
 *
 * Two citations that refer to the same authority often differ only in surface
 * formatting — whitespace, capitalization, trailing punctuation ("F.3d" vs
 * "F. 3d", or a trailing comma/period grabbed by the extractor). Without
 * normalization the composite resolver treats each surface form as distinct,
 * re-running the full source chain for each and potentially returning
 * inconsistent results for what is really one authority.
 *
 * This key is used ONLY for dedup/cache identity and comparison — it is never
 * sent to a source. Sources receive the original citation text (their own
 * fuzzy matchers handle normalization better than we can).
 */
export function normalizeCitationKey(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ") // collapse runs of whitespace
    .toLowerCase()
    .replace(/[,.;:]+$/g, "") // trailing punctuation commonly captured by regexes
    .trim();
}
