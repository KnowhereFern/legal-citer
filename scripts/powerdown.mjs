#!/usr/bin/env node
// Runbook: power down (hibernate) the production deployment of legal-citer
// on Railway so the project can be sidelined, then brought back later with
// `npm run standup` (scripts/standup.mjs).
//
// What this script DOES:
//   1. Pre-flight guards — refuse to sideline a broken project. Verifies the
//      Railway CLI is linked to baddie-legal / production, that the latest
//      deploy of both app services is SUCCESS (not FAILED), and that the app
//      is serving health. This ties the "green deploy with live keys"
//      prerequisite to the script so you can't ship a sidelined project that
//      won't stand back up.
//   2. Safety backup to ./backups/ (timestamped):
//        - pg_dump of production Postgres via DATABASE_PUBLIC_URL
//        - full variable manifest for all 4 production services (JSON)
//        - a state.json recording service IDs, replica counts, deploy IDs,
//          domain, and timestamp (this is what standup.mjs reads)
//   3. Hibernates by scaling every production service to 0 replicas, in
//      dependency-safe order (app → worker → Redis → Postgres). Nothing is
//      deleted: services, volumes, variables, and the custom domain all stay
//      attached. Compute billing drops to zero; volume storage still bills.
//
// What this script does NOT do:
//   - Delete services, volumes, domains, or the project (hibernate, not teardown)
//   - Touch staging (production-only scope)
//   - Rotate Clerk keys (that's the Phase-1 prerequisite — see
//     scripts/rotate-clerk-keys.mjs and docs/RAILWAY_RUNBOOK.md)
//
// HIBERNATE vs TEARDOWN: because this is hibernate, the Postgres dump is a
// safety net, not the restore source — the live Railway Postgres volume is
// preserved. If pg_dump is unavailable the script warns and continues.
//
// Usage:
//   node scripts/powerdown.mjs            # interactive (prompts for "yes")
//   node scripts/powerdown.mjs --check    # pre-flight + plan only, no changes
//   node scripts/powerdown.mjs --yes      # skip the confirmation prompt
//
// Requires the `railway` CLI (v5.23+) linked to the baddie-legal project.
// Run `railway link` and select baddie-legal / production if not.

import { execSync, spawnSync } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

const CHECK_ONLY = process.argv.includes("--check");
const ASSUME_YES = process.argv.includes("--yes");

// --- Production identifiers (baddie-legal / production) ---------------------
// Hard-coded so the script can't accidentally target another project/env even
// if `railway link` is pointed elsewhere. Verified against the linked project
// in pre-flight. Note: most `railway` subcommands require the project ID (not
// the name), so commands use PROJECT_ID; the name is used only for a human
// readability check in pre-flight.
const PROJECT_ID = "b12a76ff-c3d8-4cc8-b46e-5ea191148f41";
const PROJECT_NAME = "baddie-legal";
const ENVIRONMENT = "production";
const APP_URL = "https://baddielegal.com";

// Service names in the production environment. (IDs are looked up dynamically
// so this survives service recreation, but names match the live project.)
const APP_SERVICE = "legal-citer";
const WORKER_SERVICE = "worker-prod";
const REDIS_SERVICE = "Redis-3L9x";
const POSTGRES_SERVICE = "Postgres-gFXS";

// Scale-down order: app first (stop taking traffic), then the async worker,
// then the cache/queue, then the database last so the app has fully drained.
// Scale-up is the reverse (see standup.mjs).
const HIBERNATE_ORDER = [APP_SERVICE, WORKER_SERVICE, REDIS_SERVICE, POSTGRES_SERVICE];

const BACKUP_DIR = join(process.cwd(), "backups");
const ts = () => new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);

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
  // Run a railway CLI command that is expected to print JSON on stdout.
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
  // Returns array of service objects from `railway service list --json`.
  return runJson(
    railway(`service list --project ${PROJECT_ID} --environment ${ENVIRONMENT} --json`),
  );
}

function getVariables(serviceName) {
  // Returns the flat {key: value} object for a service.
  return runJson(
    railway(`variable list --project ${PROJECT_ID} --environment ${ENVIRONMENT} --service ${serviceName} --json`),
  );
}

