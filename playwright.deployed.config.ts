import { defineConfig } from "@playwright/test";
import * as nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const baseURL = process.env.DEPLOYED_BASE_URL;

if (!baseURL) {
  throw new Error("DEPLOYED_BASE_URL is required for deployed E2E tests.");
}

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "clerk-setup",
      testMatch: /deployed\.setup\.ts/,
    },
    {
      name: "deployed",
      dependencies: ["clerk-setup"],
      testMatch: /upload-to-run\.spec\.ts/,
      use: {
        storageState: "playwright/.clerk/user.json",
      },
    },
  ],
});
