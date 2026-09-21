// Film performance lab. Build-agnostic: it only uses the QA hooks that exist since Step 11 (?qa=1) plus an init script that
// timestamps rendered frames (first gl.clear inside a requestAnimationFrame callback) and input events, so the Step-11 baseline
// build and later builds are measured the same way.
//   PERF_DIST=qa/perf/baseline-dist PERF_LABEL=baseline npx playwright test -c playwright.perf.config.ts
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, test, type Browser, type BrowserContext, type CDPSession, type Page } from "@playwright/test";

const ROOT = join(import.meta.dirname, "..", "..");
const LABEL = process.env.PERF_LABEL ?? "run";
const RUNS = Number(process.env.PERF_RUNS ?? 5);
const ONLY = process.env.PERF_PROFILES?.split(",");

type Net = { id: string; downBps: number; upBps: number; latencyMs: number; note: string };
// Chrome DevTools "Fast 4G" preset (download 9 Mbps x0.9, upload 1.5 Mbps x0.9, latency 60 ms x2.75).
const FAST_4G: Net = { id: "fast-4g-devtools", downBps: ((9e6 / 8) * 0.9), upBps: ((1.5e6 / 8) * 0.9), latencyMs: 165, note: "Chrome DevTools Fast 4G preset" };
const BROADBAND: Net = { id: "broadband-50mbps", downBps: 50e6 / 8, upBps: 10e6 / 8, latencyMs: 20, note: "50 Mbps down / 10 Mbps up / 20 ms" };

interface Profile { id: string; classification: string; viewport: { width: number; height: number }; dpr: number; cpu: number; net: Net; mobile: boolean; signals?: { deviceMemory: number | null; hardwareConcurrency: number } }
const PROFILES: Profile[] = [
  { id: "laptop-igpu-broadband", classification: "REAL HARDWARE: integrated-GPU laptop (headless Chrome); network emulated", viewport: { width: 1440, height: 900 }, dpr: 1, cpu: 1, net: BROADBAND, mobile: false },
  { id: "laptop-igpu-fast4g", classification: "REAL HARDWARE: integrated-GPU laptop (headless Chrome); network emulated", viewport: { width: 1280, height: 800 }, dpr: 1, cpu: 1, net: FAST_4G, mobile: false },
  // Phone/tablet profiles also emulate the device signals the quality tier reads (coarse touch pointer, screen size, memory).
  { id: "tablet-emulated-fast4g", classification: "EMULATED — NOT CERTIFICATION (CPU 2x throttle, laptop GPU)", viewport: { width: 768, height: 1024 }, dpr: 2, cpu: 2, net: FAST_4G, mobile: true, signals: { deviceMemory: null, hardwareConcurrency: 8 } },
  { id: "mobile-emulated-fast4g", classification: "EMULATED — NOT CERTIFICATION (CPU 4x throttle, laptop GPU)", viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 4, net: FAST_4G, mobile: true, signals: { deviceMemory: 4, hardwareConcurrency: 8 } },
  { id: "mobile-emulated-fast4g-cpu2x", classification: "EMULATED — NOT CERTIFICATION (CPU 2x throttle, laptop GPU; uncalibrated mid-tier approximation)", viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 2, net: FAST_4G, mobile: true, signals: { deviceMemory: 4, hardwareConcurrency: 8 } },
].filter((p) => !ONLY || ONLY.includes(p.id));

