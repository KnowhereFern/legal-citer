#!/usr/bin/env node
// Runbook: stand legal-citer production back up after a hibernate (the inverse
// of scripts/powerdown.mjs). Bring the sidelined project back online.
//
// What this script DOES:
//   1. Reads the latest backups/powerdown-state-production-latest.json written
//      by powerdown.mjs to learn which services to bring up, in what order,
//      and to what replica counts.
//   2. Scales services back to 1 replica in dependency order: Postgres → Redis
//      (wait healthy) → worker → app. Hibernate preserves the last-successful
//      image, so NO redeploy is needed — the running code after standup is the
//      same SUCCESS deploy that was running before powerdown.
//   3. Polls until all services are Online, then smoke-tests /api/health and
//      /sign-in against the live domain.
//
// What this script does NOT do:
//   - Redeploy the app (not needed for hibernate restore; run `railway up` or
//     push to main if you want to ship NEW code)
//   - Restore Postgres from the dump (the live Railway volume was preserved;
//     the dump exists only as an emergency snapshot)
//   - Touch staging (production-only scope)
//
// Usage:
//   node scripts/standup.mjs          # interactive (prompts for "yes")
//   node scripts/standup.mjs --check  # show the plan + current state, no changes
//   node scripts/standup.mjs --yes    # skip the confirmation prompt
//
// Requires the `railway` CLI linked to baddie-legal. If services are missing
// (i.e. the project was fully torn down rather than hibernated), this script
// will tell you — hibernate restore expects services to still exist.

import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const CHECK_ONLY = process.argv.includes("--check");
const ASSUME_YES = process.argv.includes("--yes");

const PROJECT_ID = "b12a76ff-c3d8-4cc8-b46e-5ea191148f41";
const PROJECT_NAME = "baddie-legal";
const ENVIRONMENT = "production";
const APP_URL = "https://baddielegal.com";
const APP_SERVICE = "legal-citer";
const WORKER_SERVICE = "worker-prod";
const REDIS_SERVICE = "Redis-3L9x";
const POSTGRES_SERVICE = "Postgres-gFXS";

// Stand-up order is the REVERSE of hibernate: bring the DB up first, then the
// cache, then the async worker, then the web app last so dependencies exist
// before dependents start.
const STANDUP_ORDER = [POSTGRES_SERVICE, REDIS_SERVICE, WORKER_SERVICE, APP_SERVICE];

const BACKUP_DIR = join(process.cwd(), "backups");

// --- helpers ---------------------------------------------------------------
function fail(msg) {
  console.error(`\n❌ ${msg}`);
  process.exit(1);
}

function run(cmd, { silent = false, okFail = false } = {}) {
  if (!silent) console.log(`  $ ${cmd}`);
  try {
    return execSync(cmd, { stdio: silent ? "pipe" : "inherit", encoding: "utf-8" }).trim();
  } catch (e) {
    if (okFail) return null;
    fail(`Command failed: ${cmd}\n${e.stderr?.toString().trim() || e.message}`);
  }
}

function runJson(cmd) {
  try {
    const out = execSync(cmd, { stdio: ["pipe", "pipe", "inherit"], encoding: "utf-8" });
    return JSON.parse(out.trim());
  } catch (e) {
    fail(`Command failed (expected JSON): ${cmd}\n${e.stderr?.toString().trim() || e.message}`);
  }
}

const RAILWAY = "/Users/iamfern/.railway/bin/railway";
const railway = (args) => `${RAILWAY} ${args}`;

function getServiceList() {
  return runJson(
    railway(`service list --project ${PROJECT_ID} --environment ${ENVIRONMENT} --json`),
  );
}

function scaleTo(serviceName, replicas) {
  const services = getServiceList();
  const svc = services.find((s) => s.name === serviceName);
  if (!svc) fail(`Service not found in ${ENVIRONMENT}: ${serviceName}`);
  if (svc.regions.length === 0) {
    console.log(`  ⚠️  ${serviceName} has no regions configured — nothing to scale.`);
    return;
  }
  for (const r of svc.regions) {
    run(
      railway(
        `service scale --project ${PROJECT_ID} --environment ${ENVIRONMENT} --service ${serviceName} ${r.name}=${replicas}`,
      ),
      { silent: false },
    );
  }
}

