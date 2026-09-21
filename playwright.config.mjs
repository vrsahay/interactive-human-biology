// Platform smoke tests.
//   npm test                                                   → builds nothing; serves dist/ locally and tests it
//   BASE_URL=https://interactive-human-biology.vercel.app npm test → tests a deployed site instead
import { defineConfig } from "@playwright/test";

const remote = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests",
  timeout: remote ? 240_000 : 180_000,
  expect: { timeout: remote ? 90_000 : 60_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: remote ?? "http://localhost:4321",
    channel: "chrome", // the locally installed Google Chrome; no browser download needed
    viewport: { width: 1366, height: 800 },
  },
  webServer: remote
    ? undefined
    : { command: "node scripts/serve.mjs 4321", url: "http://localhost:4321/", reuseExistingServer: true },
});
