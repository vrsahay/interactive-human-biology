import type { Texture, WebGLRenderer } from "three";

export interface PerfSnapshot {
  /** Frames rendered in the last second (render-on-demand: 0 while idle is expected). */
  fps: number;
  /** Mean / p95 interval between consecutive rendered frames during continuous activity (gaps >= 100 ms count as idle and are ignored) (ms). */
  frameIntervalMeanMs: number;
  frameIntervalP95Ms: number;
  /** Mean / p95 CPU time spent inside one frame (update + render submit, ms). */
  frameCpuMeanMs: number;
  frameCpuP95Ms: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  /** Estimated GPU texture memory (RGBA8 + full mip chain) in bytes. */
  textureMemoryBytes: number;
  pixelRatio: number;
  framesRendered: number;
  firstFrameMs: number | null;
  firstModelFrameMs: number | null;
  renderer: string;
}

const WINDOW = 240;

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
}

/** Development metrics. Measures what the running page renders; it does not certify device targets. */
export class PerfMonitor {
  private intervals: number[] = [];
  private cpu: number[] = [];
  private stamps: number[] = [];
  private last = 0;
  private framesRendered = 0;
  firstFrameMs: number | null = null;
  firstModelFrameMs: number | null = null;
  private readonly textures = new Set<Texture>();
  private rendererName = "unknown";

  constructor(private readonly renderer: WebGLRenderer) {
    try {
      const gl = renderer.getContext();
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      this.rendererName = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    } catch {
      /* optional */
    }
  }

  trackTextures(textures: Iterable<Texture>): void {
    for (const t of textures) this.textures.add(t);
  }

  frame(startMs: number, endMs: number, hasModel: boolean): void {
    this.framesRendered++;
    if (this.firstFrameMs === null) this.firstFrameMs = endMs;
    if (hasModel && this.firstModelFrameMs === null) this.firstModelFrameMs = endMs;
    if (this.last && startMs - this.last < 100) this.push(this.intervals, startMs - this.last);
    this.last = startMs;
    this.push(this.cpu, endMs - startMs);
    this.stamps.push(endMs);
    while (this.stamps.length && endMs - this.stamps[0] > 1000) this.stamps.shift();
  }

  resetWindow(): void {
    this.intervals = [];
    this.cpu = [];
  }

  private push(arr: number[], v: number): void {
    arr.push(v);
    if (arr.length > WINDOW) arr.shift();
  }

  snapshot(now = performance.now()): PerfSnapshot {
    const info = this.renderer.info;
    let textureMemoryBytes = 0;
    for (const t of this.textures) {
      const img = t.image as { width?: number; height?: number } | undefined;
      if (img?.width && img?.height) textureMemoryBytes += Math.round(img.width * img.height * 4 * (4 / 3));
    }
    const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0);
    return {
      fps: this.stamps.filter((s) => now - s <= 1000).length,
      frameIntervalMeanMs: mean(this.intervals),
      frameIntervalP95Ms: percentile(this.intervals, 95),
      frameCpuMeanMs: mean(this.cpu),
      frameCpuP95Ms: percentile(this.cpu, 95),
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
      textureMemoryBytes,
      pixelRatio: this.renderer.getPixelRatio(),
      framesRendered: this.framesRendered,
      firstFrameMs: this.firstFrameMs,
      firstModelFrameMs: this.firstModelFrameMs,
      renderer: this.rendererName,
    };
  }
}