function scaleTo(serviceName, replicas) {
  // Scales a service to `replicas` in every region it currently runs in.
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

function allRunningZero(services) {
  return services.every((s) => (s.replicas?.running ?? 0) === 0);
}

// --- pre-flight guards -----------------------------------------------------
function banner() {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  Power Down (Hibernate) — legal-citer production                 ║
║  Scales all production services to 0 replicas. Nothing deleted.  ║
╚══════════════════════════════════════════════════════════════════╝
`);
}

async function preflight() {
  console.log("— Pre-flight checks —\n");

  // 1. CLI linked to the right project/environment. Use the project ID (names
  //    aren't accepted by service/variable subcommands) and verify the project
  //    name resolves to that ID, so a wrong hard-coded ID fails loudly.
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
    fail(
      `Environment "${ENVIRONMENT}" not found in project ${PROJECT_NAME} (${PROJECT_ID}).`,
    );
  }
  console.log(`✅ Linked to ${PROJECT_NAME} / ${ENVIRONMENT}.\n`);

  // 2. All expected services present.
  console.log("Checking production services…");
  const services = getServiceList();
  const names = services.map((s) => s.name);
  for (const expected of [APP_SERVICE, WORKER_SERVICE, REDIS_SERVICE, POSTGRES_SERVICE]) {
    if (!names.includes(expected)) {
      fail(`Expected service "${expected}" not found in ${ENVIRONMENT}. Found: ${names.join(", ")}`);
    }
  }
  console.log(`✅ All 4 production services present: ${names.join(", ")}.\n`);

  // 3. Latest deploy of both APP services must be SUCCESS — refuse to sideline
  //    a project whose latest code failed to build (it won't stand back up
  //    cleanly). DBs/images are stateful and their "latest" deploy is the
  //    template deploy, which should also be healthy.
  console.log("Checking latest deploy status of each service…");
  const unhealthy = [];
  for (const s of services) {
    const latest = s.latestDeployment?.status;
    if (latest && latest !== "SUCCESS" && latest !== "REMOVED") {
      unhealthy.push(`  ✗ ${s.name}: latest deploy = ${latest} (id ${s.latestDeployment?.id})`);
    }
  }
  if (unhealthy.length > 0) {
    console.log(
      "\n❌ REFUSING TO POWER DOWN — the following services have a non-SUCCESS latest deploy.\n" +
        "If you hibernate now, the project will come back with broken code and the live\n" +
        "app won't match the latest commit. Fix the deploy FIRST.\n",
    );
    for (const u of unhealthy) console.log(u);
    console.log(
      `\nMost common cause: scripts/guard-production-secrets.mjs blocks production builds\n` +
        `that still use sk_test_* Clerk keys or a placeholder MANIFEST_SIGNING_KEY.\n\n` +
        `To get a green deploy before sidelining:\n` +
        `  1. node scripts/rotate-clerk-keys.mjs   (sets sk_live_*/pk_live_* on both services)\n` +
        `  2. openssl rand -hex 32  → railway variables set --service ${APP_SERVICE} MANIFEST_SIGNING_KEY=<value>\n` +
        `                            → railway variables set --service ${WORKER_SERVICE} MANIFEST_SIGNING_KEY=<value>\n` +
        `  3. Set CLERK_WEBHOOK_SECRET on ${APP_SERVICE} to the prod webhook whsec_*\n` +
        `  4. Re-run this script once both app services show SUCCESS.\n` +
        `\nSee docs/RAILWAY_RUNBOOK.md "Sidelining (Power Down / Stand Up)".`,
    );
    process.exit(1);
  }
  console.log("✅ Latest deploy of every service is SUCCESS.\n");

  // 4. App health + sign-in reachable (only meaningful if app replicas > 0).
  const app = services.find((s) => s.name === APP_SERVICE);
  if ((app.replicas?.running ?? 0) > 0) {
    console.log("Smoke-testing app health…");
    for (const path of ["/api/health", "/sign-in"]) {
      const code = run(`curl -s -o /dev/null -w "%{http_code}" -L --max-time 15 ${APP_URL}${path}`, {
        silent: true,
      });
      const ok = code === "200" || (path === "/sign-in" && (code === "200" || code === "302" || code === "307"));
      console.log(`  ${path} → ${code} ${ok ? "✅" : "⚠️"}`);
    }
    console.log("");
  }

  return services;
}

// --- backup ----------------------------------------------------------------
function findPgDump() {
  // Prefer Homebrew libpq (matches the Postgres 18 server), fall back to PATH.
  const candidates = ["/opt/homebrew/opt/libpq/bin/pg_dump", "pg_dump"];
  for (const c of candidates) {
    const r = spawnSync(c, ["--version"], { encoding: "utf-8" });
    if (r.status === 0) return c;
  }
  return null;
}

function backupPostgres(backupDir, stamp) {
  const pgVars = getVariables(POSTGRES_SERVICE);
  const publicUrl = pgVars.DATABASE_PUBLIC_URL;
  if (!publicUrl) {
    console.log(`  ⚠️  ${POSTGRES_SERVICE} has no DATABASE_PUBLIC_URL — skipping pg_dump.`);
    console.log("      (Hibernate preserves the volume, so the DB is not lost; this is a bonus snapshot.)");
    return null;
  }
  const pgDump = findPgDump();
  if (!pgDump) {
    console.log("  ⚠️  pg_dump not found (install via `brew install libpq`). Skipping Postgres dump.");
    console.log("      Hibernate preserves the live volume — this skip does NOT lose data.");
    return null;
  }
  const outFile = join(backupDir, `postgres-${ENVIRONMENT}-${stamp}.sql.gz`);
  console.log(`  Dumping ${POSTGRES_SERVICE} → ${outFile} …`);
  // pg_dump | gzip. Use the public URL (reachable off-Railway).
  const cmd = `${pgDump} --no-owner --no-acl --dbname "${publicUrl}" | gzip > "${outFile}"`;
  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("  ✅ Postgres dump complete.");
    return outFile;
  } catch (e) {
    console.log(`  ⚠️  pg_dump failed (${e.message.split("\n")[0]}). Skipping — volume is still preserved by hibernate.`);
    return null;
  }
}

function backupVariables(backupDir, stamp, services) {
  const manifest = {};
  for (const s of services) {
    console.log(`  Capturing variables for ${s.name} …`);
    manifest[s.name] = {
      id: s.id,
      variables: getVariables(s.name),
    };
  }
  const outFile = join(backupDir, `vars-${ENVIRONMENT}-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify(manifest, null, 2));
  console.log(`  ✅ Variable manifest → ${outFile}`);
  return outFile;
}

