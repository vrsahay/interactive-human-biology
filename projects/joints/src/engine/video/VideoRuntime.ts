import type { PoseValue, Shot } from "./videoTypes";

export interface ShotApplyOptions {
  /** true: place the shot's state instantly (seek, first frame, reduced motion). false: travel from the current camera. */
  cut: boolean;
  reduced: boolean;
}

/**
 * The only bridge between the film timeline and the runtime. Everything is addressed by ids (structureId, anchorId,
 * bandId, body site id, dof id); the timeline never touches meshes or scene objects.
 */
export interface VideoRuntime {
  prefersReducedMotion(): boolean;
  now(): number;
  /** Frame clock on the render loop; returns a stop function. */
  startClock(tick: (dtMs: number) => void): () => void;
  /** Declarative scene state for a shot (body presentation, joint visibility, labels, overlays, interaction policy). */
  applyShot(shot: Shot, options: ShotApplyOptions): void;
  /** Time-dependent presentation inside a shot: camera dolly / travel and concept indicator phase. */
  updateShotTime(shot: Shot, localMs: number, globalMs: number, options: { reduced: boolean }): void;
  resolvePose(value: PoseValue, dof: string): number;
  getPose(): Record<string, number>;
  /** Lesson-driven pose: JointController.setDof with source "lesson". */
  setPose(pose: Record<string, number>): void;
  /** Explore mode: the learner may orbit and (if the joint is shown) bend it; the film is paused. */
  setExplore(on: boolean, shot: Shot): void;
  onLearnerInput(cb: (e: { dofId: string; source: string; value: number }) => void): () => void;
  onDragState(cb: (dragging: boolean) => void): () => void;
  /** The learner took the camera (orbit/zoom). */
  onCameraTakeover(cb: () => void): () => void;
  /** Tell the renderer a timeline is driving frames (defers expensive per-frame work). */
  setPlaying(playing: boolean): void;
  /**
   * Assets the shot needs that are not ready yet: null when it can be applied now, otherwise a promise that resolves when it
   * can (the timeline buffers meanwhile) and rejects if a download fails.
   */
  prepareShot(shot: Shot): Promise<void> | null;
  /** Background preloading hint for upcoming shots (idempotent, cheap when already loaded). */
  preload(shots: readonly Shot[]): void;
}
