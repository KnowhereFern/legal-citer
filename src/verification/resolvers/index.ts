import type { Citation, ResolverResult } from "@/lib/types";
import { CAPResolver } from "./cap";
import { CompositeResolver } from "./composite";
import { CourtListenerResolver } from "./courtlistener";
import { PacerAuthManager } from "./pacer-auth";
import { PacerResolver } from "./pacer";
import { StubResolver } from "./stub-resolver";

export interface AuthorityResolver {
  resolve(citation: Citation): Promise<ResolverResult>;
}

export { CompositeResolver } from "./composite";
export { CourtListenerResolver } from "./courtlistener";
export { CAPResolver } from "./cap";
export { StubResolver } from "./stub-resolver";
export { PacerAuthManager } from "./pacer-auth";
export { PacerResolver } from "./pacer";

export function createResolver(): AuthorityResolver {
  const resolvers: AuthorityResolver[] = [];

  const apiKey = process.env.COURTLISTENER_API_KEY;
  if (apiKey) {
    resolvers.push(new CourtListenerResolver(apiKey));
  }

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

  resolvers.push(new CAPResolver());
  resolvers.push(new StubResolver());

  return new CompositeResolver(resolvers);
}