function backupState(backupDir, stamp, services, dumpPath, varsPath) {
  const state = {
    poweredDownAt: new Date().toISOString(),
    project: PROJECT_NAME,
    environment: ENVIRONMENT,
    appUrl: APP_URL,
    services: services.map((s) => ({
      name: s.name,
      id: s.id,
      regions: (s.regions || []).map((r) => ({ name: r.name, configured: r.configured })),
      replicasBefore: s.replicas,
      latestDeployment: s.latestDeployment,
      volumes: (s.volumes || []).map((v) => ({ name: v.name, mountPath: v.mountPath })),
      url: s.url,
    })),
    backups: {
      postgresDump: dumpPath,
      variables: varsPath,
    },
    note:
      "Hibernate mode: services scaled to 0 replicas. Nothing deleted. " +
      "Restore with `npm run standup`. The Postgres dump is a safety snapshot; " +
      "the live Railway volume is the primary restore source.",
  };
  const outFile = join(backupDir, `powerdown-state-${ENVIRONMENT}-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify(state, null, 2));
  // Symlink-like convenience: write a stable "latest" pointer.
  writeFileSync(join(backupDir, `powerdown-state-${ENVIRONMENT}-latest.json`), JSON.stringify(state, null, 2));
  console.log(`  ✅ State manifest → ${outFile}`);
  return outFile;
}

function doBackup(services) {
  console.log("\n— Safety backup → ./backups/ —\n");
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = ts();
  const dumpPath = backupPostgres(BACKUP_DIR, stamp);
  const varsPath = backupVariables(BACKUP_DIR, stamp, services);
  const statePath = backupState(BACKUP_DIR, stamp, services, dumpPath, varsPath);
  console.log(`\n✅ Backup complete. (These files are gitignored — never commit secrets.)`);
  return { stamp, dumpPath, varsPath, statePath };
}

// --- hibernate -------------------------------------------------------------
async function hibernate() {
  console.log("\n— Hibernating: scaling services to 0 replicas —\n");
  for (const name of HIBERNATE_ORDER) {
    console.log(`▼ ${name} → 0`);
    scaleTo(name, 0);
  }
  console.log("\nWaiting for replicas to reach 0…");
  let services;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 5_000));
    services = getServiceList();
    const allZero = allRunningZero(services);
    const line = services
      .map((s) => `${s.name}:${s.replicas?.running ?? 0}running`)
      .join("  ");
    process.stdout.write(`\r  ${i * 5}s — ${line}    `);
    if (allZero && i > 1) break;
  }
  console.log("");
  services = getServiceList();
  if (allRunningZero(services)) {
    console.log("\n✅ All production services at 0 replicas. Project is hibernating.\n");
  } else {
    console.log("\n⚠️  Some services still show running replicas — check the Railway dashboard.");
    console.log("    The scale commands were issued; replicas can take a minute to drain.");
  }
  return services;
}

// --- main ------------------------------------------------------------------
async function main() {
  banner();
  const services = await preflight();

  console.log("— Plan —\n");
  console.log(`  1. Safety backup → ${BACKUP_DIR}/`);
  console.log("     • pg_dump of production Postgres (safety snapshot)");
  console.log("     • variable manifest for all 4 services (with live secrets)");
  console.log("     • powerdown-state-*.json (what standup.mjs will read)");
  console.log(`  2. Hibernate: scale to 0 in order ${HIBERNATE_ORDER.join(" → ")}`);
  console.log("     Services, volumes, variables, and the custom domain are NOT deleted.\n");
  console.log("Restore later with:  npm run standup\n");

  if (CHECK_ONLY) {
    console.log("🔍 --check: pre-flight passed, plan shown above. No changes made.");
    rl.close();
    return;
  }

  if (!ASSUME_YES) {
    const confirm = await ask(
      `This will scale all production services to 0 replicas. The app at ${APP_URL} will go offline.\n` +
        `Type "yes" to power down: `,
    );
    if (confirm.toLowerCase() !== "yes") {
      console.log("Aborted — no changes made.");
      rl.close();
      return;
    }
  }

  doBackup(services);
  await hibernate();

  console.log("─".repeat(68));
  console.log(`✔  Powered down at ${new Date().toISOString()}`);
  console.log(`   Backups in:    ${BACKUP_DIR}/`);
  console.log(`   Bring it back: npm run standup`);
  console.log("─".repeat(68));
  rl.close();
}

main().catch((e) => fail(e.message));
