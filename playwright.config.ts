import { defineConfig } from "@playwright/test";

const port = process.env.PORT ?? "3100";
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run e2e:seed && npm run e2e:server`,
    url: `${baseURL}/upload`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      E2E_AUTH_BYPASS: "1",
      PORT: port,
    },
  },
});
