// Step 12R performance lab (methodology v2).
//   PERF_DIST=dist PERF_LABEL=final PERF_RUNS=5 npx playwright test -c playwright.perf.config.ts perf-lab-r
//
// What each number is:
// - cold load: a FRESH browser process per run (empty HTTP cache, empty Chrome GPU shader cache) with CDP network + CPU
//   throttling. Profiles are interleaved round-robin (run 1 of every profile, then run 2 ...) so machine drift over the
//   session affects all profiles alike, and each run is preceded by a CPU benchmark gate (waits for the machine to return
//   within 35% of the fastest benchmark seen, up to 45 s; the benchmark value is recorded with every run).
// - first meaningful 3D: end of the first rendered frame after the film's first shot was applied (rendering is held until
//   that shot's shader programs are compiled, so this is the first frame that shows the anatomy).
// - interactions: one fresh browser per profile (not measured load), then 30 s of elbow drag (pointer events dispatched from
//   requestAnimationFrame, i.e. display rate) and 30 s of Explore orbit (real mouse input through CDP).
//   raw latency = event timestamp -> end of the next rendered frame; effective = event timestamp -> end of the first
//   rendered frame whose pose (drag) or camera (orbit) differs from the previous frame.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, test, type Browser, type Page } from "@playwright/test";

const ROOT = join(import.meta.dirname, "..", "..");
const LABEL = process.env.PERF_LABEL ?? "r";
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const SECONDS = Number(process.env.PERF_INTERACTION_SECONDS ?? 30);
const ONLY = process.env.PERF_PROFILES?.split(",");

type Net = { id: string; downBps: number; upBps: number; latencyMs: number; note: string };
const FAST_4G: Net = { id: "fast-4g-devtools", downBps: (9e6 / 8) * 0.9, upBps: (1.5e6 / 8) * 0.9, latencyMs: 165, note: "Chrome DevTools Fast 4G preset" };
const BROADBAND: Net = { id: "broadband-50mbps", downBps: 50e6 / 8, upBps: 10e6 / 8, latencyMs: 20, note: "50 Mbps down / 10 Mbps up / 20 ms" };
interface Profile { id: string; classification: string; viewport: { width: number; height: number }; dpr: number; cpu: number; net: Net; mobile: boolean; signals?: { deviceMemory: number | null; hardwareConcurrency: number } }
const REAL = "REAL HARDWARE (integrated-GPU laptop, headless Chrome); network emulated";
const PROFILES: Profile[] = [
  { id: "desktop-broadband", classification: `${REAL}; desktop viewport — the same machine as integrated-GPU (no separate desktop GPU available)`, viewport: { width: 1440, height: 900 }, dpr: 1, cpu: 1, net: BROADBAND, mobile: false },
  { id: "igpu-broadband", classification: REAL, viewport: { width: 1280, height: 800 }, dpr: 1, cpu: 1, net: BROADBAND, mobile: false },
  { id: "igpu-fast4g", classification: REAL, viewport: { width: 1280, height: 800 }, dpr: 1, cpu: 1, net: FAST_4G, mobile: false },
  { id: "tablet-2x-fast4g", classification: "EMULATED — NOT CERTIFICATION (CPU 2x, laptop GPU)", viewport: { width: 768, height: 1024 }, dpr: 2, cpu: 2, net: FAST_4G, mobile: true, signals: { deviceMemory: null, hardwareConcurrency: 8 } },
  { id: "mobile-2x-fast4g", classification: "EMULATED — NOT CERTIFICATION (CPU 2x, laptop GPU)", viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 2, net: FAST_4G, mobile: true, signals: { deviceMemory: 4, hardwareConcurrency: 8 } },
  { id: "mobile-4x-fast4g", classification: "EMULATED — NOT CERTIFICATION (CPU 4x, laptop GPU)", viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 4, net: FAST_4G, mobile: true, signals: { deviceMemory: 4, hardwareConcurrency: 8 } },
].filter((p) => !ONLY || ONLY.includes(p.id));

