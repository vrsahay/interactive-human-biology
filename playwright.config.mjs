// Platform smoke tests: run against the production build in dist/, served the way a static host serves it.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 180_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4321",
    channel: "chrome", // the locally installed Google Chrome; no browser download needed
    viewport: { width: 1366, height: 800 },
  },
  webServer: {
    command: "node scripts/serve.mjs 4321",
    url: "http://localhost:4321/",
    reuseExistingServer: true,
  },
});
