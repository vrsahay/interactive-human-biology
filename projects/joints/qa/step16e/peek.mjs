// Quick look: each exploration at one width, opened (after state) - for eyeballing only; the tests measure.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
const PORT = 4205, [W, H] = (process.env.WH ?? "390x844").split("x").map(Number);
mkdirSync("qa/visual/step16e/peek", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 1200));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  const explores = await page.evaluate(() => window.__jointsFilm.explores());
  const chapters = await page.evaluate(() => window.__jointsFilm.chapters());
  for (const e of explores) {
    const ch = chapters.find((c) => c.id === e.chapterId);
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 600), e.status === "validated-rig" ? "hinge.axis" : ch.shots[1]);
    await page.evaluate(() => window.__jointsFilm.pause());
    await settle();
    await page.getByTestId("film-explore").click();
    await settle(); await page.waitForTimeout(1400);
    await page.screenshot({ path: `qa/visual/step16e/peek/${W}_${e.exploreId}.png` });
    await page.getByTestId("film-explore-exit").click();
    await settle();
  }
} finally { await browser.close(); server.kill(); }