const LAB_INIT = () => {
  const lab: any = ((window as any).__perfLab = { renders: [] as number[][], inputs: [] as number[][], first3dAt: null, cleared: false, clearAt: 0, sig: null as null | (() => string), lastSig: "" });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    raf((ts) => {
      lab.cleared = false;
      cb(ts);
      if (lab.cleared) {
        lab.cleared = false;
        let changed = 0;
        if (lab.sig) {
          const s = lab.sig();
          changed = s !== lab.lastSig ? 1 : 0;
          lab.lastSig = s;
        }
        lab.renders.push([lab.clearAt, performance.now(), changed]);
        if (lab.renders.length > 60000) lab.renders.splice(0, 30000);
      }
    });
  for (const Ctx of [(window as any).WebGL2RenderingContext, (window as any).WebGLRenderingContext]) {
    if (!Ctx) continue;
    const clear = Ctx.prototype.clear;
    Ctx.prototype.clear = function (this: unknown, mask: number) {
      if (!lab.cleared) {
        lab.cleared = true;
        lab.clearAt = performance.now();
      }
      return clear.call(this, mask);
    };
  }
  let film: unknown;
  Object.defineProperty(window, "__jointsFilm", {
    configurable: true,
    get: () => film,
    set: (v) => {
      film = v;
      const n = lab.renders.length;
      const wait = () => raf(() => (lab.renders.length > n ? (lab.first3dAt = lab.renders[n][1]) : wait()));
      wait();
    },
  });
  for (const type of ["pointermove", "keydown", "pointerdown"]) window.addEventListener(type, (e) => lab.inputs.push([e.timeStamp, performance.now()]), { capture: true, passive: true });
};

const pct = (values: number[], p: number) => (values.length ? +[...values].sort((a, b) => a - b)[Math.min(values.length - 1, Math.max(0, Math.ceil((p / 100) * values.length) - 1))].toFixed(2) : null);
const stats = (v: number[]) => ({ n: v.length, p50: pct(v, 50), p95: pct(v, 95), min: v.length ? +Math.min(...v).toFixed(2) : null, max: v.length ? +Math.max(...v).toFixed(2) : null });

function cpuBenchMs(): number {
  const buf = Buffer.alloc(32 * 1024 * 1024, 7);
  const t = performance.now();
  for (let i = 0; i < 4; i++) createHash("sha256").update(buf).digest();
  return Math.round(performance.now() - t);
}
let benchFloor = Infinity;
async function benchGate(): Promise<{ benchMs: number; waitedMs: number }> {
  const t0 = Date.now();
  let b = cpuBenchMs();
  benchFloor = Math.min(benchFloor, b);
  while (b > benchFloor * 1.35 && Date.now() - t0 < 45_000) {
    await new Promise((r) => setTimeout(r, 5000));
    b = cpuBenchMs();
    benchFloor = Math.min(benchFloor, b);
  }
  return { benchMs: b, waitedMs: Date.now() - t0 };
}

const launch = () => chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--enable-precise-memory-info"] });
async function open(browser: Browser, p: Profile, cacheDisabled: boolean) {
  const ctx = await browser.newContext({ baseURL: "http://localhost:4175", viewport: p.viewport, screen: p.viewport, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(LAB_INIT);
  if (p.signals) await ctx.addInitScript((sig: { deviceMemory: number | null; hardwareConcurrency: number }) => {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => sig.hardwareConcurrency, configurable: true });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => (sig.deviceMemory === null ? undefined : sig.deviceMemory), configurable: true });
  }, p.signals);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: p.net.latencyMs, downloadThroughput: p.net.downBps, uploadThroughput: p.net.upBps });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return { page, errors };
}
const film = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> => page.evaluate(([f, a]) => (window as any).__jointsFilm[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
const settle = (page: Page) => page.waitForFunction(() => (window as any).__jointsQA?.idle() && !(window as any).__jointsFilm?.state().buffering, null, { timeout: 120_000 });

async function coldLoad(page: Page) {
  await page.goto("/?qa=1");
  await page.waitForFunction(() => (window as any).__perfLab.first3dAt !== null || document.querySelector("[data-testid=error]"), null, { timeout: 180_000, polling: 50 });
  // the rest of the intro (grouped representation prepared) and network quiet
  await page.waitForFunction(() => performance.getEntriesByName("joints:stage-ready:groups").length > 0, null, { timeout: 120_000, polling: 200 }).catch(() => undefined);
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const lab = (window as any).__perfLab;
    const mark = (n: string) => Math.round(performance.getEntriesByName(n)[0]?.startTime ?? NaN);
    const res = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).map((r) => ({ name: new URL(r.name).pathname, start: Math.round(r.startTime), end: Math.round(r.responseEnd), transfer: r.transferSize }));
    const first = lab.first3dAt;
    const q = (window as any).__jointsQA?.perf();
    return {
      firstMeaningful3DMs: first && Math.round(first),
      introCompleteMs: mark("joints:stage-ready:groups"),
      shellRenderedMs: mark("joints:shell-rendered"),
      bytesBeforeFirst3D: res.filter((r) => r.end <= first).reduce((a, r) => a + r.transfer, 0),
      requestsBeforeFirst3D: res.filter((r) => r.end <= first).map((r) => r.name),
      elbowRequested: res.some((r) => r.name.includes("/joints/elbow_r/") && r.name.endsWith(".glb")),
      quality: document.documentElement.dataset.quality ?? null,
      firstFrame: q ? { drawCalls: q.drawCalls, triangles: q.triangles, pixelRatio: q.pixelRatio } : null,
      marks: performance.getEntriesByType("mark").filter((m) => m.name.startsWith("joints:")).map((m) => [m.name, Math.round(m.startTime)]),
      resources: res,
    };
  });
}

