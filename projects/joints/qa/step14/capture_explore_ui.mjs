// Step 14: capture each joint's Explore as a learner sees it - entering from the chapter's own CTA, dragging, resetting.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
const PORT = 4201;
mkdirSync("qa/visual/step14", { recursive: true });
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const CHAPTERS = [
  { shot: "fixed.detail", name: "fixed", drag: [120, 0] },
  { shot: "pivot.rotate", name: "pivot", drag: [140, 0] },
  { shot: "ball.shoulder", name: "ball", drag: [-150, -90] },
  { shot: "hinge.flexion", name: "hinge", drag: [220, 0] },
];
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 60000 });

  for (const c of CHAPTERS) {
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2000), c.shot);
    await settle();
    const cta = page.getByTestId("film-explore");
    const ctaText = (await cta.textContent())?.trim();
    await cta.click();
    await page.waitForSelector("[data-testid=film-explore-panel]", { timeout: 30000 });
    await settle();
    await page.waitForTimeout(500);
    writeFileSync(`qa/visual/step14/ui_${c.name}_open.png`, await page.screenshot());

    // drag on the stage, as a learner would
    const box = await page.locator(".film-stage").boundingBox();
    const cx = box.x + box.width * 0.55;
    const cy = box.y + box.height * 0.45;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx + c.drag[0], cy + c.drag[1], { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    await page.evaluate(() => window.__jointsQA.renderNow());
    writeFileSync(`qa/visual/step14/ui_${c.name}_dragged.png`, await page.screenshot());

    const state = await page.evaluate(() => ({
      readout: document.querySelector("[data-testid=film-explore-readout]")?.textContent?.trim(),
      status: document.querySelector("[data-testid=film-explore-status]")?.getAttribute("data-status"),
      instruction: document.querySelector("[data-testid=film-explore-instruction]")?.textContent?.trim(),
      session: window.__jointsFilm.exploreState(),
    }));
    // reset, then leave
    await page.getByTestId("film-explore-reset").click();
    await page.waitForTimeout(400);
    const afterReset = await page.evaluate(() => window.__jointsFilm.exploreState()?.readout);
    await page.getByTestId("film-explore-exit").click();
    await settle();
    const afterExit = await page.evaluate(() => ({ session: window.__jointsFilm.exploreState(), shot: window.__jointsFilm.state().shotId, displaced: window.__jointsFilm.bodyDelivery().groups }));
    results.push({ joint: c.name, cta: ctaText, status: state.status, instruction: state.instruction, readoutAfterDrag: state.readout, displacedDuringDrag: state.session?.displacedGroups.length ?? 0, afterReset, sessionClearedOnExit: afterExit.session === null, shotRestored: afterExit.shot });
    console.log(JSON.stringify(results.at(-1)));
  }
  console.log("console errors:", errors.length, errors.slice(0, 3));
} finally { await browser.close(); server.kill(); }