function loadState() {
  if (!existsSync(BACKUP_DIR)) {
    fail(
      `No ${BACKUP_DIR}/ directory found. Either powerdown.mjs was never run, or\n` +
        `you're running from the wrong directory (run from the project root).`,
    );
  }
  const latest = join(BACKUP_DIR, `powerdown-state-${ENVIRONMENT}-latest.json`);
  if (!existsSync(latest)) {
    // Fall back to the newest timestamped state file.
    const files = readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith(`powerdown-state-${ENVIRONMENT}-`) && f.endsWith(".json") && !f.includes("-latest"))
      .sort()
      .reverse();
    if (files.length === 0) {
      fail(
        `No powerdown state file in ${BACKUP_DIR}/.\n` +
          `This project may never have been hibernated with powerdown.mjs.`,
      );
    }
    console.log(`⚠️  No -latest pointer; using newest: ${files[0]}`);
    return JSON.parse(readFileSync(join(BACKUP_DIR, files[0]), "utf-8"));
  }
  return JSON.parse(readFileSync(latest, "utf-8"));
}

// --- main ------------------------------------------------------------------
function banner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Stand Up — restore legal-citer production from hibernate        ║
║  Scales hibernated services back to 1 replica. No redeploy.      ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

async function waitForOnline(targetService, { expectRunning = 1 } = {}) {
  // Poll until `targetService` has >= expectRunning running replicas (or 0
  // crashes). Returns the service object once healthy.
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    const services = getServiceList();
    const svc = services.find((s) => s.name === targetService);
    if (!svc) fail(`${targetService} disappeared mid-standup.`);
    const running = svc.replicas?.running ?? 0;
    const crashed = svc.replicas?.crashed ?? 0;
    process.stdout.write(`\r  ${i * 5}s — ${targetService}: running=${running} crashed=${crashed}    `);
    if (running >= expectRunning && crashed === 0 && i > 1) {
      process.stdout.write("\n");
      return svc;
    }
  }
  process.stdout.write("\n");
  return null;
}

