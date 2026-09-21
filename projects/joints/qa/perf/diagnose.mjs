// Startup diagnosis: fresh browser (cold HTTP + shader caches), prints performance marks, long tasks and resource timing.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
const dist = process.argv[2] ?? "dist";
const query = process.argv[3] ?? "?qa=1";
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", dist, "4176"], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
try {
  for (let run = 0; run < Number(process.env.RUNS ?? 2); run++) {
    const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.addInitScript(() => { window.__lt = []; try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: "longtask", buffered: true }); } catch {} });
    page.on("console", (m) => m.type() === "error" && console.log("console error:", m.text()));
    await page.goto(`http://localhost:4176/${query}`);
    await page.waitForFunction(() => performance.getEntriesByName("joints:film-started").length || document.querySelector("[data-testid=error]"), null, { timeout: 120000 });
    await page.waitForTimeout(3000);
    const out = await page.evaluate(() => ({
      marks: performance.getEntriesByType("mark").filter((m) => m.name.startsWith("joints:")).map((m) => [m.name, Math.round(m.startTime)]),
      long: window.__lt,
      res: performance.getEntriesByType("resource").map((r) => [new URL(r.name).pathname.split("/").pop(), Math.round(r.startTime), Math.round(r.responseEnd)]),
    }));
    console.log(`run ${run}`, JSON.stringify(out));
    await browser.close();
  }
} finally {
  server.kill();
}
