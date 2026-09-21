// Step 12R profiler: Chrome trace (main-thread tasks, GC, style/layout/paint, script eval) + V8 CPU samples mapped through the
// production sourcemaps to source files / functions. Scenarios: startup (cold, fresh browser), drag (rAF-driven elbow drag),
// orbit (Explore camera orbit).
//   node qa/perf/trace_profile.mjs --dist dist --profile mobile4x --scenario startup --out qa/perf/traces/startup-mobile4x.json
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { SourceMapConsumer } from "source-map-js";

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const DIST = arg("--dist", "dist");
const SCENARIO = arg("--scenario", "startup");
const PROFILE = arg("--profile", "mobile4x");
const OUT = arg("--out", `qa/perf/traces/${SCENARIO}-${PROFILE}.json`);
const PORT = Number(arg("--port", "4191"));
const DURATION = Number(arg("--seconds", "10")) * 1000;
const QUERY = arg("--query", "");
const FAST_4G = { latency: 165, download: (9e6 / 8) * 0.9, upload: (1.5e6 / 8) * 0.9 };
const PROFILES = {
  laptop: { viewport: { width: 1280, height: 800 }, dpr: 1, cpu: 1, net: FAST_4G, mobile: false },
  tablet: { viewport: { width: 768, height: 1024 }, dpr: 2, cpu: 2, net: FAST_4G, mobile: true, signals: { deviceMemory: null, hardwareConcurrency: 8 } },
  mobile2x: { viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 2, net: FAST_4G, mobile: true, signals: { deviceMemory: 4, hardwareConcurrency: 8 } },
  mobile4x: { viewport: { width: 412, height: 915 }, dpr: 2.625, cpu: 4, net: FAST_4G, mobile: true, signals: { deviceMemory: 4, hardwareConcurrency: 8 } },
};
const p = PROFILES[PROFILE];