const LAB_INIT = () => {
  const lab: any = ((window as any).__perfLab = { renders: [] as [number, number][], inputs: [] as { type: string; ts: number; at: number }[], first3dAt: null, filmAt: null, shellAt: null, fcp: null, longTasks: [] as [number, number][], cleared: false, clearAt: 0 });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb: FrameRequestCallback) =>
    raf((ts) => {
      lab.cleared = false;
      cb(ts);
      if (lab.cleared) {
        lab.cleared = false;
        lab.renders.push([lab.clearAt, performance.now()]);
        if (lab.renders.length > 40000) lab.renders.splice(0, 20000);
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
      lab.filmAt = performance.now();
      const renders = lab.renders.length;
      // first rendered frame after the film's first shot has been applied
      const wait = () => raf(() => (lab.renders.length > renders ? (lab.first3dAt = lab.renders[renders][1]) : wait()));
      wait();
    },
  });
  for (const type of ["pointerdown", "pointermove", "keydown", "click", "wheel"]) {
    window.addEventListener(type, (e) => lab.inputs.push({ type, ts: e.timeStamp, at: performance.now() }), { capture: true, passive: true });
  }
  new MutationObserver((_, obs) => {
    if (document.querySelector("[data-testid=film], [data-testid=loading]")) {
      lab.shellAt = performance.now();
      obs.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
  try {
    new PerformanceObserver((l) => l.getEntries().forEach((e) => e.name === "first-contentful-paint" && (lab.fcp = e.startTime))).observe({ type: "paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => lab.longTasks.push([e.startTime, e.duration]))).observe({ type: "longtask", buffered: true });
  } catch {
    /* optional */
  }
};

/** Machine-speed probe run right before every cold load (thermal / background-load drift shows up here). */
function cpuBenchMs(): number {
  const buf = Buffer.alloc(32 * 1024 * 1024, 7);
  const t = performance.now();
  for (let i = 0; i < 4; i++) createHash("sha256").update(buf).digest();
  return Math.round(performance.now() - t);
}

const pct = (values: number[], p: number) => {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))].toFixed(2);
};
const stats = (values: number[]) => ({ n: values.length, p50: pct(values, 50), p95: pct(values, 95), min: values.length ? +Math.min(...values).toFixed(2) : null, max: values.length ? +Math.max(...values).toFixed(2) : null });

async function openContext(browser: Browser, p: Profile, cacheDisabled: boolean): Promise<{ ctx: BrowserContext; page: Page; cdp: CDPSession }> {
  const ctx = await browser.newContext({ viewport: p.viewport, screen: p.viewport, deviceScaleFactor: p.dpr, isMobile: p.mobile && process.env.PERF_EMULATE_SIGNALS !== "0", hasTouch: p.mobile && process.env.PERF_EMULATE_SIGNALS !== "0" });
  await ctx.addInitScript(LAB_INIT);
  if (p.signals && process.env.PERF_EMULATE_SIGNALS !== "0") {
    await ctx.addInitScript((sig: { deviceMemory: number | null; hardwareConcurrency: number }) => {
      Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => sig.hardwareConcurrency, configurable: true });
      if (sig.deviceMemory === null) Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => undefined, configurable: true });
      else Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => sig.deviceMemory, configurable: true });
    }, p.signals);
  }
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: p.net.latencyMs, downloadThroughput: p.net.downBps, uploadThroughput: p.net.upBps });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });
  return { ctx, page, cdp };
}