async function main() {
  banner();

  // 1. Validate CLI linkage. Use the project ID (names aren't accepted by
  //    service/variable subcommands) and confirm it resolves to the expected name.
  console.log("Checking Railway CLI linkage…");
  const status = run(railway(`status --project ${PROJECT_ID} --environment ${ENVIRONMENT}`), {
    silent: true,
  });
  if (!status.includes(PROJECT_NAME)) {
    fail(
      `Project ID ${PROJECT_ID} did not resolve to "${PROJECT_NAME}".\n` +
        `Check the PROJECT_ID constant in this script and your Railway account.`,
    );
  }
  if (!status.toLowerCase().includes(ENVIRONMENT)) {
    fail(`Environment "${ENVIRONMENT}" not found in project ${PROJECT_NAME} (${PROJECT_ID}).`);
  }
  console.log(`✅ Linked to ${PROJECT_NAME} / ${ENVIRONMENT}.`);

  // 2. Load the powerdown state.
  console.log("\nLoading powerdown state…");
  const state = loadState();
  const poweredDownAt = state.poweredDownAt;
  console.log(`  Last powered down: ${poweredDownAt}`);
  if (state.backups?.postgresDump) console.log(`  Postgres snapshot: ${state.backups.postgresDump}`);
  console.log("");

  // 3. Sanity: all expected services still exist (hibernate keeps them).
  const services = getServiceList();
  const liveNames = services.map((s) => s.name);
  for (const expected of STANDUP_ORDER) {
    if (!liveNames.includes(expected)) {
      fail(
        `Service "${expected}" is missing from ${ENVIRONMENT}.\n` +
          `This standup script only restores from HIBERNATE (zero replicas). If the\n` +
          `project was fully torn down (services deleted), the services, volumes, and\n` +
          `domains must be recreated manually first — see docs/RAILWAY_RUNBOOK.md and\n` +
          `the variable manifest in ${BACKUP_DIR}/.`,
      );
    }
  }
  console.log(`✅ All 4 services present (hibernate preserved them): ${liveNames.join(", ")}.\n`);

  // 4. Show current vs target state.
  console.log("— Current replica state —");
  for (const s of services) {
    const r = s.replicas || {};
    console.log(`  ${s.name.padEnd(16)} running=${r.running ?? 0} configured=${r.configured ?? 0}`);
  }
  console.log("");

  console.log("— Plan —\n");
  console.log(`  Scale up in dependency order: ${STANDUP_ORDER.join(" → ")} (1 replica each).`);
  console.log("  No redeploy — hibernate kept the last-successful image.");
  console.log("  Then smoke-test /api/health and /sign-in.\n");

  if (CHECK_ONLY) {
    console.log("🔍 --check: state loaded, plan shown above. No changes made.");
    rl.close();
    return;
  }

  if (!ASSUME_YES) {
    const confirm = await ask(
      `This will bring production back online at ${APP_URL}. Type "yes" to stand up: `,
    );
    if (confirm.toLowerCase() !== "yes") {
      console.log("Aborted — no changes made.");
      rl.close();
      return;
    }
  }

  // 5. Scale up in dependency order. Wait for DBs to be running before starting
  //    dependents so the app doesn't boot into a missing-database state.
  console.log("\n— Standing up: scaling services to 1 replica —\n");
  for (const name of STANDUP_ORDER) {
    console.log(`▲ ${name} → 1`);
    scaleTo(name, 1);
    // Wait for DBs and worker to be running before moving on. The app (last)
    // we scale up and then smoke-test separately.
    if (name !== APP_SERVICE) {
      const healthy = await waitForOnline(name, { expectRunning: 1 });
      if (!healthy) {
        console.log(`  ⚠️  ${name} did not reach running=1 within the timeout. Continuing, but check logs.`);
      }
    }
  }

  // 6. Wait for the app to come online, then smoke test.
  console.log("\nWaiting for app to come online…");
  const appHealthy = await waitForOnline(APP_SERVICE, { expectRunning: 1 });

  console.log("\n— Smoke test —");
  if (appHealthy) {
    for (const path of ["/api/health", "/sign-in"]) {
      let code = "—";
      // Retry the HTTP check a few times; the edge can take a moment after replicas are up.
      for (let attempt = 0; attempt < 6; attempt++) {
        code = run(`curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 ${APP_URL}${path}`, {
          silent: true,
          okFail: true,
        });
        if (code === "200" || (path === "/sign-in" && (code === "302" || code === "307"))) break;
        await new Promise((r) => setTimeout(r, 5_000));
      }
      const ok = code === "200" || (path === "/sign-in" && (code === "302" || code === "307"));
      console.log(`  ${path} → ${code} ${ok ? "✅" : "⚠️"}`);
    }
  } else {
    console.log(`  ⚠️  ${APP_SERVICE} did not reach running=1 within the timeout.`);
  }

  console.log("\n─".repeat(68));
  console.log(`✔  Stand-up complete at ${new Date().toISOString()}`);
  console.log(`   App URL:       ${APP_URL}`);
  console.log(`   Powered down:  ${poweredDownAt}`);
  console.log(`   State file:    ${join(BACKUP_DIR, `powerdown-state-${ENVIRONMENT}-latest.json`)}`);
  if (!appHealthy) {
    console.log(`   ⚠️  App not yet healthy — check \`railway logs --service ${APP_SERVICE}\`.`);
    console.log(`      Emergency restore from the Postgres dump is in ${state.backups?.postgresDump ?? "—"}`);
  }
  console.log("─".repeat(68));
  rl.close();
}

main().catch((e) => fail(e.message));
