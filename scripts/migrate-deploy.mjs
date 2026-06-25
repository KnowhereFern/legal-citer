import { execFile } from "node:child_process";
import { promisify } from "node:util";
import nextEnv from "@next/env";

const execFileAsync = promisify(execFile);
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

try {
  const { stdout, stderr } = await execFileAsync(
    "npx",
    ["prisma", "migrate", "deploy"],
    { env: process.env }
  );

  process.stdout.write(stdout);
  process.stderr.write(stderr);
} catch (error) {
  if (error.stdout) {
    process.stdout.write(error.stdout);
  }
  if (error.stderr) {
    process.stderr.write(error.stderr);
  }
  process.exitCode = error.code || 1;
}