const film = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> => page.evaluate(([f, a]) => (window as any).__jointsFilm[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
const qa = <T>(page: Page, fn: string, ...args: unknown[]): Promise<T> => page.evaluate(([f, a]) => (window as any).__jointsQA[f as string](...(a as unknown[])), [fn, args] as const) as Promise<T>;
async function settle(page: Page) {
  await page.waitForFunction(() => (window as any).__jointsQA?.idle() && !(window as any).__jointsFilm?.state?.().buffering, null, { timeout: 120_000 });
}

/** Load the film cold and collect loading milestones. */
async function measureLoad(page: Page, query = "") {
  const t0 = Date.now();
  await page.goto(`/?qa=1${query}`);
  await page.waitForFunction(() => (window as any).__perfLab.first3dAt !== null || document.querySelector("[data-testid=error]"), null, { timeout: 180_000, polling: 100 });
  // wait for the network to go quiet (lazy / background loads)
  let last = -1;
  let stable = 0;
  while (stable < 3 && Date.now() - t0 < 120_000) {
    const n = await page.evaluate(() => performance.getEntriesByType("resource").filter((r) => (r as PerformanceResourceTiming).responseEnd > 0).length);
    stable = n === last ? stable + 1 : 0;
    last = n;
    await page.waitForTimeout(1000);
  }
  return page.evaluate(() => {
    const lab = (window as any).__perfLab;
    const res = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).map((r) => ({ name: new URL(r.name).pathname, start: Math.round(r.startTime), end: Math.round(r.responseEnd), transfer: r.transferSize, encoded: r.encodedBodySize, decoded: r.decodedBodySize }));
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const q = (window as any).__jointsQA;
    const perf = q?.perf();
    const mem = (performance as any).memory;
    const before = (t: number) => res.filter((r) => r.end <= t);
    const sum = (list: typeof res, k: "transfer" | "decoded") => list.reduce((a, r) => a + r[k], 0);
    const first3d = lab.first3dAt;
    return {
      navigation: { responseEnd: Math.round(nav.responseEnd), domContentLoaded: Math.round(nav.domContentLoadedEventEnd), transfer: nav.transferSize },
      fcpMs: lab.fcp && Math.round(lab.fcp),
      shellVisibleMs: lab.shellAt && Math.round(lab.shellAt),
      filmReadyMs: lab.filmAt && Math.round(lab.filmAt),
      firstMeaningful3DMs: first3d && Math.round(first3d),
      bytesBeforeFirst3D: first3d ? sum(before(first3d), "transfer") : null,
      bytesTotal: sum(res, "transfer") + nav.transferSize,
      resources: res,
      longTasksBeforeFirst3D: lab.longTasks.filter(([s]: number[]) => s < (first3d ?? Infinity)).map(([s, d]: number[]) => [Math.round(s), Math.round(d)]),
      jsHeapUsedBytes: mem?.usedJSHeapSize ?? null,
      quality: document.documentElement.dataset.quality ?? null,
      bodyFilesDoneMs: Math.max(0, ...res.filter((r) => r.name.startsWith("/assets/body/")).map((r) => r.end)),
      elbowRequestedAtLoad: res.some((r) => r.name.includes("/joints/elbow_r/") && r.name.endsWith(".glb")),
      renderer: perf ? { drawCalls: perf.drawCalls, triangles: perf.triangles, geometries: perf.geometries, textures: perf.textures, textureMemoryBytes: perf.textureMemoryBytes, pixelRatio: perf.pixelRatio, gpu: perf.renderer } : null,
      device: { hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: (navigator as any).deviceMemory ?? null, dpr: devicePixelRatio, width: innerWidth, height: innerHeight, connection: (navigator as any).connection?.effectiveType ?? null },
    };
  });
}

/** Frame + latency statistics for a window [from, to] of lab data. */
async function windowStats(page: Page, from: number, types: string[]) {
  return page.evaluate(
    ([from, types]) => {
      const lab = (window as any).__perfLab;
      const renders: [number, number][] = lab.renders.filter((r: [number, number]) => r[0] >= (from as number));
      const intervals = renders.slice(1).map((r, i) => r[0] - renders[i][0]).filter((d) => d < 250);
      const cpu = renders.map((r) => r[1] - r[0]);
      const inputs = lab.inputs.filter((e: { at: number; type: string }) => e.at >= (from as number) && (types as string[]).includes(e.type));
      const latencies: number[] = [];
      let unrendered = 0;
      for (const e of inputs) {
        const r = renders.find((x) => x[0] >= e.at);
        if (!r || r[0] - e.at > 250) unrendered++;
        else latencies.push(r[1] - e.ts);
      }
      const span = renders.length ? renders[renders.length - 1][0] - renders[0][0] : 0;
      const dropped = intervals.reduce((a, d) => a + Math.max(0, Math.round(d / 16.667) - 1), 0);
      return { intervals, cpu, latencies, unrendered, frames: renders.length, spanMs: span, droppedFrames: dropped, inputs: inputs.length };
    },
    [from, types] as const,
  );
}
const summarize = (w: Awaited<ReturnType<typeof windowStats>>) => ({
  frames: w.frames,
  spanMs: Math.round(w.spanMs),
  fps: w.spanMs > 0 ? +((w.frames - 1) / (w.spanMs / 1000)).toFixed(1) : null,
  frameIntervalMs: stats(w.intervals),
  frameCpuMs: stats(w.cpu),
  droppedFrames: w.droppedFrames,
  inputs: w.inputs,
  inputToRenderMs: stats(w.latencies),
  inputsWithoutRender: w.unrendered,
});
const now = (page: Page) => page.evaluate(() => performance.now());

async function interactions(page: Page, p: Profile) {
  const out: Record<string, unknown> = {};
  const vw = p.viewport.width;
  const vh = p.viewport.height;
  await film(page, "pause");

  // Playback: camera travel and elbow motion shots at 1x.
  for (const [name, shot, ms] of [["playTravel", "fixed.travel", 5000], ["playElbow", "hinge.flexion", 5000], ["playRecap", "compare.pullback", 4000]] as const) {
    await film(page, "seekShot", shot, 0);
    await settle(page);
    const from = await now(page);
    await film(page, "play");
    await page.waitForTimeout(ms);
    await film(page, "pause");
    out[name] = summarize(await windowStats(page, from, []));
    out[`${name}Renderer`] = await qa(page, "perf");
  }

  // Draw calls / triangles per representative shot.
  const shots: Record<string, unknown> = {};
  for (const [shot, off] of [["intro.title", 3000], ["fixed.name", 4000], ["pivot.rotate", 4000], ["ball.move", 4000], ["ball.why", 4000], ["hinge.flexion", 7800], ["hinge.support", 6000], ["hinge.knee", 4000], ["map.all", 5000]] as const) {
    await film(page, "seekShot", shot, off);
    await settle(page);
    await qa(page, "renderNow");
    const s = await qa<any>(page, "perf");
    shots[shot] = { drawCalls: s.drawCalls, triangles: s.triangles, geometries: s.geometries, textures: s.textures, textureMemoryBytes: s.textureMemoryBytes };
  }
  out.shots = shots;

  // Elbow drag through the browser input pipeline (latency) ...
  await film(page, "seekShot", "hinge.try", 600);
  await settle(page);
  let start = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "ulna_r", true);
  if (start) {
    const from = await now(page);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let i = 1; i <= 60; i++) await page.mouse.move(start.x - Math.sin((i / 60) * Math.PI * 2) * 40, start.y - Math.abs(Math.sin((i / 60) * Math.PI)) * 120);
    await page.mouse.up();
    await page.waitForTimeout(300);
    out.dragInput = summarize(await windowStats(page, from, ["pointermove"]));
  }
  // ... and at display rate (events dispatched from requestAnimationFrame) for frame pacing.
  await film(page, "pause");
  await film(page, "seekShot", "hinge.try", 600);
  await settle(page);
  start = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", "ulna_r", true);
  if (start) {
    const from = await now(page);
    await page.evaluate(
      ({ x, y }) =>
        new Promise<void>((resolve) => {
          const target = document.querySelector("canvas")!;
          const fire = (type: string, cx: number, cy: number) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
          fire("pointerdown", x, y);
          let i = 0;
          const step = () => {
            const off = Math.sin((i / 179) * Math.PI * 2) * 150;
            fire("pointermove", x - off * 0.25, y - Math.abs(off));
            if (++i < 180) requestAnimationFrame(step);
            else {
              fire("pointerup", x, y);
              resolve();
            }
          };
          requestAnimationFrame(step);
        }),
      start,
    );
    out.dragDisplayRate = summarize(await windowStats(page, from, ["pointermove"]));
  }
  await film(page, "pause");

  // Slider (keyboard).
  await film(page, "seekShot", "hinge.try", 600);
  await settle(page);
  const slider = page.getByTestId("film-interact").getByRole("slider");
  if (await slider.count()) {
    await slider.focus();
    const from = await now(page);
    for (let i = 0; i < 40; i++) await page.keyboard.press(i % 20 < 10 ? "ArrowRight" : "ArrowLeft");
    await page.waitForTimeout(300);
    out.sliderKeyboard = summarize(await windowStats(page, from, ["keydown"]));
  }
  await film(page, "pause");

  // Timeline scrub (pointer).
  const scrub = await page.getByTestId("film-scrubber").boundingBox();
  if (scrub) {
    const y = scrub.y + scrub.height / 2;
    const from = await now(page);
    await page.mouse.move(scrub.x + scrub.width * 0.1, y);
    await page.mouse.down();
    for (let i = 1; i <= 40; i++) await page.mouse.move(scrub.x + scrub.width * (0.1 + (0.8 * i) / 40), y);
    await page.mouse.up();
    await page.waitForTimeout(300);
    out.scrub = summarize(await windowStats(page, from, ["pointermove", "pointerdown"]));
  }
  await film(page, "pause");

  // Chapter jumps (click).
  {
    const from = await now(page);
    for (const id of ["fixed", "pivot", "ball_socket", "hinge", "body_map", "hook"]) {
      await page.getByTestId(`film-chapter-${id}`).click({ force: true });
      await page.waitForTimeout(400);
    }
    out.chapterJump = summarize(await windowStats(page, from, ["click"]));
  }
  await film(page, "pause");

  // Explore: camera orbit on the background, then structure selection.
  await film(page, "seekShot", "hinge.flexion", 3000);
  await settle(page);
  await film(page, "explore", true);
  await settle(page);
  {
    const from = await now(page);
    const sx = vw * 0.12;
    const sy = vh * 0.3;
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 50; i++) await page.mouse.move(sx + i * 3, sy + Math.sin(i / 8) * 20);
    await page.mouse.up();
    await page.waitForTimeout(600);
    out.exploreOrbit = summarize(await windowStats(page, from, ["pointermove"]));
  }
  await settle(page);
  {
    const from = await now(page);
    for (let i = 0; i < 4; i++) {
      const pt = await qa<{ x: number; y: number } | null>(page, "findScreenPoint", i % 2 ? "radius_r" : "humerus_r", false);
      if (pt) await page.mouse.click(pt.x, pt.y);
      await page.waitForTimeout(400);
    }
    out.selection = summarize(await windowStats(page, from, ["pointerdown"]));
    out.selectionResult = await qa(page, "selection");
  }
  out.heapAfterInteractionsBytes = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? null);
  return out;
}

