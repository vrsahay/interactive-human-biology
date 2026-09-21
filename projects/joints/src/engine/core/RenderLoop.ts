/** A ticker advances time-based work (camera tween, damping, DOF animation). Return true while it needs more frames. */
export type Ticker = (dtMs: number, nowMs: number) => boolean;

export interface FrameInfo {
  nowMs: number;
  dtMs: number;
  /** True when no ticker requested another frame (scene is at rest after this frame). */
  settled: boolean;
}

/**
 * Render-on-demand loop: nothing runs while the scene is idle. requestRender() schedules exactly one frame;
 * tickers that report ongoing work keep scheduling frames until they finish.
 */
export class RenderLoop {
  private scheduled = false;
  private lastFrame = 0;
  private readonly tickers = new Set<Ticker>();
  private disposed = false;
  framesRendered = 0;

  constructor(
    private readonly renderFrame: (info: FrameInfo) => void,
    private readonly raf: (cb: FrameRequestCallback) => number = (cb) => requestAnimationFrame(cb),
  ) {}

  private suspended = false;
  private wanted = false;

  /** Hold rendering (e.g. until shader programs finish compiling in parallel); requests are remembered. */
  suspend(): void {
    this.suspended = true;
  }

  resume(): void {
    if (!this.suspended) return;
    this.suspended = false;
    if (this.wanted || this.tickers.size) {
      this.wanted = false;
      this.requestRender();
    }
  }

  get isSuspended(): boolean {
    return this.suspended;
  }

  requestRender(): void {
    if (this.suspended) {
      this.wanted = true;
      return;
    }
    if (this.scheduled || this.disposed) return;
    this.scheduled = true;
    this.raf((now) => this.frame(now));
  }

  addTicker(t: Ticker): () => void {
    this.tickers.add(t);
    this.requestRender();
    return () => this.tickers.delete(t);
  }

  get idle(): boolean {
    return !this.scheduled && this.tickers.size === 0 && !this.suspended;
  }

  dispose(): void {
    this.disposed = true;
    this.tickers.clear();
  }

  private frame(now: number): void {
    this.scheduled = false;
    if (this.disposed) return;
    if (this.suspended) {
      this.wanted = true;
      return;
    }
    const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : 16.7;
    this.lastFrame = now;
    let more = false;
    for (const t of [...this.tickers]) {
      if (t(dt, now)) more = true;
      else this.tickers.delete(t);
    }
    this.renderFrame({ nowMs: now, dtMs: dt, settled: !more });
    this.framesRendered++;
    if (more) this.requestRender();
    else this.lastFrame = 0;
  }
}
