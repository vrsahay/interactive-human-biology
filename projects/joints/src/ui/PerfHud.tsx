import { useEffect, useState } from "preact/hooks";
import type { App } from "../engine/core/App";
import type { PerfSnapshot } from "../engine/perf/PerfMonitor";

/** Development metrics overlay. Values describe this device/session only; they are not product performance claims. */
export function PerfHud({ app }: { app: App }) {
  const [snap, setSnap] = useState<PerfSnapshot>(() => app.perf.snapshot());
  useEffect(() => {
    const t = setInterval(() => setSnap(app.perf.snapshot()), 500);
    return () => clearInterval(t);
  }, [app]);
  const kb = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;
  return (
    <div class="perf-hud" data-testid="perf-hud" aria-label="Development performance metrics">
      <div><span>FPS</span><b>{snap.fps}</b></div>
      <div><span>Frame p95</span><b>{snap.frameIntervalP95Ms.toFixed(1)} ms</b></div>
      <div><span>CPU p95</span><b>{snap.frameCpuP95Ms.toFixed(1)} ms</b></div>
      <div><span>Draw calls</span><b>{snap.drawCalls}</b></div>
      <div><span>Triangles</span><b>{snap.triangles.toLocaleString()}</b></div>
      <div><span>Tex mem (est.)</span><b>{kb(snap.textureMemoryBytes)}</b></div>
      <div><span>First 3D frame</span><b>{snap.firstModelFrameMs ? `${Math.round(snap.firstModelFrameMs)} ms` : "–"}</b></div>
      <div><span>DPR</span><b>{snap.pixelRatio}</b></div>
    </div>
  );
}
