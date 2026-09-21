// Step 14: one ~680 ms frame lands about 1.5 s into a drag in the hinge exploration. Find out what arrives then.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const PORT = 4178;
const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const out = {};
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });
  // the stall only shows up when the hinge exploration follows the other three, so walk the same path
  for (const [shot] of [["fixed.detail"], ["pivot.rotate"], ["ball.shoulder"]]) {
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2000), shot);
    await settle();
    await page.getByTestId("film-explore").click();
    await page.waitForSelector("[data-testid=film-explore-panel]");
    await settle();
    await page.waitForTimeout(400);
    await page.getByTestId("film-explore-exit").click();
    await settle();
  }
  await page.evaluate(() => window.__jointsFilm.seekShot("hinge.flexion", 2000));
  await settle();
  await page.getByTestId("film-explore").click();
  await page.waitForSelector("[data-testid=film-explore-panel]");
  await settle();
  await page.waitForTimeout(600);

  const grab = await page.evaluate(() => window.__jointsQA.findScreenPoint("ulna_r", true));
  out.result = await page.evaluate(
    ({ x, y, ms }) =>
      new Promise((resolve) => {
        const t0 = performance.now();
        const stage = document.querySelector(".film-stage");
        const fire = (type, cx, cy) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
        const gaps = [];
        let last = performance.now();
        fire("pointerdown", x, y);
        let px = x;
        let py = y;
        let dir = 1;
        const step = () => {
          const now = performance.now();
          if (now - last > 60) gaps.push({ atMs: Math.round(last - t0), gapMs: Math.round(now - last), heap: performance.memory?.usedJSHeapSize ?? null, perf: window.__jointsQA.perf() });
          last = now;
          px += dir * 6;
          py += dir * 2;
          fire("pointermove", px, py);
          const r = window.__jointsFilm.exploreState()?.readout;
          if (r?.atLimit || Math.abs(px - x) > 260) dir = -dir;
          if (now - t0 < ms) requestAnimationFrame(step);
          else {
            fire("pointerup", px, py);
            const res = performance.getEntriesByType("resource").filter((e) => e.startTime > t0 - 500).map((e) => ({ name: new URL(e.name).pathname, atMs: Math.round(e.startTime - t0), durMs: Math.round(e.duration), bytes: e.transferSize }));
            const marks = performance.getEntriesByType("mark").filter((e) => e.startTime > t0 - 500).map((e) => ({ name: e.name, atMs: Math.round(e.startTime - t0) }));
            const measures = performance.getEntriesByType("measure").filter((e) => e.startTime > t0 - 500).map((e) => ({ name: e.name, atMs: Math.round(e.startTime - t0), durMs: Math.round(e.duration) }));
            resolve({ gaps, resources: res, marks, measures, perf: window.__jointsQA.perf() });
          }
        };
        requestAnimationFrame(step);
      }),
    { x: grab.x, y: grab.y, ms: 6000 },
  );
  out.consoleErrors = errors;
} finally {
  await browser.close();
  server.kill();
}
writeFileSync("qa/reports/step14.hinge_stall.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify({ gaps: out.result.gaps, marks: out.result.marks, measures: out.result.measures, resources: out.result.resources }, null, 1));
