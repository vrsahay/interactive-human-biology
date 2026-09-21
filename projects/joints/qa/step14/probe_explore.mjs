// Step 14: visual probe of the teaching simulations (read-only; captures to qa/visual/step14).
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4197;
mkdirSync("qa/visual/step14", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });
  // the grouped body must be applied before groups can be displaced
  await page.evaluate(() => window.__jointsFilm.seekShot("intro.map", 1000));
  await settle();
  console.log("explores:", JSON.stringify(await page.evaluate(() => window.__jointsFilm.explores())));

  for (const [id, steps] of [["explore.pivot", [0, 45, -45]], ["explore.ball", [0, 60, -60]], ["explore.fixed", [0, 10]], ["explore.hinge", [0, 90]]]) {
    await page.evaluate((x) => window.__jointsFilm.openExplore(x), id);
    await settle();
    await page.waitForTimeout(700);
    for (const v of steps) {
      await page.evaluate(([x, n]) => {
        const s = window.__jointsFilm.exploreState();
        if (!s) return;
        window.__jointsFilm.exploreReset();
        if (n) window.__jointsFilm.exploreDrag(n / 0.3 * (x === "explore.ball" ? -1 : 1), 0);
      }, [id, v]);
      await page.evaluate(() => window.__jointsQA.renderNow());
      await page.waitForTimeout(250);
      const st = await page.evaluate(() => window.__jointsFilm.exploreState());
      writeFileSync(`qa/visual/step14/${id}__${v}.png`, await page.screenshot());
      console.log(`${id} @${v}`.padEnd(26), "readout", JSON.stringify(st.readout), "| displaced", st.displacedGroups.length, "| status", st.status);
    }
    await page.evaluate(() => window.__jointsFilm.closeExplore());
    await settle();
    const after = await page.evaluate(() => ({ session: window.__jointsFilm.exploreState(), displaced: window.__jointsQA ? null : null, groups: window.__jointsFilm.bodyDelivery().groups }));
    console.log(`${id} closed -> session ${after.session === null ? "cleared" : "STILL OPEN"}`);
  }
  console.log("console errors:", errors.length, errors.slice(0, 3));
} finally { await browser.close(); server.kill(); }