const report: Record<string, unknown> = {
  label: LABEL,
  dist: process.env.PERF_DIST ?? "dist",
  generatedAt: new Date().toISOString(),
  method: "Cold loads in fresh browser contexts with the HTTP cache disabled; brotli/gzip static server (pipeline/tools/serve_static.mjs); CDP network + CPU throttling. first meaningful 3D = end of the first rendered frame after the film's first shot is applied. Frame times from rAF-rendered frames; input-to-render = event timestamp -> end of the first rendered frame after the event (display presentation adds up to one vsync).",
  profiles: {},
};

test.describe.configure({ mode: "serial" });

/** Every cold run gets a fresh browser: empty HTTP cache, empty GPU shader/program cache (true first visit). */
const launch = () => chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--enable-precise-memory-info"] });

for (const p of PROFILES) {
  test(`perf lab: ${p.id}`, async () => {
    const loads: Record<string, unknown>[] = [];
    for (let i = 0; i < RUNS; i++) {
      const bench = cpuBenchMs();
      const browser = await launch();
      const { page } = await openContext(browser, p, true);
      const errors: string[] = [];
      page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
      loads.push({ run: i + 1, cpuBenchMs: bench, startedAt: new Date().toISOString(), ...(await measureLoad(page)), consoleErrors: errors });
      await browser.close();
    }
    // Repeat visit in the same browser session (HTTP cache enabled, shader cache warm), then interactions.
    const browser = await launch();
    const warm = await openContext(browser, p, false);
    await measureLoad(warm.page);
    const repeat = await measureLoad(warm.page);
    const inter = await interactions(warm.page, p);
    await browser.close();
    const pick = (k: string) => loads.map((l: any) => l[k]).filter((v: unknown) => typeof v === "number") as number[];
    (report.profiles as Record<string, unknown>)[p.id] = {
      profile: p,
      summary: {
        firstMeaningful3DMs: stats(pick("firstMeaningful3DMs")),
        cpuBenchMs: stats(pick("cpuBenchMs")),
        shellVisibleMs: stats(pick("shellVisibleMs")),
        fcpMs: stats(pick("fcpMs")),
        bytesBeforeFirst3D: stats(pick("bytesBeforeFirst3D")),
        bytesTotal: stats(pick("bytesTotal")),
        jsHeapUsedBytes: stats(pick("jsHeapUsedBytes")),
        repeatVisit: { firstMeaningful3DMs: repeat.firstMeaningful3DMs, bytesTotal: repeat.bytesTotal },
        renderer: loads[0]?.renderer,
        quality: loads[0]?.quality,
      },
      loads,
      repeatVisit: repeat,
      interactions: inter,
    };
    mkdirSync(join(ROOT, "qa", "reports"), { recursive: true });
    writeFileSync(join(ROOT, "qa", "reports", `step12.perf.${LABEL}.json`), JSON.stringify(report, null, 1));
  });
}

