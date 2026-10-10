import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/**/*.test.ts", "server/**/*.test.ts", "tests/**/*.test.ts"],
    // API tests start an embedded Postgres-compatible database per file.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
