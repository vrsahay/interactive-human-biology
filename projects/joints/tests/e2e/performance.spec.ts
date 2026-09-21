import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { openApp, qa, settle } from "./support";

const ROOT = join(import.meta.dirname, "..", "..");

async function measureLoad(page: Page) {
  await openApp(page);
  return page.evaluate(() => {
    const q = (window as any).__jointsQA;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const res = performance.getEntriesByType("resource").filter((r) => /\.glb|manifest/.test(r.name)).map((r) => ({ name: r.name.split("/").pop(), ms: Math.round(r.duration), transferBytes: (r as PerformanceResourceTiming).transferSize }));
    return { firstModelFrameMs: q.perf().firstModelFrameMs, domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd), resources: res };
  });
}

/** Drag through the real pointer path at display rate: synthetic PointerEvents dispatched from requestAnimationFrame. */
async function measureDrag(page: Page) {
  await qa(page, "view", "closeUp", true);
  await settle(page);
  const start = await qa<{ x: number; y: number }>(page, "findScreenPoint", "ulna_r", true);
  await qa(page, "resetPerfWindow");
  const result = await page.evaluate(
    ({ x, y }) =>
      new Promise<{ frames: number; durationMs: number; minFlexion: number; maxFlexion: number }>((resolve) => {
        const stage = document.querySelector("[data-testid=stage]") as HTMLElement;
        const target = document.querySelector("canvas")!;
        const q = (window as any).__jointsQA;
        const fire = (type: string, cx: number, cy: number) => target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, composed: true, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, clientX: cx, clientY: cy }));
        void stage;
        fire("pointerdown", x, y);
        const frames = 180;
        let i = 0;
        let minF = 999;
        let maxF = -1;
        const t0 = performance.now();
        const step = () => {
          const t = i / (frames - 1);
          const off = Math.sin(t * Math.PI * 2) * 170;
          fire("pointermove", x - off * 0.25, y - Math.abs(off));
          const f = q.getDof("flexion");
          minF = Math.min(minF, f);
          maxF = Math.max(maxF, f);
          if (++i < frames) requestAnimationFrame(step);
          else {
            fire("pointerup", x, y);
            resolve({ frames, durationMs: performance.now() - t0, minFlexion: minF, maxFlexion: maxF });
          }
        };
        requestAnimationFrame(step);
      }),
    start,
  );
  const snap = await qa<Record<string, unknown>>(page, "perf");
  return { ...result, perf: snap };
}

test("development performance measurements (not a device certification)", async ({ page, browser }) => {
  test.setTimeout(240_000);
  const local = await measureLoad(page);
  const localDrag = await measureDrag(page);
  const idleFramesBefore = await qa<{ framesRendered: number }>(page, "perf");
  await page.waitForTimeout(1500);
  const idleFramesAfter = await qa<{ framesRendered: number }>(page, "perf");

  // Emulated constrained profile: CPU 4x slowdown + "fast 4G"-like network (9 Mbps down, 60 ms RTT). Still desktop GPU.
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 1 });
  const p2 = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p2);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const throttled = await measureLoad(p2);
  const throttledDrag = await measureDrag(p2);
  await ctx.close();

  const report = {
    generatedAt: new Date().toISOString(),
    environment: "Playwright headless Google Chrome on the development machine; production build (vite preview). NOT a mid-range phone.",
    targets: { firstMeaningful3DViewMs: 2500, p95FrameTimeMs: 22, dragFpsMin: 45, note: "Final product targets on a mid-range 2022+ phone over fast 4G; not certified by this run." },
    local: { load: local, drag: localDrag, idle: { framesRenderedDuring1500msIdle: idleFramesAfter.framesRendered - idleFramesBefore.framesRendered } },
    emulatedConstrained: { profile: "CPU 4x throttle, 9 Mbps / 60 ms RTT network, 412x915 @1x", load: throttled, drag: throttledDrag },
  };
  writeFileSync(join(ROOT, "qa", "reports", `${process.env.QA_STEP ?? "step12"}.sandbox_performance.json`), JSON.stringify(report, null, 1));
  expect(local.firstModelFrameMs).toBeGreaterThan(0);
  expect(idleFramesAfter.framesRendered - idleFramesBefore.framesRendered).toBeLessThanOrEqual(2);
});