/**
 * Full playthrough at 1x from a cold visit: does the film stall, and do late assets arrive before they are needed?
 * PERF_PLAYTHROUGH=<profile id>
 */
test("playthrough: buffering and asset readiness vs need", async () => {
  const id = process.env.PERF_PLAYTHROUGH;
  test.skip(!id, "PERF_PLAYTHROUGH not set");
  test.setTimeout(600_000);
  const p = [...PROFILES, ...([] as Profile[])].find((x) => x.id === id) ?? PROFILES[0];
  const browser = await launch();
  const { page } = await openContext(browser, p, true);
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto("/?qa=1");
  await page.waitForFunction(() => (window as any).__perfLab.first3dAt !== null, null, { timeout: 180_000, polling: 100 });
  const samples = await page.evaluate(
    () =>
      new Promise<{ t: number; shot: string; time: number; buffering: boolean; playing: boolean }[]>((resolve) => {
        const out: { t: number; shot: string; time: number; buffering: boolean; playing: boolean }[] = [];
        const f = (window as any).__jointsFilm;
        const iv = setInterval(() => {
          const s = f.state();
          out.push({ t: Math.round(performance.now()), shot: s.shotId, time: Math.round(s.timeMs), buffering: s.buffering, playing: s.playing });
          // the final shot holds for the learner check: reaching that hold is the end of the film
          if (s.ended || s.holdingForCheck || out.length > 1500) {
            clearInterval(iv);
            resolve(out);
          }
        }, 200);
      }),
  );
  const result = await page.evaluate(() => {
    const lab = (window as any).__perfLab;
    const res = (performance.getEntriesByType("resource") as PerformanceResourceTiming[]).filter((r) => r.name.includes("/assets/")).map((r) => ({ name: new URL(r.name).pathname, start: Math.round(r.startTime), end: Math.round(r.responseEnd), transfer: r.transferSize }));
    const renders: [number, number][] = lab.renders;
    const intervals = renders.slice(1).map((r, i) => r[0] - renders[i][0]).filter((d) => d < 250);
    return { first3dAt: lab.first3dAt, res, intervals, cpu: renders.map((r) => r[1] - r[0]) };
  });
  const firstSeen = new Map<string, number>();
  for (const s of samples) if (!firstSeen.has(s.shot)) firstSeen.set(s.shot, s.t);
  const buffering = samples.filter((s) => s.buffering);
  const needs: Record<string, string> = { "/assets/body/v2/body.closeup.glb": "fixed.travel", "/assets/joints/elbow_r/elbow_r.core.glb": "hinge.bones", "/assets/joints/elbow_r/elbow_r.detail.glb": "hinge.bones" };
  const readiness = Object.entries(needs).map(([asset, shot]) => {
    const r = result.res.find((x) => x.name === asset);
    const needAt = firstSeen.get(shot) ?? null;
    return { asset, neededBy: shot, loadedAtMs: r?.end ?? null, shotStartedAtMs: needAt, marginMs: r && needAt ? needAt - r.end : null };
  });
  const out = {
    profile: p,
    first3dAtMs: result.first3dAt,
    durationWallMs: samples.length ? samples[samples.length - 1].t - samples[0].t : 0,
    ended: samples.at(-1)?.time,
    bufferingSamples: buffering.length,
    bufferingMs: buffering.length * 200,
    bufferingShots: [...new Set(buffering.map((b) => b.shot))],
    readiness,
    frameIntervalMs: stats(result.intervals),
    frameCpuMs: stats(result.cpu),
    droppedFrames: result.intervals.reduce((a, d) => a + Math.max(0, Math.round(d / 16.667) - 1), 0),
    consoleErrors: errors,
  };
  await browser.close();
  writeFileSync(join(ROOT, "qa", "reports", `step12.playthrough.${LABEL}.${p.id}.json`), JSON.stringify(out, null, 1));
});