async function windowStats(page: Page, from: number, to: number) {
  return page.evaluate(([from, to]) => {
    const lab = (window as any).__perfLab;
    const renders: number[][] = lab.renders.filter((r: number[]) => r[0] >= from && r[0] <= to);
    const intervals = renders.slice(1).map((r, i) => r[0] - renders[i][0]);
    const inputs: number[][] = lab.inputs.filter((e: number[]) => e[1] >= from && e[1] <= to);
    const raw: number[] = [];
    const effective: number[] = [];
    let noFrame = 0;
    for (const [ts, at] of inputs) {
      const next = renders.find((r) => r[0] >= at);
      if (!next) { noFrame++; continue; }
      raw.push(next[1] - ts);
      const changed = renders.find((r) => r[0] >= at && r[2] === 1);
      if (changed) effective.push(changed[1] - ts);
    }
    const span = renders.length > 1 ? renders[renders.length - 1][0] - renders[0][0] : 0;
    const t0 = renders.length ? renders[0][0] : from;
    const long = renders.slice(1).map((r, i) => [Math.round(renders[i][0] - t0), Math.round(r[0] - renders[i][0])]).filter((x) => x[1] > 50);
    return { frames: renders.length, spanMs: span, intervals, raw, effective, noFrame, inputs: inputs.length, long, firstRenderAfterStartMs: renders.length ? Math.round(renders[0][0] - from) : null };
  }, [from, to] as const);
}
const summarize = (w: Awaited<ReturnType<typeof windowStats>>) => ({
  frames: w.frames,
  durationS: +(w.spanMs / 1000).toFixed(1),
  fps: w.spanMs ? +((w.frames - 1) / (w.spanMs / 1000)).toFixed(1) : null,
  frameIntervalMs: stats(w.intervals),
  droppedFrames: w.intervals.reduce((a, d) => a + Math.max(0, Math.round(d / 16.667) - 1), 0),
  inputs: w.inputs,
  inputLatencyRawMs: stats(w.raw),
  inputLatencyEffectiveMs: stats(w.effective),
  inputsWithoutFrame: w.noFrame,
  longFrames: { count: w.long.length, first: w.long.slice(0, 20), note: "[ms since the first frame of the window, interval ms] for intervals > 50 ms" },
});
const now = (page: Page) => page.evaluate(() => performance.now());

const report: Record<string, any> = { label: LABEL, generatedAt: new Date().toISOString(), methodology: "see header of tests/perf/perf-lab-r.spec.ts", machine: "Lenovo 20V9, Intel Core i5-1135G7, Iris Xe, 16 GB, Windows 11 Pro, Chrome 152 headless", coldLoads: {}, interactions: {} };
const write = () => {
  mkdirSync(join(ROOT, "qa", "reports"), { recursive: true });
  writeFileSync(join(ROOT, "qa", "reports", `step12r.perf.${LABEL}.json`), JSON.stringify(report, null, 1));
};

