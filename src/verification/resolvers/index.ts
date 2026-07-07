import type { Citation, ResolverResult } from "@/lib/types";
import { CAPResolver } from "./cap";
import { CompositeResolver } from "./composite";
import { CourtListenerResolver } from "./courtlistener";
import { FloridaStatuteResolver } from "./florida";
import { GovInfoResolver } from "./govinfo";
import { PacerAuthManager } from "./pacer-auth";
import { PacerResolver } from "./pacer";

export interface AuthorityResolver {
  resolve(citation: Citation): Promise<ResolverResult>;
}

export { CompositeResolver } from "./composite";
export { CourtListenerResolver } from "./courtlistener";
export { CAPResolver } from "./cap";
export { FloridaStatuteResolver } from "./florida";
export { GovInfoResolver } from "./govinfo";
export { PacerAuthManager } from "./pacer-auth";
export { PacerResolver } from "./pacer";

export function createResolver(): AuthorityResolver {
  const resolvers: AuthorityResolver[] = [];

  // CourtListener is the primary case-law resolver. Its citation-lookup
  // endpoint permits low-volume unauthenticated reads, so we always register
  // it — sending the Authorization header only when a key is configured
  // (higher rate limits). Previously CL was skipped entirely when no key was
  // set, leaving case law with no resolver at all unless CAP/PACER covered it.
  const courtlistenerApiKey = process.env.COURTLISTENER_API_KEY;
  resolvers.push(new CourtListenerResolver(courtlistenerApiKey));

  const pacerUsername = process.env.PACER_USERNAME;
  const pacerPassword = process.env.PACER_PASSWORD;
  if (pacerUsername && pacerPassword) {
    const authManager = new PacerAuthManager({
      username: pacerUsername,
      password: pacerPassword,
      otpSecret: process.env.PACER_OTP_SECRET,
      qaMode: process.env.PACER_QA_MODE !== "false",
    });
    resolvers.push(new PacerResolver(authManager));
  }

  // GovInfo resolves U.S.C. statutory citations. Without it, every statute
  // (e.g. "42 U.S.C. § 1983") falls through to unresolved — CAP and CL are
  // case-law focused, PACER is court documents. The resolver self-gates on
  // classifyCitation === "statute", so it's safe to always include.
  const govinfoApiKey = process.env.GOVINFO_API_KEY;
  resolvers.push(new GovInfoResolver(govinfoApiKey));

  // Florida statutes. The Florida Senate publishes Fla. Stat. sections at
  // stable URLs with no auth, so — unlike GovInfo — this needs no key and
  // works out of the box. Self-gates on a "Fla. Stat." marker in the citation
  // so it won't try to fetch federal sections. Add sibling state resolvers
  // (Cal., N.Y., Tex.) here as they're built.
  resolvers.push(new FloridaStatuteResolver());

  resolvers.push(new CAPResolver());

  // No StubResolver: it was a no-op that always returned "unresolved".
  // CompositeResolver already returns { status: "unresolved" } on its own
  // when no source resolves and there were no source failures, so the stub
  // added nothing — it just made "unresolved" mean "we asked a stub" rather
  // than the honest "no configured source could resolve it."

  return new CompositeResolver(resolvers);
}
