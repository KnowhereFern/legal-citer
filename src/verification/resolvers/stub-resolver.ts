import type { Citation, ResolverResult } from "@/lib/types";

export interface AuthorityResolver {
  resolve(citation: Citation): Promise<ResolverResult>;
}

export class StubResolver implements AuthorityResolver {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async resolve(_citation: Citation): Promise<ResolverResult> {
    return {
      status: "unresolved",
    };
  }
}
