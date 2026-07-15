import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      // Mirror tsconfig.json "paths": { "@/*": ["./src/*"] } for vitest.
      "@": resolve(here, "src"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // The agent unit tests are structural and don't touch the DB or network.
    environment: "node",
  },
});
