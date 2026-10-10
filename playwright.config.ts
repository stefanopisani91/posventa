import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running site:
 *   BASE_URL=https://posventa-circuito-gotic.netlify.app npm run e2e
 * They change demo data (and restore it at the end), so they run one at a time.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:5173",
    locale: "es-ES",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /screenshots/ },
    { name: "screenshots", use: { ...devices["Desktop Chrome"] }, testMatch: /screenshots/ },
  ],
});
