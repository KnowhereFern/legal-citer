export interface QuoteMatchResult {
  matched: boolean;
  similarity: number;
  matchedSegment?: string;
  offset?: number;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function computeSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const wordsA = a.split(" ");
  const wordsB = b.split(" ");
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function verifyQuote(params: {
  quoteText: string;
  sourceText: string;
  threshold?: number;
}): QuoteMatchResult {
  const threshold = params.threshold ?? 0.8;
  const normalizedQuote = normalize(params.quoteText);
  const normalizedSource = normalize(params.sourceText);

  if (normalizedQuote.length === 0 || normalizedSource.length === 0) {
    return { matched: false, similarity: 0 };
  }

  const quoteWords = normalizedQuote.split(" ");
  const sourceWords = normalizedSource.split(" ");

  if (sourceWords.length < quoteWords.length) {
    const similarity = computeSimilarity(normalizedQuote, normalizedSource);
    return {
      matched: similarity >= threshold,
      similarity,
      matchedSegment: similarity >= threshold ? params.sourceText : undefined,
      offset: 0,
    };
  }

  let bestSimilarity = 0;
  let bestOffset = 0;

  for (let i = 0; i <= sourceWords.length - quoteWords.length; i++) {
    const window = sourceWords.slice(i, i + quoteWords.length).join(" ");
    const similarity = computeSimilarity(normalizedQuote, window);

    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestOffset = i;
    }

    if (bestSimilarity === 1) break;
  }

  const matched = bestSimilarity >= threshold;
  return {
    matched,
    similarity: bestSimilarity,
    matchedSegment: matched
      ? sourceWords.slice(bestOffset, bestOffset + quoteWords.length).join(" ")
      : undefined,
    offset: bestOffset,
  };
}
