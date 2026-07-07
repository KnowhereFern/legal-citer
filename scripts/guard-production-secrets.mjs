#!/usr/bin/env node
/**
 * Deploy-time guard: fail loudly if production environment is using test/dev
 * credentials. Runs as part of `npm run build` (see package.json) so a Railway
 * deploy with stale keys WON'T silently succeed — it blocks the deploy until
 * the operator rotates them.
 *
 * This addresses the root danger of the "still on sk_test_*" state: not that
 * the keys are test per se, but that a production deploy could ship with them
 * and nobody would notice until a user hit an auth failure or a rate limit.
 *
 * Bypass: set ALLOW_TEST_KEYS=1 (E2E, preview, dev). Production deploys
 * must NOT set this.
 *
 * Currently guards:
 *   - CLERK_SECRET_KEY must start with sk_live_ in production
 *   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with pk_live_ in production
 *   - MANIFEST_SIGNING_KEY must be set and >= 32 chars (no dev default)
 *
 * Each guard prints the exact remediation command so the operator can fix
 * the issue without reading the runbook.
 */

const isProduction =
  process.env.NODE_ENV === "production" || process.env.RAILWAY_ENVIRONMENT === "production";

// In non-production builds (local dev, E2E, preview), skip — test keys are
// expected and required there.
if (!isProduction) {
  process.exit(0);
}

// Allow explicit opt-out for staging environments that legitimately use test
// keys. Production must NEVER set this.
if (process.env.ALLOW_TEST_KEYS === "1") {
  console.warn(
    "[guard-production-secrets] WARNING: ALLOW_TEST_KEYS=1 is set. " +
      "Test credentials are permitted in this build. Do NOT set this in production.",
  );
  process.exit(0);
}

const failures = [];

function check({ name, value, predicate, remediation }) {
  if (!predicate(value)) {
    failures.push({ name, remediation });
  }
}

// --- Clerk keys: must be live, not test --------------------------------
const clerkSecret = process.env.CLERK_SECRET_KEY ?? "";
const clerkPublishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

check({
  name: "CLERK_SECRET_KEY",
  value: clerkSecret,
  predicate: (v) => v.startsWith("sk_live_"),
  remediation:
    "CLERK_SECRET_KEY must start with 'sk_live_' in production. " +
      "Current value starts with '" +
      clerkSecret.slice(0, 8) +
      "' (test/dev key).\n" +
      "  → Fix: create a production Clerk instance at dashboard.clerk.com, copy the\n" +
      "    sk_live_* Secret Key, then run:\n" +
      "    node scripts/rotate-clerk-keys.mjs",
});

check({
  name: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  value: clerkPublishable,
  predicate: (v) => v.startsWith("pk_live_"),
  remediation:
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY must start with 'pk_live_' in production. " +
      "Current value starts with '" +
      clerkPublishable.slice(0, 8) +
      "' (test/dev key).\n" +
      "  → Fix: from the production Clerk instance, copy the pk_live_* Publishable Key,\n" +
      "    then run:\n" +
      "    node scripts/rotate-clerk-keys.mjs",
});

// --- Manifest signing key: must be set, no dev fallback ----------------
const manifestKey = process.env.MANIFEST_SIGNING_KEY ?? "";
check({
  name: "MANIFEST_SIGNING_KEY",
  value: manifestKey,
  predicate: (v) => v.length >= 32 && !v.startsWith("dev-"),
  remediation:
    "MANIFEST_SIGNING_KEY must be set to a strong random value (>=32 chars) in production.\n" +
      "  → Fix: generate one with `openssl rand -hex 32`, then:\n" +
      "    railway variables set --service legal-citer MANIFEST_SIGNING_KEY=<value>\n" +
      "    railway variables set --service worker-prod MANIFEST_SIGNING_KEY=<value>",
});

// --- Report -----------------------------------------------------------
if (failures.length > 0) {
  console.error(
    "\n❌ PRODUCTION SECRET GUARD FAILED — deploy blocked.\n" +
      "The following production credentials are missing, weak, or still test/dev values:\n",
  );
  for (const { name, remediation } of failures) {
    console.error("  ✗ " + name);
    console.error("    " + remediation.split("\n").join("\n    ") + "\n");
  }
  console.error(
    "These guards exist because shipping with test/dev credentials is a silent failure:\n" +
      "the deploy succeeds but users hit auth failures, rate limits, or forged manifests.\n" +
      "Resolve each issue above, then redeploy.\n",
  );
  process.exit(1);
}

console.log("[guard-production-secrets] ✓ All production credentials valid (live keys, strong manifest key).");