const server = spawn(process.execPath, ["pipeline/tools/serve_static.mjs", DIST, String(PORT)], { stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--enable-gpu", "--ignore-gpu-blocklist", "--use-angle=d3d11", "--enable-precise-memory-info"] });
const events = [];
try {
  const ctx = await browser.newContext({ viewport: p.viewport, screen: p.viewport, deviceScaleFactor: p.dpr, isMobile: p.mobile, hasTouch: p.mobile });
  await ctx.addInitScript(() => {
    const lab = (window.__lab = { first3dAt: null, renders: [] });
    const raf = window.requestAnimationFrame.bind(window);
    let film;
    Object.defineProperty(window, "__jointsFilm", { configurable: true, get: () => film, set: (v) => { film = v; performance.mark("lab:film-installed"); const n = performance.getEntriesByName("joints:film-started").length; const wait = () => raf(() => raf(() => { lab.first3dAt = performance.now(); performance.mark("lab:first-3d"); })); wait(); } });
  });
  if (p.signals) await ctx.addInitScript((sig) => {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => sig.hardwareConcurrency, configurable: true });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { get: () => sig.deviceMemory ?? undefined, configurable: true });
  }, p.signals);
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: SCENARIO === "startup" });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: p.net.latency, downloadThroughput: p.net.download, uploadThroughput: p.net.upload });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: p.cpu });
  cdp.on("Tracing.dataCollected", (e) => events.push(...e.value));
  const categories = ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "v8.execute", "v8", "blink.user_timing", "loading", "disabled-by-default-v8.cpu_profiler", "disabled-by-default-v8.gc", "gpu", "toplevel", "blink"].join(",");
  const startTrace = () => cdp.send("Tracing.start", { categories, options: "sampling-frequency=10000", transferMode: "ReportEvents" });
  const endTrace = () => new Promise((resolve) => { cdp.once("Tracing.tracingComplete", resolve); cdp.send("Tracing.end"); });
  const base = `http://localhost:${PORT}/?qa=1${QUERY}`;
  const film = (fn, ...a) => page.evaluate(([f, x]) => window.__jointsFilm[f](...x), [fn, a]);
  const settle = () => page.waitForFunction(() => window.__jointsQA?.idle() && !window.__jointsFilm?.state().buffering, null, { timeout: 120000 });

  let markers = {};
  if (SCENARIO === "startup") {
    await startTrace();
    await page.goto(base);
    await page.waitForFunction(() => window.__lab.first3dAt !== null, null, { timeout: 120000, polling: 100 });
    await page.waitForTimeout(800);
    markers = await page.evaluate(() => ({ marks: performance.getEntriesByType("mark").map((m) => [m.name, Math.round(m.startTime)]), res: performance.getEntriesByType("resource").map((r) => [new URL(r.name).pathname, Math.round(r.startTime), Math.round(r.responseEnd), r.transferSize]), nav: performance.getEntriesByType("navigation")[0].toJSON() }));
    await endTrace();
  } else {
    await page.goto(base + "&autoplay=0");
    await page.waitForFunction(() => window.__jointsFilm, null, { timeout: 120000 });
    await film("seekShot", SCENARIO === "orbit" ? "hinge.flexion" : "hinge.try", SCENARIO === "orbit" ? 3000 : 600);
    await settle();
    if (SCENARIO === "orbit") { await film("explore", true); await settle(); }
    const start = SCENARIO === "orbit" ? { x: p.viewport.width * 0.15, y: p.viewport.height * 0.25 } : await page.evaluate(() => window.__jointsQA.findScreenPoint("ulna_r", true));
    await page.waitForTimeout(500);
    await startTrace();
    if (SCENARIO === "orbit") {
      // OrbitControls needs real pointer capture: drive it through the browser input pipeline
      await page.mouse.move(start.x, start.y);
      await page.mouse.down();
      const t0 = Date.now();
      while (Date.now() - t0 < DURATION) {
        const t = (Date.now() - t0) / 1000;
        await page.mouse.move(start.x + Math.sin(t * 2) * 120, start.y + Math.sin(t * 1.3) * 30);
      }
      await page.mouse.up();
    } else await page.evaluate(({ x, y, ms, orbit }) => new Promise((resolve) => {
      const target = document.querySelector("canvas");
      const fire = (type, cx, cy) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
      performance.mark("lab:interaction-start");
      fire("pointerdown", x, y);
      // drag: closed loop on a 25..120 deg target (same as tests/perf/perf-lab-r.spec.ts) so the hinge never parks at a limit
      const dof = () => window.__jointsQA.getDof("flexion");
      let px = x, py = y;
      const probe = (dx, dy) => { const b = dof(); px += dx; py += dy; fire("pointermove", px, py); return dof() - b; };
      const sy = orbit ? 0 : probe(0, 6) || probe(0, -12);
      const sx = orbit ? 0 : probe(6, 0) || probe(-12, 0);
      const useY = Math.abs(sy) >= Math.abs(sx);
      let slope = (useY ? sy : sx) / 6 || 1;
      const t0 = performance.now();
      const step = () => {
        const t = (performance.now() - t0) / 1000;
        if (orbit) fire("pointermove", x + Math.sin(t * 2) * 120, y + Math.sin(t * 1.3) * 30);
        else {
          const before = dof();
          const d = Math.max(-40, Math.min(40, (72.5 + 47.5 * Math.sin(t * 2.4) - before) / slope));
          if (useY) py += d; else px += d;
          fire("pointermove", px, py);
          const after = dof();
          if (Math.abs(d) > 0.5 && Math.abs(after - before) > 0.05) slope = 0.8 * slope + 0.2 * ((after - before) / d);
        }
        if (performance.now() - t0 < ms) requestAnimationFrame(step);
        else { fire("pointerup", px, py); performance.mark("lab:interaction-end"); resolve(); }
      };
      requestAnimationFrame(step);
    }), { ...start, ms: DURATION, orbit: SCENARIO === "orbit" });
    await endTrace();
  }
  await browser.close();

  // ---------------------------------------------------------------- analysis
  const main = events.find((e) => e.name === "TracingStartedInBrowser")?.args?.data?.frames?.[0];
  const threadNames = new Map(events.filter((e) => e.name === "ThreadName" || e.cat === "__metadata").map((e) => [`${e.pid}:${e.tid}`, e.args?.name]));
  // renderer main thread = the thread with the most "RunTask" events that carries CrRendererMain naming
  const rendererMain = (() => {
    const counts = new Map();
    for (const e of events) if (e.name === "RunTask" || e.name === "FireAnimationFrame" || e.name === "EvaluateScript") counts.set(`${e.pid}:${e.tid}`, (counts.get(`${e.pid}:${e.tid}`) ?? 0) + (e.name === "FireAnimationFrame" ? 50 : 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  })();
  const onMain = events.filter((e) => `${e.pid}:${e.tid}` === rendererMain);
  const t0 = Math.min(...onMain.filter((e) => e.ts).map((e) => e.ts));
  const navStart = events.find((e) => e.name === "navigationStart" && `${e.pid}:${e.tid}` === rendererMain)?.ts ?? t0;
  const ms = (us) => Math.round((us / 1000) * 10) / 10;
  // complete events (B/E pairs -> durations)
  const durations = [];
  const stack = new Map();
  for (const e of onMain) {
    if (e.ph === "X") durations.push({ name: e.name, cat: e.cat, start: e.ts, dur: e.dur ?? 0, data: e.args?.data });
    else if (e.ph === "B") (stack.get(e.name) ?? stack.set(e.name, []).get(e.name)).push(e);
    else if (e.ph === "E") { const b = stack.get(e.name)?.pop(); if (b) durations.push({ name: e.name, cat: b.cat, start: b.ts, dur: e.ts - b.ts, data: b.args?.data }); }
  }
  const sum = (filter) => ms(durations.filter(filter).reduce((a, d) => a + d.dur, 0));
  const topTasks = durations.filter((d) => d.name === "RunTask" || d.name === "ThreadControllerImpl::RunTask").sort((a, b) => b.dur - a.dur).slice(0, 15).map((d) => ({ atMs: ms(d.start - navStart), durMs: ms(d.dur) }));
  const kinds = {};
  for (const d of durations) {
    if (["RunTask", "ThreadControllerImpl::RunTask"].includes(d.name)) continue;
    const k = d.name;
    kinds[k] = (kinds[k] ?? 0) + d.dur;
  }
  const kindTable = Object.entries(kinds).map(([k, v]) => [k, ms(v)]).filter(([, v]) => v >= 5).sort((a, b) => b[1] - a[1]).slice(0, 40);
  const gc = { minorMs: sum((d) => /MinorGC|Scavenge/.test(d.name)), majorMs: sum((d) => /MajorGC|MarkCompact|V8.GC_MARK_COMPACTOR$/.test(d.name)), count: durations.filter((d) => /MinorGC|MajorGC/.test(d.name)).length };

  // CPU profile samples -> self time by source (sourcemapped)
  const nodes = new Map();
  const samples = [];
  const clock = new Map();
  for (const e of events.filter((e) => e.name === "ProfileChunk" || e.name === "Profile")) {
    const cp = e.args?.data?.cpuProfile;
    if (cp?.nodes) for (const n of cp.nodes) nodes.set(`${e.id}:${n.id}`, n);
    if (e.name === "Profile" && e.args?.data?.startTime !== undefined) clock.set(e.id, e.args.data.startTime);
    if (cp?.samples) {
      const deltas = e.args.data.timeDeltas ?? [];
      cp.samples.forEach((s, i) => {
        const at = (clock.get(e.id) ?? 0) + (deltas[i] ?? 0);
        clock.set(e.id, at);
        samples.push({ key: `${e.id}:${s}`, delta: deltas[i] ?? 0, at });
      });
    }
  }
  const maps = new Map();
  const mapFor = (url) => {
    const file = url.split("/").pop();
    if (!file?.endsWith(".js")) return null;
    if (!maps.has(file)) {
      const path = join(DIST, "app", file + ".map");
      maps.set(file, existsSync(path) ? new SourceMapConsumer(JSON.parse(readFileSync(path, "utf8"))) : null);
    }
    return maps.get(file);
  };
  const self = new Map();
  const bySource = new Map();
  let total = 0;
  const labelOf = new Map();
  const inclusive = new Map();
  const nodeLabel = (key) => {
    if (labelOf.has(key)) return labelOf.get(key);
    const n = nodes.get(key);
    const cf = n.callFrame;
    let label = cf.functionName || "(anonymous)";
    const map = cf.url ? mapFor(cf.url) : null;
    if (map && cf.lineNumber >= 0) {
      const o = map.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber });
      if (o.source) label = `${o.name ?? label} (${o.source.replace(/^.*node_modules\//, "nm/").replace(/^.*\/src\//, "src/")}:${o.line})`;
    }
    labelOf.set(key, label);
    return label;
  };
  for (const s of samples) {
    const n = nodes.get(s.key);
    if (!n) continue;
    const cf = n.callFrame;
    let label = cf.functionName || "(anonymous)";
    let source = cf.url ? cf.url.split("/").pop() : cf.functionName.startsWith("(") ? cf.functionName : "(native)";
    const map = cf.url ? mapFor(cf.url) : null;
    if (map && cf.lineNumber >= 0) {
      const o = map.originalPositionFor({ line: cf.lineNumber + 1, column: cf.columnNumber });
      if (o.source) {
        source = o.source.replace(/^.*node_modules\//, "nm/").replace(/^.*\/src\//, "src/");
        label = `${o.name ?? label} (${source}:${o.line})`;
      }
    }
    const dt = Math.max(0, s.delta) / 1000;
    s.label = label;
    total += dt;
    self.set(label, (self.get(label) ?? 0) + dt);
    {
      const seen = new Set();
      const prefix = s.key.slice(0, s.key.indexOf(":") + 1);
      for (let k = s.key, guard = 0; k && nodes.has(k) && guard < 200; guard++) {
        const lb = nodeLabel(k);
        if (!seen.has(lb)) { seen.add(lb); inclusive.set(lb, (inclusive.get(lb) ?? 0) + dt); }
        const parent = nodes.get(k).parent;
        k = parent !== undefined ? prefix + parent : null;
      }
    }
    const group = source.startsWith("nm/three") ? "three.js" : source.startsWith("nm/") ? source.split("/").slice(0, 2).join("/") : source.startsWith("src/") ? source.split("/").slice(0, 3).join("/") : source;
    bySource.set(group, (bySource.get(group) ?? 0) + dt);
  }
  const top = (m, n) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => [k, Math.round(v)]);
  const frames = durations.filter((d) => d.name === "FireAnimationFrame").map((d) => d.start).sort((a, b) => a - b);
  const frameIntervals = frames.slice(1).map((f, i) => (f - frames[i]) / 1000);
  const pct = (a, q) => (a.length ? [...a].sort((x, y) => x - y)[Math.min(a.length - 1, Math.ceil((q / 100) * a.length) - 1)] : null);
  let breakdown = null;
  if (SCENARIO === "startup") {
    const M = {};
    for (const [n, t] of markers.marks) if (!(n in M)) M[n] = t;
    const R = (test) => markers.res.filter((r) => test(r[0])).map((r) => ({ file: r[0].split("/").pop(), start: r[1], end: r[2], transfer: r[3] }));
    const span = (a, b) => (M[a] !== undefined && M[b] !== undefined ? M[b] - M[a] : null);
    const parsedMinusFetched = (label) => (M["joints:parsed:" + label] !== undefined ? M["joints:parsed:" + label] - M["joints:fetched:" + label] : null);
    const fetchedKeys = Object.keys(M).filter((k) => k.startsWith("joints:fetched:"));
    const bodyFetched = Math.max(...fetchedKeys.filter((k) => k.startsWith("joints:fetched:body.")).map((k) => M[k]));
    const nameIs = (list) => (d) => list.some((n) => d.name === n || d.name.startsWith(n));
    breakdown = {
      "1_html_shell": { responseEndMs: Math.round(markers.nav.responseEnd), headParsedMs: M["joints:html-head"] },
      "2_main_js_download": R((n) => n.startsWith("/app/index-") && n.endsWith(".js")),
      "3_js_parse_compile_ms": sum(nameIs(["v8.compile", "V8.CompileLazy", "v8.compileModule", "V8.ParseProgram", "V8.CompileCode", "v8.parseOnBackground"])),
      "4_module_evaluation": { evaluateMs: sum(nameIs(["v8.evaluateModule", "EvaluateScript", "v8.run"])), modulesEvaluatedAtMs: M["joints:main-eval"], shellRenderedAtMs: M["joints:shell-rendered"], appConstructAtMs: M["joints:app-construct"] },
      "5_joint_manifest_fetch": R((n) => n.endsWith("joint-manifest.json")),
      "6_body_manifest_fetch": { request: R((n) => n.endsWith("body-delivery.json")), parsedAtMs: M["joints:body-manifest"] },
      "7_body_asset_fetch": R((n) => n.includes("/assets/body/") && n.endsWith(".glb") || n.endsWith("body-materials.glb")),
      "8_texture_fetch_decode": { environment: R((n) => n.endsWith(".rgbe")), environmentDecodeMs: span("joints:env-fetched", "joints:environment-ready"), materialLibraryParseMs: parsedMinusFetched("body.materials"), imageDecodeMs: sum(nameIs(["Decode Image", "ImageDecodeTask", "Decode LazyPixelRef"])) },
      "9_renderer_creation_ms": span("joints:stage-start", "joints:renderer-created"),
      "10_shader_compilation_ms": span("joints:scene-created", "joints:shaders-ready"),
      "11_scene_creation": { glbParseMs: Object.fromEntries(fetchedKeys.map((k) => [k.slice(15), parsedMinusFetched(k.slice(15))])), bindAfterLastFetchMs: M["joints:body-bound"] !== undefined ? M["joints:body-bound"] - bodyFetched : null, validateMs: span("joints:validate-start", "joints:scene-create-start"), applyFirstShotMs: span("joints:scene-create-start", "joints:scene-created") },
      "12_first_draw_ms": span("joints:first-render-start", "joints:first-draw-submitted"),
      "13_first_meaningful_visual_ms": M["lab:first-3d"],
      marks: M,
    };
  }
  // forced (script-triggered) style/layout: which source line asked for it
  const forced = new Map();
  for (const e of onMain) {
    const st = e.args?.beginData?.stackTrace ?? e.args?.data?.stackTrace;
    if (!st || !(e.name === "Layout" || e.name === "UpdateLayoutTree" || e.name === "RecalculateStyles")) continue;
    const fr = st[0];
    let where = `${fr.functionName || "(anon)"} ${String(fr.url).split("/").pop()}:${fr.lineNumber}`;
    const map = fr.url ? mapFor(fr.url) : null;
    if (map) { const o = map.originalPositionFor({ line: fr.lineNumber, column: fr.columnNumber }); if (o.source) where = `${o.name ?? fr.functionName} (${(o.source.includes("/src/") ? "src/" + o.source.split("/src/").pop() : o.source.includes("node_modules/") ? "nm/" + o.source.split("node_modules/").pop() : o.source)}:${o.line})`; }
    const dur = e.dur ?? 0;
    const cur = forced.get(`${e.name} <- ${where}`) ?? { count: 0, ms: 0 };
    cur.count++;
    cur.ms += dur / 1000;
    forced.set(`${e.name} <- ${where}`, cur);
  }
  // long animation frames (BeginMainFrame > 2x the median): what ran inside them
  const bmf = durations.filter((d) => d.name === "WebFrameWidgetImpl::BeginMainFrame").sort((a, b) => a.start - b.start);
  const bmfMedian = pct(bmf.map((d) => d.dur), 50) ?? 0;
  const longBmf = bmf.filter((d) => d.dur > Math.max(2 * bmfMedian, 30000));
  const inside = (d) => (e) => e.start >= d.start && e.start + e.dur <= d.start + d.dur;
  const childKinds = ["FireAnimationFrame", "EventDispatch", "UpdateLayoutTree", "Layout", "Paint", "PrePaint", "MinorGC", "MajorGC", "V8.GC_SCAVENGER", "FunctionCall"];
  const longFrames = {
    medianMs: ms(bmfMedian), count: longBmf.length, of: bmf.length,
    childTotalsMs: Object.fromEntries(childKinds.map((k) => [k, ms(longBmf.reduce((a, d) => a + durations.filter((e) => e.name === k && inside(d)(e)).reduce((x, e) => x + e.dur, 0), 0))])),
    topFunctions: (() => {
      const m = new Map();
      for (const d of longBmf) for (const sm of samples) if (sm.label && sm.at >= d.start && sm.at <= d.start + d.dur) m.set(sm.label, (m.get(sm.label) ?? 0) + sm.delta / 1000);
      return top(m, 25);
    })(),
  };
  const forcedTop = [...forced.entries()].sort((a2, b2) => b2[1].ms - a2[1].ms).slice(0, 15).map(([k, v]) => [k, v.count, Math.round(v.ms)]);
  const report = {
    forcedStyleLayout: forcedTop,
    longFrames,
    breakdown,
    scenario: SCENARIO, profile: PROFILE, dist: DIST, query: QUERY, generatedAt: new Date().toISOString(),
    markers,
    mainThread: { totalTaskMs: sum((d) => d.name === "RunTask" || d.name === "ThreadControllerImpl::RunTask"), topTasks, byEvent: kindTable, gc },
    cpuProfile: { sampledMs: Math.round(total), bySource: top(bySource, 25), topFunctions: top(self, 45), inclusive: top(new Map([...inclusive].filter(([k]) => !k.startsWith("("))), 60) },
    frames: SCENARIO === "startup" ? null : { count: frames.length, intervalP50: pct(frameIntervals, 50), intervalP95: pct(frameIntervals, 95) },
  };
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(report, null, 1));
  if (breakdown) for (const [k, v] of Object.entries(breakdown)) if (k !== "marks") console.log(k, JSON.stringify(v));
  console.log(JSON.stringify({ totalTaskMs: report.mainThread.totalTaskMs, topTasks: topTasks.slice(0, 8), byEvent: kindTable.slice(0, 22), gc, bySource: report.cpuProfile.bySource.slice(0, 14), topFunctions: report.cpuProfile.topFunctions.slice(0, 30), frames: report.frames, forced: forcedTop, longFrames }));
} finally {
  await browser.close().catch(() => undefined);
  server.kill();
}
