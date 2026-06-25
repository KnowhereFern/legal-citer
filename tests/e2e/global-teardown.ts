import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export default async function globalTeardown() {
  await execFileAsync("node", ["scripts/cleanup-e2e.mjs"], {
    cwd: process.cwd(),
  });
}
