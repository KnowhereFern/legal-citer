import type { Citation, ResolverResult } from "@/lib/types";
import type { AuthorityResolver } from "./index";

export class CompositeResolver implements AuthorityResolver {
  private resolvers: AuthorityResolver[];

  constructor(resolvers: AuthorityResolver[]) {
    this.resolvers = resolvers;
  }

  async resolve(citation: Citation): Promise<ResolverResult> {
    let lastFailure: ResolverResult | null = null;

    for (const resolver of this.resolvers) {
      const result = await resolver.resolve(citation);

      if (result.status === "resolved") {
        return result;
      }

      if (result.status === "source_failure") {
        lastFailure = result;
      }
    }

    if (lastFailure) {
      return lastFailure;
    }

    return { status: "unresolved" };
  }
}
