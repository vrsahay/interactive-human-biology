import { defineConfig } from "@playwright/test";

// Performance lab (separate from the regression suite). PERF_DIST selects the build to serve (default dist),
// PERF_LABEL names the report (qa/reports/step12.perf.<label>.json). Uses the installed Google Chrome with the real GPU.
const dist = process.env.PERF_DIST ?? "dist";
export default defineConfig({
  testDir: "tests/perf",
  timeout: 1_800_000,
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4175",
    channel: "chrome",
    headless: true,
    launchOptions: { args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--enable-precise-memory-info"] },
  },
  webServer: {
    command: `node pipeline/tools/serve_static.mjs ${dist} 4175`,
    url: "http://localhost:4175",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
