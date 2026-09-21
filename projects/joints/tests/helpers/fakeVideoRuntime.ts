// In-memory VideoRuntime for timeline tests: records shot applications and pose writes; time is injected.
import type { JointManifestModel } from "../../src/engine/assets/ManifestLoader";
import { resolvePoseValue } from "../../src/engine/video/validateVideoLesson";
import type { ShotApplyOptions, VideoRuntime } from "../../src/engine/video/VideoRuntime";
import type { PoseValue, Shot } from "../../src/engine/video/videoTypes";

export class FakeVideoRuntime implements VideoRuntime {
  reduced = false;
  clock = 0;
  applied: { id: string; cut: boolean }[] = [];
  updates: { id: string; localMs: number }[] = [];
  poses: Record<string, number>[] = [];
  pose: Record<string, number> = {};
  playing = false;
  explore: boolean | null = null;
  tickFn: ((dt: number) => void) | null = null;
  /** Shots whose assets are not ready: prepareShot returns this promise until resolve()/reject() is called. */
  readonly waiting = new Map<string, { promise: Promise<void>; resolve: () => void; reject: (e: Error) => void }>();
  preloaded: string[][] = [];
  private learner: ((e: { dofId: string; source: string; value: number }) => void)[] = [];
  private drag: ((d: boolean) => void)[] = [];
  private camera: (() => void)[] = [];

  constructor(private readonly manifest: JointManifestModel) {
    for (const d of manifest.dofs) this.pose[d.id] = d.neutral;
  }

  prefersReducedMotion() { return this.reduced; }
  now() { return this.clock; }
  startClock(tick: (dt: number) => void) { this.tickFn = tick; return () => { this.tickFn = null; }; }
  /** Advance the injected clock and the timeline by dt (ms) in frames of `frame` ms. */
  run(ms: number, frame = 50) {
    for (let t = 0; t < ms; t += frame) {
      this.clock += frame;
      this.tickFn?.(frame);
    }
  }
  applyShot(shot: Shot, o: ShotApplyOptions) { this.applied.push({ id: shot.id, cut: o.cut }); }
  updateShotTime(shot: Shot, localMs: number) { this.updates.push({ id: shot.id, localMs }); }
  resolvePose(v: PoseValue, dof: string) { return resolvePoseValue(v, dof, this.manifest); }
  getPose() { return { ...this.pose }; }
  setPose(p: Record<string, number>) {
    for (const [k, v] of Object.entries(p)) this.pose[k] = Math.min(145, Math.max(0, v));
    this.poses.push({ ...this.pose });
  }
  setExplore(on: boolean) { this.explore = on; }
  setPlaying(p: boolean) { this.playing = p; }
  onLearnerInput(cb: (e: { dofId: string; source: string; value: number }) => void) { this.learner.push(cb); return () => undefined; }
  onDragState(cb: (d: boolean) => void) { this.drag.push(cb); return () => undefined; }
  onCameraTakeover(cb: () => void) { this.camera.push(cb); return () => undefined; }
  /** Simulate a learner moving the joint (App emits learnerInput, then setDof). */
  learnerInput(dof: string, value: number, source = "drag") {
    for (const cb of this.learner) cb({ dofId: dof, source, value });
    this.pose[dof] = value;
  }
  setDragging(d: boolean) { for (const cb of this.drag) cb(d); }
  /** Mark a shot as needing assets (a pending download). */
  needAssets(shotId: string) {
    let resolve!: () => void;
    let reject!: (e: Error) => void;
    const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
    promise.catch(() => undefined);
    this.waiting.set(shotId, { promise, resolve: () => { this.waiting.delete(shotId); resolve(); }, reject: (e) => { this.waiting.delete(shotId); reject(e); } });
  }
  prepareShot(shot: Shot) { return this.waiting.get(shot.id)?.promise ?? null; }
  preload(shots: readonly Shot[]) { this.preloaded.push(shots.map((s) => s.id)); }
  orbit() { for (const cb of this.camera) cb(); }
}
