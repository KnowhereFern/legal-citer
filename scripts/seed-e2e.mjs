import nextEnv from "@next/env";
import { PrismaClient } from "@prisma/client";
import { execFile } from "node:child_process";
import net from "node:net";
import { promisify } from "node:util";
import { URL } from "node:url";

const { loadEnvConfig } = nextEnv;
const execFileAsync = promisify(execFile);
const INITIAL_MIGRATION = "20260624142000_init";

loadEnvConfig(process.cwd());

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for E2E tests.");
  }

  return new URL(databaseUrl);
}

function isLocalDatabase(parsed) {
  return ["localhost", "127.0.0.1"].includes(parsed.hostname);
}

async function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function ensureE2EDatabase() {
  const parsed = getDatabaseUrl();
  const host = parsed.hostname || "localhost";
  const port = Number(parsed.port || 5432);
  const database = parsed.pathname.slice(1) || "postgres";
  const user = decodeURIComponent(parsed.username || "postgres");
  const password = decodeURIComponent(parsed.password || "postgres");

  if (await canConnect(host, port)) {
    return;
  }

  if (!["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`E2E database is unreachable and not local: ${host}:${port}`);
  }

  const container = "legal-citer-postgres-e2e";
  await execFileAsync("docker", ["info"]);

  const { stdout } = await execFileAsync("docker", [
    "ps",
    "-a",
    "--filter",
    `name=^${container}$`,
    "--format",
    "{{.Names}}",
  ]);

  if (stdout.trim()) {
    await execFileAsync("docker", ["start", container]);
  } else {
    await execFileAsync("docker", [
      "run",
      "-d",
      "--name",
      container,
      "-e",
      `POSTGRES_USER=${user}`,
      "-e",
      `POSTGRES_PASSWORD=${password}`,
      "-e",
      `POSTGRES_DB=${database}`,
      "-p",
      `${port}:5432`,
      "postgres:16-alpine",
    ]);
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await canConnect(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for E2E database at ${host}:${port}`);
}

async function deployMigrations() {
  const parsed = getDatabaseUrl();

  try {
    await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      env: process.env,
    });
  } catch (error) {
    const output = `${error.stdout ?? ""}\n${error.stderr ?? ""}`;
    if (!output.includes("P3005") || !isLocalDatabase(parsed)) {
      throw error;
    }

    await execFileAsync(
      "npx",
      ["prisma", "migrate", "resolve", "--applied", INITIAL_MIGRATION],
      { env: process.env }
    );
    await execFileAsync("npx", ["prisma", "migrate", "deploy"], {
      env: process.env,
    });
  }
}

async function ensureE2ERedis() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const parsed = new URL(redisUrl);
  const host = parsed.hostname || "localhost";
  const port = Number(parsed.port || 6379);
  const password = decodeURIComponent(parsed.password || "");

  if (await canConnect(host, port)) {
    return;
  }

  if (!["localhost", "127.0.0.1"].includes(host)) {
    throw new Error(`E2E Redis is unreachable and not local: ${host}:${port}`);
  }

  const container = "legal-citer-redis-e2e";
  await execFileAsync("docker", ["info"]);

  const { stdout } = await execFileAsync("docker", [
    "ps",
    "-a",
    "--filter",
    `name=^${container}$`,
    "--format",
    "{{.Names}}",
  ]);

  if (stdout.trim()) {
    await execFileAsync("docker", ["start", container]);
  } else {
    const args = [
      "run",
      "-d",
      "--name",
      container,
      "-p",
      `${port}:6379`,
      "redis:7-alpine",
    ];
    if (password) {
      args.push("redis-server", "--requirepass", password);
    }
    await execFileAsync("docker", args);
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await canConnect(host, port)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for E2E Redis at ${host}:${port}`);
}

async function main() {
  await ensureE2EDatabase();
  await ensureE2ERedis();
  await deployMigrations();

  const prisma = new PrismaClient();
  try {
    await prisma.organization.upsert({
      where: { clerkOrgId: "org_e2e" },
      update: { name: "E2E Test Organization" },
      create: {
        clerkOrgId: "org_e2e",
        name: "E2E Test Organization",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
