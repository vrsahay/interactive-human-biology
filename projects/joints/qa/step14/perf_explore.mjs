// Step 14: what the new interaction costs. Same instrumentation as the Step-12R perf lab (render = a frame that reached
// gl.clear; input latency = event timestamp -> the frame that followed it), on the same real-hardware reference profile
// (igpu-broadband: 1280x800, DPR 1, no CPU throttling), so the numbers sit next to step12r.perf.final.json.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const PORT = 4177;
const SECONDS = Number(process.env.SECONDS ?? 12);
const EXPLORES = [
  { name: "fixed", shot: "fixed.detail" },
  { name: "pivot", shot: "pivot.rotate" },
  { name: "ball", shot: "ball.shoulder" },
  { name: "hinge", shot: "hinge.flexion" },
];

const LAB_INIT = () => {
  const lab = (window.__perfLab = { renders: [], inputs: [], cleared: false, clearAt: 0 });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) =>
    raf((ts) => {
      lab.cleared = false;
      cb(ts);
      if (lab.cleared) {
        lab.cleared = false;
        lab.renders.push([lab.clearAt, performance.now()]);
        if (lab.renders.length > 60000) lab.renders.splice(0, 30000);
      }
    });
  for (const Ctx of [window.WebGL2RenderingContext, window.WebGLRenderingContext]) {
    if (!Ctx) continue;
    const clear = Ctx.prototype.clear;
    Ctx.prototype.clear = function (mask) {
      if (!lab.cleared) {
        lab.cleared = true;
        lab.clearAt = performance.now();
      }
      return clear.call(this, mask);
    };
  }
  for (const type of ["pointermove", "pointerdown", "keydown"]) window.addEventListener(type, (e) => lab.inputs.push([e.timeStamp, performance.now()]), { capture: true, passive: true });
};

const pct = (v, p) => (v.length ? +[...v].sort((a, b) => a - b)[Math.min(v.length - 1, Math.max(0, Math.ceil((p / 100) * v.length) - 1))].toFixed(2) : null);
const stats = (v) => ({ n: v.length, p50: pct(v, 50), p95: pct(v, 95), max: v.length ? +Math.max(...v).toFixed(2) : null });

