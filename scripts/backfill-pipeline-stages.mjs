// One-shot backfill: delete orphaned PipelineStage rows left behind by the
// pre-fix vocabulary mismatch.
//
// Before this fix, POST /api/runs seeded seven rows per run under the names
// [hash, extract, citations, quotes, checks, scoring, report], while the
// worker wrote a disjoint set under [hash_document, extract_text,
// extract_citations, run_checks, compute_score, persist_results]. The
// worker's exact-string upsert never matched the seeded rows, so they sat at
// status="pending" with null timestamps forever — surfacing as a
// permanently-stuck "Pipeline stages" table on every historical run.
//
// This script removes those orphaned rows for existing runs. New runs are
// seeded correctly (see src/lib/pipeline-stages.ts).
//
// Usage: node scripts/backfill-pipeline-stages.mjs [--dry-run]

import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

// The legacy seeded names. The worker never wrote these and never will.
const LEGACY_NAMES = [
  "hash",
  "extract",
  "citations",
  "quotes",
  "checks",
  "scoring",
  "report",
];

const dryRun = process.argv.includes("--dry-run");

async function main() {
  console.log(
    `${dryRun ? "[dry-run] " : ""}Counting orphaned PipelineStage rows...`
  );

  const orphans = await prisma.pipelineStage.findMany({
    where: { stageName: { in: LEGACY_NAMES } },
    select: { id: true, runId: true, stageName: true, status: true },
  });

  console.log(`Found ${orphans.length} orphaned row(s).`);
  if (orphans.length === 0) return;

  // Summary by name, for visibility.
  const byName = new Map();
  for (const o of orphans) {
    byName.set(o.stageName, (byName.get(o.stageName) ?? 0) + 1);
  }
  for (const [name, count] of byName) {
    console.log(`  ${name}: ${count}`);
  }

  if (dryRun) {
    console.log("[dry-run] Not deleting.");
    return;
  }

  const result = await prisma.pipelineStage.deleteMany({
    where: { stageName: { in: LEGACY_NAMES } },
  });
  console.log(`Deleted ${result.count} row(s).`);

  // Sanity report: any run now left with zero stages? That would indicate a
  // run that never executed the worker at all (e.g. failed before the first
  // updateStage). Those runs would now show "No pipeline stages recorded
  // yet." — expected for failed-early runs.
  const affectedRunIds = [...new Set(orphans.map((o) => o.runId))];
  const emptiedRuns = await prisma.$transaction(
    affectedRunIds.map((runId) =>
      prisma.pipelineStage.aggregate({
        _count: true,
        where: { runId },
      })
    )
  );
  const zeroLeft = emptiedRuns.filter((r) => r._count === 0).length;
  if (zeroLeft > 0) {
    console.log(
      `${zeroLeft} run(s) now have zero stage rows (likely failed before the worker wrote any — expected).`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
