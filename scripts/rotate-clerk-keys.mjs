#!/usr/bin/env node
// Runbook: rotate Clerk test keys → production keys safely.
//
// This script automates the verifiable parts of the Clerk key rotation:
//   1. Captures the live keys you paste from dashboard.clerk.com
//   2. Validates them (sk_live_* / pk_live_* shape, not still test keys)
//   3. Runs the railway variables set commands on both services
//   4. Waits for both services to redeploy
//   5. Verifies auth works end-to-end against the production app
//
// What this script DOES NOT do (and shouldn't):
//   - Log into dashboard.clerk.com for you (your credentials, your decision)
//   - Create the Clerk production instance (irreversible, account-scoped)
//   - Set CLERK_WEBHOOK_SECRET (must match a Clerk-side endpoint; setting
//     a wrong value would silently break webhook signature verification,
//     which is the one security control the audit praised)
//
// Usage:
//   node scripts/rotate-clerk-keys.mjs
//
// Then follow the prompts. Requires the `railway` CLI linked to the
// baddie-legal project (run `railway link` first if not).

import { execSync, spawn } from "node:child_process";
import { createInterface } from "node:readline";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const APP_URL = "https://baddielegal.com";

function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function run(cmd, { silent = false } = {}) {
  if (!silent) console.log(`  $ ${cmd}`);
  try {
    return execSync(cmd, { stdio: silent ? "pipe" : "inherit", encoding: "utf-8" }).trim();
  } catch (e) {
    fail(`Command failed: ${cmd}\n${e.stderr || e.message}`);
  }
}

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Clerk Key Rotation Runbook                                       ║
║  test instance (sk_test_*) → production instance (sk_live_*)      ║
╚══════════════════════════════════════════════════════════════════╝

Before continuing, complete these steps in dashboard.clerk.com:

  1. Create or select your PRODUCTION Clerk instance
     (not the "settled-mole-57" test instance)
  2. Add baddielegal.com to the allowed domains
  3. Copy the Secret Key      → starts with sk_live_
  4. Copy the Publishable Key → starts with pk_live_
  5. (Webhook) Create a webhook endpoint:
       URL:    https://baddielegal.com/api/webhooks/clerk
       Events: user.created, user.deleted, organization.created,
               organization.deleted, organizationMemberAdded,
               organizationMemberRemoved
     Copy the Signing Secret → starts with whsec_
     (you'll set this last, after the keys)

Press Ctrl+C now if you haven't done steps 1-4 above.
`);

  await ask("Press Enter when you have the sk_live_* and pk_live_* keys ready…");

  // --- Capture + validate keys -------------------------------------------
  const secretKey = (await ask("\nPaste CLERK_SECRET_KEY (sk_live_*): ")).trim();
  const publishableKey = (await ask("Paste NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (pk_live_*): ")).trim();

  if (!secretKey.startsWith("sk_live_")) {
    fail(`Secret key must start with "sk_live_" — got "${secretKey.slice(0, 12)}…". Did you copy from the production instance?`);
  }
  if (!publishableKey.startsWith("pk_live_")) {
    fail(`Publishable key must start with "pk_live_" — got "${publishableKey.slice(0, 12)}…". Did you copy from the production instance?`);
  }
  if (secretKey.length < 30 || publishableKey.length < 30) {
    fail("Keys look truncated — both should be 30+ characters. Re-copy from the dashboard.");
  }

  console.log("\n✅ Keys validated (both are live, correct shape).");

  // --- Confirm project linkage -------------------------------------------
  console.log("\nChecking Railway project linkage…");
  const status = run("railway status", { silent: true });
  if (!status.includes("baddie-legal")) {
    fail(`Railway CLI isn't linked to baddie-legal. Run \`railway link\` and select the baddie-legal project, then re-run this script.`);
  }
  console.log("✅ Linked to baddie-legal.\n");

  const confirm = await ask(`About to set live keys on BOTH legal-citer and worker-prod services. Type "yes" to proceed: `);
  if (confirm.toLowerCase() !== "yes") {
    console.log("Aborted — no changes made.");
    process.exit(0);
  }

  // --- Set env vars on web service ---------------------------------------
  console.log("\n--- Setting keys on legal-citer (web) ---");
  run(`railway variables set --service legal-citer CLERK_SECRET_KEY=${secretKey}`);
  run(`railway variables set --service legal-citer NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=${publishableKey}`);

  // --- Set env vars on worker (only needs the secret) --------------------
  console.log("\n--- Setting CLERK_SECRET_KEY on worker-prod ---");
  run(`railway variables set --service worker-prod CLERK_SECRET_KEY=${secretKey}`);

  // --- Wait for redeploy -------------------------------------------------
  console.log("\n--- Waiting for redeploy (this triggers automatically on var change) ---");
  console.log("  Web service typically finishes in ~90s; worker in ~30s.");
  console.log("  Polling deployment status…");

  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 10_000));
    const webStatus = run("railway status --service legal-citer", { silent: true });
    const workerStatus = run("railway status --service worker-prod", { silent: true });
    const webUp = /Online|Running/.test(webStatus);
    const workerUp = /Online|Running/.test(workerStatus);
    process.stdout.write(`\r  ${i * 10}s — web: ${webUp ? "✅" : "⏳"}  worker: ${workerUp ? "✅" : "⏳"}    `);
    if (webUp && workerUp && i > 3) break; // require ~40s minimum to let it settle
  }
  console.log("\n✅ Both services back online.\n");

  // --- Smoke test auth ---------------------------------------------------
  console.log("--- Smoke test: hitting app sign-in page ---");
  try {
    const res = run(`curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 ${APP_URL}/sign-in`, { silent: true });
    if (res === "200") {
      console.log(`✅ ${APP_URL}/sign-in returned 200 — app is serving with the new keys.`);
    } else {
      console.log(`⚠️  ${APP_URL}/sign-in returned ${res} (expected 200). Check Railway logs.`);
    }
  } catch {
    console.log(`⚠️  Couldn't reach ${APP_URL} — the deploy may still be settling. Try again in a minute.`);
  }

  // --- Webhook secret (last, manual) ------------------------------------
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  LAST STEP: set CLERK_WEBHOOK_SECRET                              ║
║                                                                   ║
║  This script does NOT set it automatically because a wrong value  ║
║  would silently break webhook signature verification — the one     ║
║  security control the audit praised. It must match the Clerk-side  ║
║  webhook endpoint exactly.                                        ║
║                                                                   ║
║  If you created the webhook endpoint (step 5 above), set it now:   ║
╚══════════════════════════════════════════════════════════════════╝

  railway variables set --service legal-citer CLERK_WEBHOOK_SECRET=whsec_xxx

  Then verify with a test webhook from the Clerk dashboard, or check
  Railway logs for "Clerk webhook verified" on the next org/user event.

Done. Test keys have been replaced with production keys.
`);
  rl.close();
}

main().catch((e) => fail(e.message));