const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", "dist", String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11"] });
const report = { generatedAt: new Date().toISOString(), profile: "igpu-broadband equivalent: 1280x800, DPR 1, no CPU or network throttling, Chrome 152 headless, ANGLE D3D11", seconds: SECONDS, runs: {} };
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(LAB_INIT);
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  await page.goto(`http://localhost:${PORT}/?qa=1&dpr=1&autoplay=0`);
  await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 180000 });
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

  for (const e of EXPLORES) {
    await page.evaluate((s) => window.__jointsFilm.seekShot(s, 2000), e.shot);
    await settle();
    await page.getByTestId("film-explore").click();
    await page.waitForSelector("[data-testid=film-explore-panel]");
    await settle();
    await page.waitForTimeout(600);

    const box = await page.locator(".film-stage").boundingBox();
    // The validated elbow gesture only starts on the forearm itself, so the hinge drag begins where the perf lab's does.
    const grab = e.name === "hinge" ? await page.evaluate(() => window.__jointsQA.findScreenPoint("ulna_r", true)) : null;
    const cx = grab ? grab.x : box.x + box.width * 0.55;
    const cy = grab ? grab.y : box.y + box.height * 0.45;

    // Closed-loop drag driven inside the page, one pointermove per animation frame. Driving it over CDP instead caps the
    // input rate at one round trip per frame, and a render-on-demand renderer then looks like 30 fps when it is not.
    await page.evaluate(() => {
      window.__perfLab.renders.length = 0;
      window.__perfLab.inputs.length = 0;
    });
    const from = await page.evaluate(() => performance.now());
    const steps = await page.evaluate(
      ({ x, y, ms }) =>
        new Promise((resolve) => {
          const stage = document.querySelector(".film-stage");
          const fire = (type, cx, cy) => stage.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 9, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
          const read = () => window.__jointsFilm.exploreState()?.readout ?? null;
          fire("pointerdown", x, y);
          let px = x;
          let py = y;
          let dir = 1;
          let lastMovingPx = x;
          let lastMovingPy = y;
          const t = performance.now();
          const steps = [];
          const step = () => {
            const before = read();
            px += dir * 6;
            py += dir * 2;
            fire("pointermove", px, py);
            const after = read();
            // reverse at a limit, and whenever the drag has run far enough that it would leave the stage
            // At a limit, rewind the pointer to where the joint last moved instead of walking back through the overshoot.
            // A pointer parked past a limit changes nothing, and a render-on-demand renderer then correctly draws nothing -
            // which a latency harness misreads as a stall (the same artifact Step 12R found and fixed).
            const moved = after && before && Math.abs(after.primary - before.primary) > 1e-4;
            if (moved) { lastMovingPx = px; lastMovingPy = py; }
            if (after?.atLimit || !moved || Math.abs(px - x) > 260) {
              dir = -dir;
              px = lastMovingPx;
              py = lastMovingPy;
            }
            steps.push([Math.round(performance.now() - t), after ? +after.primary.toFixed(2) : null]);
            if (performance.now() - t < ms) requestAnimationFrame(step);
            else {
              fire("pointerup", px, py);
              resolve(steps);
            }
          };
          requestAnimationFrame(step);
        }),
      { x: cx, y: cy, ms: SECONDS * 1000 },
    );
    const to = await page.evaluate(() => performance.now());

    const w = await page.evaluate(([from, to]) => {
      const lab = window.__perfLab;
      const renders = lab.renders.filter((r) => r[0] >= from && r[0] <= to);
      const intervals = renders.slice(1).map((r, i) => r[0] - renders[i][0]);
      const inputs = lab.inputs.filter((e) => e[1] >= from && e[1] <= to);
      const raw = [];
      let noFrame = 0;
      for (const [ts, at] of inputs) {
        const next = renders.find((r) => r[0] >= at);
        if (!next) { noFrame++; continue; }
        raw.push(next[1] - ts);
      }
      const span = renders.length > 1 ? renders[renders.length - 1][0] - renders[0][0] : 0;
      // where the slow ones are: [ms since the window started, latency ms], worst first
      const worst = inputs.map(([ts, at]) => { const next = renders.find((r) => r[0] >= at); return next ? [Math.round(at - from), +(next[1] - ts).toFixed(1)] : null; }).filter(Boolean).sort((x, y) => y[1] - x[1]).slice(0, 10);
      const longIntervals = renders.slice(1).map((r, i) => [Math.round(renders[i][0] - from), Math.round(r[0] - renders[i][0])]).filter((x) => x[1] > 34);
      return { frames: renders.length, spanMs: span, intervals, raw, inputs: inputs.length, noFrame, worst, longIntervals };
    }, [from, to]);

    const state = await page.evaluate(() => window.__jointsFilm.exploreState());
    report.runs[e.name] = {
      explore: state?.exploreId ?? null,
      status: state?.status ?? null,
      displacedGroups: state?.displacedGroups?.length ?? 0,
      frames: w.frames,
      durationS: +(w.spanMs / 1000).toFixed(1),
      fps: w.spanMs ? +((w.frames - 1) / (w.spanMs / 1000)).toFixed(1) : null,
      frameIntervalMs: stats(w.intervals),
      droppedFrames: w.intervals.reduce((a, d) => a + Math.max(0, Math.round(d / 16.667) - 1), 0),
      inputs: w.inputs,
      inputLatencyRawMs: stats(w.raw),
      inputsWithoutFrame: w.noFrame,
      longFrames: w.intervals.filter((d) => d > 50).length,
      worstLatencies: w.worst,
      angleTimeline: steps,
      intervalsOver34ms: w.longIntervals,
    };
    await page.getByTestId("film-explore-exit").click();
    await settle();
  }
  report.consoleErrors = errors;
} finally {
  await browser.close();
  server.kill();
}
mkdirSync("qa/reports", { recursive: true });
writeFileSync("qa/reports/step14.perf.explore.json", JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
