import { defineConfig } from "@playwright/test";

// Uses the locally installed Google Chrome (no Playwright browser download).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  // Reports of earlier steps are never overwritten: outputs default to the current step (QA_STEP).
  reporter: [["list"], ["json", { outputFile: `qa/reports/${process.env.QA_STEP ?? "step12"}.playwright.json` }]],
  use: {
    baseURL: "http://localhost:4173",
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    launchOptions: { args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] },
  },
  webServer: {
    // PW_DIST serves an existing build (e.g. the Step-11 snapshot) with the production-like static server instead of building.
    command: process.env.PW_DIST ? `node pipeline/tools/serve_static.mjs ${process.env.PW_DIST} 4173` : "npx vite build && npx vite preview --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