test.describe.configure({ mode: "serial" });

test("cold loads, fresh browser, round-robin across profiles", async () => {
  test.setTimeout(3_600_000);
  for (const p of PROFILES) report.coldLoads[p.id] = { profile: p, runs: [] };
  for (let run = 1; run <= RUNS; run++) {
    for (const p of PROFILES) {
      // One retry per run: a browser process that never produces a first frame (a GPU process failing to come up) must not
      // discard the whole session. Every attempt is recorded, so the report shows which measurements needed a retry.
      for (let attempt = 1; attempt <= 2; attempt++) {
        const gate = await benchGate();
        const browser = await launch();
        const { page, errors } = await open(browser, p, true);
        const startedAt = new Date().toISOString();
        let load: Awaited<ReturnType<typeof coldLoad>> | null = null;
        let failed: string | null = null;
        try {
          load = await coldLoad(page);
        } catch (e) {
          failed = String(e).split("\n")[0];
        }
        await browser.close();
        report.coldLoads[p.id].runs.push({ run, attempt, startedAt, ...gate, ...(load ?? {}), ...(failed ? { failed } : {}), consoleErrors: errors });
        if (load) break;
      }
    }
    write();
  }
  for (const p of PROFILES) {
    const runs = report.coldLoads[p.id].runs;
    const pick = (k: string) => runs.map((r: any) => r[k]).filter((v: unknown) => typeof v === "number" && Number.isFinite(v));
    const ok = runs.filter((r: any) => !r.failed);
    report.coldLoads[p.id].summary = { runs: ok.length, retries: runs.length - ok.length, failed: runs.filter((r: any) => r.failed).map((r: any) => r.failed), firstMeaningful3DMs: stats(pick("firstMeaningful3DMs")), introCompleteMs: stats(pick("introCompleteMs")), bytesBeforeFirst3D: stats(pick("bytesBeforeFirst3D")), benchMs: stats(pick("benchMs")), quality: ok[0]?.quality ?? null, firstFrame: ok[0]?.firstFrame ?? null, consoleErrors: runs.reduce((a: number, r: any) => a + r.consoleErrors.length, 0) };
  }
  write();
});

