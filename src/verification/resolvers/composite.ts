import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";
import { normalizeCitationKey } from "./normalize";

export class CompositeResolver implements AuthorityResolver {
  private resolvers: AuthorityResolver[];
  private cache = new Map<string, ResolverResult>();

  constructor(resolvers: AuthorityResolver[]) {
    this.resolvers = resolvers;
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    // Key on a normalized form so surface variants of the same authority
    // ("F.3d 12" vs "F. 3d 12", trailing comma) hit the same cache entry and
    // return consistent results instead of re-running the source chain.
    const key = normalizeCitationKey(citation.text);
    const cached = this.cache.get(key);
    if (cached) {
      return cached;
    }

    let lastFailure: ResolverResult | null = null;

    for (const resolver of this.resolvers) {
      const result = await resolver.resolve(citation);

      if (result.status === "resolved") {
        this.cache.set(key, result);
        return result;
      }

      if (result.status === "source_failure") {
        lastFailure = result;
      }
    }

    const finalResult = lastFailure ?? { status: "unresolved" as const };
    this.cache.set(key, finalResult);
    return finalResult;
  }
}