for (const p of PROFILES) {
  test(`interactions ${p.id}: elbow readiness, 30 s drag, 30 s Explore orbit, recap playback`, async () => {
    test.setTimeout(900_000);
    await benchGate();
    const browser = await launch();
    const { page, errors } = await open(browser, p, false);
    await page.goto("/?qa=1&autoplay=0");
    await page.waitForFunction(() => (window as any).__jointsFilm, null, { timeout: 180_000 });
    await settle(page);
    const out: Record<string, unknown> = {};
    // elbow readiness from the moment the learner shows intent (focus / hover on the hinge chapter)
    const t0 = await now(page);
    // Resolved from the build under test, not hard-coded: the same lab measures the Step-14 and Step-14B builds, whose
    // chapter indices and recap shot ids differ.
    const entryIds = (await film<{ id: string }[]>(page, "entries")).map((e) => e.id);
    const hingeChapter = (await film<{ id: string; chapterIndex: number }[]>(page, "entries")).find((e) => e.id === "hinge.travel")!.chapterIndex;
    await film(page, "preloadChapter", hingeChapter);
    await page.waitForFunction(() => (window as any).__jointsFilm.jointAttached() && performance.getEntriesByName("joints:joint-ready").length > 0, null, { timeout: 120_000, polling: 50 });
    out.elbowReadyAfterIntentMs = Math.round((await page.evaluate(() => performance.getEntriesByName("joints:joint-ready")[0].startTime)) - t0);

    // 30 s elbow drag at display rate
    await film(page, "seekShot", "hinge.try", 600);
    await settle(page);
    await film(page, "pause");
    const start = await page.evaluate(() => (window as any).__jointsQA.findScreenPoint("ulna_r", true));
    await page.evaluate(() => ((window as any).__perfLab.sig = () => String((window as any).__jointsQA.poseUpdates())));
    // closed-loop drag: the pointer follows a target angle 25..120 deg (period ~2.6 s) so every step moves the joint.
    // (An open-loop pointer path parks the hinge at 0/145 deg; the idle render loop then correctly renders nothing,
    // which a latency harness would misread as 700 ms stalls.)
    let a = await now(page);
    const dragRun = await page.evaluate(
      ({ x, y, ms }) =>
        new Promise<{ angles: number[]; slope: number; axis: string }>((resolve) => {
          const angles: number[] = [];
          const qa = (window as any).__jointsQA;
          const target = document.querySelector("canvas")!;
          const fire = (type: string, cx: number, cy: number) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
          const dof = () => qa.getDof("flexion") as number;
          fire("pointerdown", x, y);
          let px = x;
          let py = y;
          // probe: which screen axis moves the hinge, and how fast (deg per px)
          const probe = (dx: number, dy: number) => { const before = dof(); px += dx; py += dy; fire("pointermove", px, py); return dof() - before; };
          const sy = probe(0, 6) || probe(0, -12);
          const sx = probe(6, 0) || probe(-12, 0);
          const useY = Math.abs(sy) >= Math.abs(sx);
          let slope = (useY ? sy : sx) / (useY ? 6 : 6);
          if (!slope) slope = 1;
          const t = performance.now();
          const step = () => {
            const s = (performance.now() - t) / 1000;
            const goal = 72.5 + 47.5 * Math.sin(s * 2.4);
            const before = dof();
            const d = Math.max(-40, Math.min(40, (goal - before) / slope));
            if (useY) py += d; else px += d;
            fire("pointermove", px, py);
            const after = dof();
            if (Math.abs(d) > 0.5 && Math.abs(after - before) > 0.05) slope = 0.8 * slope + 0.2 * ((after - before) / d);
            if (Math.sign(slope) === 0) slope = 1;
            angles.push(after);
            if (performance.now() - t < ms) requestAnimationFrame(step);
            else { fire("pointerup", px, py); resolve({ angles, slope, axis: useY ? "y" : "x" }); }
          };
          requestAnimationFrame(step);
        }),
      { ...start, ms: SECONDS * 1000 },
    );
    out.drag = summarize(await windowStats(page, a, await now(page)));
    {
      const ang = dragRun.angles.filter((v) => typeof v === "number");
      const lo = Math.min(...ang), hi = Math.max(...ang);
      const same = ang.slice(1).filter((v, i) => Math.abs(v - ang[i]) < 1e-6).length;
      out.dragPose = { method: "closed-loop target 25..120 deg", axis: dragRun.axis, angleMin: +lo.toFixed(2), angleMax: +hi.toFixed(2), unchangedStepFraction: +(same / Math.max(1, ang.length - 1)).toFixed(3) };
    }
    out.dragHeapBytes = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? null);

    // 30 s Explore orbit with real mouse input
    await film(page, "seekShot", "hinge.flexion", 3000);
    await settle(page);
    await film(page, "explore", true);
    await settle(page);
    await page.evaluate(() => ((window as any).__perfLab.sig = () => (window as any).__jointsFilm.camera().position.map((v: number) => v.toFixed(5)).join(",")));
    const sx = p.viewport.width * 0.12;
    const sy = p.viewport.height * 0.28;
    a = await now(page);
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    const tEnd = Date.now() + SECONDS * 1000;
    while (Date.now() < tEnd) {
      const s = (tEnd - Date.now()) / 1000;
      await page.mouse.move(sx + 40 + Math.sin(s * 2) * 60, sy + Math.sin(s * 1.3) * 20);
    }
    await page.mouse.up();
    out.orbit = summarize(await windowStats(page, a, await now(page)));
    await film(page, "resume");
    await film(page, "pause");
    await page.evaluate(() => ((window as any).__perfLab.sig = null));

    // recap playback (regression guard)
    await film(page, "seekShot", entryIds.includes("compare.pullback") ? "compare.pullback" : "recap.pullback", 0);
    await settle(page);
    a = await now(page);
    await film(page, "play");
    await page.waitForTimeout(8000);
    await film(page, "pause");
    out.recapPlayback = summarize(await windowStats(page, a, await now(page)));
    out.recapRenderer = await page.evaluate(() => (window as any).__jointsQA.perf());
    out.consoleErrors = errors;
    await browser.close();
    report.interactions[p.id] = { profile: p, ...out };
    write();
  });
}
