import { EventBus } from "../core/EventBus";
import { evaluatePoseTarget, PoseHoldTracker, type PoseCheckResult } from "./checks";
import { easeInOutCubic, samplePoseKeys } from "./poseKeys";
import type { VideoRuntime } from "./VideoRuntime";
import type { Shot, VideoLesson } from "./videoTypes";

export interface ShotEntry {
  shot: Shot;
  chapterIndex: number;
  shotIndex: number;
  startMs: number;
  endMs: number;
}

export type LearnerState = "none" | "active" | "resuming";

export interface TimelineState {
  timeMs: number;
  durationMs: number;
  playing: boolean;
  ended: boolean;
  chapterIndex: number;
  chapterId: string;
  shotId: string;
  shotIndex: number;
  localMs: number;
  /** Learner took the joint during a guided shot: the film clock is held. */
  learner: LearnerState;
  /** Held at the end of a shot until its check is answered. */
  holdingForCheck: boolean;
  check: { status: "none" | "pending" | "correct" | "incorrect"; result: PoseCheckResult | null };
  explore: boolean;
  /** Increments on every seek (state reconstruction). */
  seeks: number;
  /** Waiting for assets the next shot needs (film clock held, previous frame kept). */
  buffering: boolean;
  /** Last asset failure (buffering stops; the film stays paused on the previous shot). */
  loadError: string | null;
}

export interface TimelineEvents {
  state: TimelineState;
  shot: { entry: ShotEntry; cut: boolean };
}

const RESUME_BLEND_MS = 600;
/** Assets for shots starting within this much film time are fetched in the background. */
export const PRELOAD_LOOKAHEAD_MS = 30_000;

/**
 * Plays a video lesson: a clock over declarative shots. Shot boundaries apply the next shot's scene state (camera travels);
 * seeking reconstructs the target shot directly and samples its time-based tracks, never replaying earlier shots.
 * Guided shots hand the joint to the learner on input (film clock held) and resume after idle with a pose blend.
 */
/** How long a correct guided check stays on screen before the film carries on. */
const CHECK_CONFIRM_MS = 1600;

export class VideoTimeline {
  readonly events = new EventBus<TimelineEvents>();
  readonly entries: ShotEntry[] = [];
  readonly durationMs: number;
  private s: TimelineState;
  private stopClock: (() => void) | null = null;
  private current: ShotEntry;
  private lastLearnerInput = 0;
  private dragging = false;
  private blend: { from: Record<string, number>; startedAt: number } | null = null;
  private tracker: PoseHoldTracker | null = null;
  /** The learner chose to continue past the current shot's check. */
  private checkSkipped = false;
  private continueTimer: ReturnType<typeof setTimeout> | null = null;

  /** Invalidates the continuation of an older buffering wait (seek / reset while waiting). */
  private bufferToken = 0;
  private lastPreloadAt = -Infinity;
  private lastPreloadShot = -1;
  private readonly offs: (() => void)[] = [];

  constructor(readonly lesson: VideoLesson, private readonly runtime: VideoRuntime) {
    let t = 0;
    lesson.chapters.forEach((chapter, chapterIndex) =>
      chapter.shots.forEach((shot, shotIndex) => {
        this.entries.push({ shot, chapterIndex, shotIndex, startMs: t, endMs: t + shot.durationMs });
        t += shot.durationMs;
      }),
    );
    if (!this.entries.length) throw new Error("video lesson has no shots");
    this.durationMs = t;
    this.current = this.entries[0];
    this.s = {
      timeMs: 0, durationMs: t, playing: false, ended: false, chapterIndex: 0, chapterId: lesson.chapters[0].id, shotId: this.current.shot.id, shotIndex: 0, localMs: 0,
      learner: "none", holdingForCheck: false, check: { status: "none", result: null }, explore: false, seeks: 0, buffering: false, loadError: null,
    };
    this.offs.push(runtime.onLearnerInput((e) => this.onLearnerInput(e)));
    this.offs.push(runtime.onDragState((d) => this.onDrag(d)));
    this.offs.push(runtime.onCameraTakeover(() => this.onCameraTakeover()));
  }

  get state(): TimelineState {
    return { ...this.s, check: { ...this.s.check } };
  }

  get entry(): ShotEntry {
    return this.current;
  }

  chapterStartMs(chapterIndex: number): number {
    const e = this.entries.find((x) => x.chapterIndex === chapterIndex);
    if (!e) throw new Error(`chapter ${chapterIndex} out of range`);
    return e.startMs;
  }

  entryAt(ms: number): ShotEntry {
    const t = Math.min(Math.max(0, ms), this.durationMs - 1);
    return this.entries.find((e) => t >= e.startMs && t < e.endMs) ?? this.entries[this.entries.length - 1];
  }

  private emit(): void {
    this.events.emit("state", this.state);
  }

  // ------------------------------------------------------------------ transport

  /** Render the very first frame (or reconstruct after load). */
  /** Render the very first frame. Background preloading can be deferred until that frame is on screen. */
  start(ms = 0, options: { deferPreload?: boolean } = {}): void {
    this.suppressPreload = !!options.deferPreload;
    this.seek(ms);
    this.suppressPreload = false;
  }

  private suppressPreload = false;

  play(): void {
    if (this.s.ended) this.seek(0);
    if (this.s.explore) this.setExplore(false);
    this.s.playing = true;
    this.runtime.setPlaying(true);
    if (!this.stopClock) this.stopClock = this.runtime.startClock((dt) => this.tick(dt));
    this.emit();
  }

  pause(): void {
    this.s.playing = false;
    this.runtime.setPlaying(false);
    this.stopClock?.();
    this.stopClock = null;
    this.emit();
  }

  toggle(): void {
    if (this.s.playing) this.pause();
    else this.play();
  }

  /** Jump anywhere: reconstruct the shot at that time (cut) and sample its tracks. */
  seek(ms: number): void {
    const t = Math.min(Math.max(0, ms), this.durationMs);
    const entry = this.entryAt(t);
    this.clearLearner();
    this.clearCheck(entry);
    this.current = entry;
    this.s.ended = false;
    this.s.seeks++;
    const token = ++this.bufferToken;
    this.s.buffering = false;
    this.s.loadError = null;
    this.preload(true);
    const wait = this.runtime.prepareShot(entry.shot);
    if (wait) {
      // Keep the previous picture while the target shot's assets arrive; reconstruct it as soon as they are ready.
      this.s.buffering = true;
      this.setTime(Math.min(t, entry.endMs));
      this.emit();
      wait.then(
        () => {
          if (token !== this.bufferToken) return;
          this.s.buffering = false;
          this.runtime.applyShot(entry.shot, { cut: true, reduced: this.reduced });
          this.events.emit("shot", { entry, cut: true });
          // A seek to the very end must finish the lesson whether or not its assets had to be fetched first; without
          // this, jumping to the end from a cold cache left the film on the last frame and never said it had ended.
          if (t >= this.durationMs) {
            this.s.ended = true;
            this.pause();
          }
          this.evaluate();
          this.emit();
        },
        (error) => this.failBuffering(token, error),
      );
      return;
    }
    this.runtime.applyShot(entry.shot, { cut: true, reduced: this.reduced });
    this.events.emit("shot", { entry, cut: true });
    this.setTime(Math.min(t, entry.endMs));
    if (t >= this.durationMs) {
      this.s.ended = true;
      this.pause();
    }
    this.evaluate();
    this.emit();
  }

  seekChapter(chapterIndex: number): void {
    this.seek(this.chapterStartMs(chapterIndex));
  }

  replay(): void {
    this.seek(0);
    this.play();
  }

  /** Back to the beginning, paused, with interactive state cleared. */
  reset(): void {
    this.bufferToken++;
    this.s.buffering = false;
    this.pause();
    this.setExplore(false);
    this.seek(0);
  }

  /** Learner resumes the film after taking the joint / exploring. */
  resume(): void {
    if (this.s.explore) this.setExplore(false);
    if (this.s.learner === "active") this.beginResumeBlend();
    this.play();
  }

  /** Skip a held check and continue. */
  continuePastCheck(): void {
    if (!this.s.holdingForCheck) return;
    this.s.holdingForCheck = false;
    this.checkSkipped = true;
    this.advanceTo(this.current.endMs);
    this.emit();
  }

  setExplore(on: boolean): void {
    if (this.s.explore === on) return;
    this.s.explore = on;
    if (on && this.s.playing) this.pause();
    this.runtime.setExplore(on, this.current.shot);
    if (!on && !this.s.buffering) {
      // Return to the film framing exactly as authored at this time.
      this.runtime.applyShot(this.current.shot, { cut: true, reduced: this.reduced });
      this.evaluate();
    }
    this.emit();
  }

  dispose(): void {
    this.bufferToken++;
    this.pause();
    if (this.continueTimer) clearTimeout(this.continueTimer);
    for (const off of this.offs) off();
    this.events.clear();
  }

  // ------------------------------------------------------------------ clock

  private get reduced(): boolean {
    return this.runtime.prefersReducedMotion();
  }

  private setTime(t: number): void {
    this.s.timeMs = t;
    this.s.localMs = t - this.current.startMs;
    this.s.chapterIndex = this.current.chapterIndex;
    this.s.chapterId = this.lesson.chapters[this.current.chapterIndex].id;
    this.s.shotId = this.current.shot.id;
    this.s.shotIndex = this.entries.indexOf(this.current);
  }

  /** Advance the clock by dt (also used by tests without a render loop). */
  tick(dtMs: number): void {
    if (!this.s.playing) return;
    this.preload(false);
    if (this.s.buffering) return;
    const now = this.runtime.now();
    if (this.s.learner === "active") {
      const idleFor = now - this.lastLearnerInput;
      if (!this.dragging && idleFor >= this.current.shot.interaction.resumeAfterIdleMs && !this.current.shot.interaction.check) this.beginResumeBlend();
      else return; // clock held: nothing observable changed
    }
    if (this.s.holdingForCheck) {
      this.runtime.updateShotTime(this.current.shot, this.s.localMs, this.s.timeMs, { reduced: this.reduced });
      return;
    }
    this.advanceTo(this.s.timeMs + dtMs);
    this.emit();
  }

  private advanceTo(t: number): void {
    let target = t;
    while (target >= this.current.endMs) {
      const shot = this.current.shot;
      if (shot.interaction.waitForCheck && this.s.check.status !== "correct" && !this.checkSkipped && !this.s.holdingForCheck && this.s.timeMs < this.current.endMs) {
        this.setTime(this.current.endMs - 1e-3);
        this.s.holdingForCheck = true;
        this.evaluate();
        return;
      }
      this.s.holdingForCheck = false;
      const next = this.entries[this.entries.indexOf(this.current) + 1];
      if (!next) {
        this.current = this.entries[this.entries.length - 1];
        this.setTime(this.durationMs);
        this.s.ended = true;
        this.evaluate();
        this.pause();
        return;
      }
      const wait = this.runtime.prepareShot(next.shot);
      if (wait) {
        // Hold on the last frame of the current shot until the next shot's assets are ready, then continue.
        const token = ++this.bufferToken;
        this.setTime(this.current.endMs - 1e-3);
        this.s.buffering = true;
        this.evaluate();
        wait.then(
          () => {
            if (token !== this.bufferToken) return;
            this.s.buffering = false;
            this.advanceTo(this.current.endMs);
            this.emit();
          },
          (error) => this.failBuffering(token, error),
        );
        return;
      }
      this.clearLearner();
      this.clearCheck(next);
      this.current = next;
      const cut = this.reduced;
      this.runtime.applyShot(next.shot, { cut, reduced: this.reduced });
      this.events.emit("shot", { entry: next, cut });
    }
    this.setTime(target);
    this.evaluate();
  }

  /** Sample every time-based track of the current shot at the current time. */
  private evaluate(): void {
    const shot = this.current.shot;
    const local = Math.min(this.s.localMs, shot.durationMs);
    if (shot.joint.visible && shot.joint.poseKeys.length && this.s.learner !== "active" && !this.s.explore) {
      let pose = samplePoseKeys(shot.joint.poseKeys, local, (v, dof) => this.runtime.resolvePose(v, dof), this.reduced);
      if (this.blend) {
        const f = Math.min(1, (this.runtime.now() - this.blend.startedAt) / RESUME_BLEND_MS);
        const e = easeInOutCubic(f);
        pose = Object.fromEntries(Object.entries(pose).map(([dof, v]) => [dof, (this.blend!.from[dof] ?? v) + (v - (this.blend!.from[dof] ?? v)) * e]));
        if (f >= 1) {
          this.blend = null;
          this.s.learner = "none";
        }
      }
      this.runtime.setPose(pose);
    }
    if (!this.s.explore) this.runtime.updateShotTime(shot, local, this.s.timeMs, { reduced: this.reduced });
  }

  // ------------------------------------------------------------------ delivery

  /** Ask the runtime to fetch assets for shots starting within the lookahead window (throttled). */
  preload(force: boolean): void {
    if (this.suppressPreload) return;
    const index = this.entries.indexOf(this.current);
    if (!force && index === this.lastPreloadShot && this.s.timeMs - this.lastPreloadAt < 1000) return;
    this.lastPreloadShot = index;
    this.lastPreloadAt = this.s.timeMs;
    const from = this.current.startMs;
    const to = this.s.timeMs + PRELOAD_LOOKAHEAD_MS;
    this.runtime.preload(this.entries.filter((e) => e.startMs >= from && e.startMs <= to).map((e) => e.shot));
  }

  /** Learner intent (e.g. focusing a chapter marker): fetch that chapter's assets ahead of a jump. */
  preloadChapter(chapterIndex: number): void {
    this.runtime.preload(this.entries.filter((e) => e.chapterIndex === chapterIndex).map((e) => e.shot));
  }

  private failBuffering(token: number, error: unknown): void {
    if (token !== this.bufferToken) return;
    this.s.buffering = false;
    this.s.loadError = error instanceof Error ? error.message : String(error);
    this.pause();
    this.emit();
  }

  // ------------------------------------------------------------------ learner

  private onLearnerInput(e: { dofId: string; source: string; value: number }): void {
    const shot = this.current.shot;
    if (shot.interaction.mode !== "guided" && !this.s.explore) return;
    const before = `${this.s.learner}|${this.s.check.status}`;
    this.lastLearnerInput = this.runtime.now();
    if (!this.s.explore) {
      this.s.learner = "active";
      this.blend = null;
    }
    const check = shot.interaction.check;
    if (check && this.s.check.status !== "correct") {
      this.tracker ??= new PoseHoldTracker(check);
      const pose = { ...this.runtime.getPose(), [e.dofId]: e.value };
      if (this.tracker.update(pose[check.dof], this.runtime.now())) this.answerCheck();
      else {
        const inside = Math.abs(pose[check.dof] - check.target) <= check.tolerance;
        if (this.continueTimer) clearTimeout(this.continueTimer);
        if (inside) {
          this.continueTimer = setTimeout(() => {
            const v = this.runtime.getPose()[check.dof];
            if (this.tracker && this.s.check.status !== "correct" && this.tracker.update(v, this.runtime.now())) this.answerCheck();
          }, check.holdMs + 30);
        }
      }
    }
    // Emit only on a state change: a drag produces an input per frame, the UI does not need one per frame.
    if (`${this.s.learner}|${this.s.check.status}` !== before) this.emit();
  }

  /** Explicit "check my pose" (keyboard/pointer users who do not want to hold). */
  answerCheck(): PoseCheckResult | null {
    const check = this.current.shot.interaction.check;
    if (!check) return null;
    const result = evaluatePoseTarget(check, this.runtime.getPose());
    this.s.check = { status: result.correct ? "correct" : "incorrect", result };
    if (result.correct) {
      // Keep the learner pose: the check completes the shot.
      this.s.learner = "none";
      this.blend = null;
      if (!this.current.shot.interaction.waitForCheck) this.s.holdingForCheck = false;
      else {
        const next = this.entries[this.entries.indexOf(this.current) + 1];
        if (!next) {
          this.s.holdingForCheck = false;
          this.setTime(this.durationMs);
          this.s.ended = true;
          this.pause();
        } else {
          // The check no longer ends the lesson, so a correct answer must not snap straight into the next shot: hold a
          // moment so the confirmation can be read. The Continue button is on screen throughout, for anyone faster.
          this.s.holdingForCheck = true;
          if (this.continueTimer) clearTimeout(this.continueTimer);
          this.continueTimer = setTimeout(() => {
            this.continueTimer = null;
            if (this.s.check.status === "correct") this.continuePastCheck();
          }, CHECK_CONFIRM_MS);
        }
      }
    }
    this.emit();
    return result;
  }

  private onDrag(d: boolean): void {
    this.dragging = d;
    if (!d) this.lastLearnerInput = this.runtime.now();
  }

  private onCameraTakeover(): void {
    if (!this.s.explore) this.setExplore(true);
  }

  private beginResumeBlend(): void {
    this.blend = { from: this.runtime.getPose(), startedAt: this.runtime.now() };
    this.s.learner = "resuming";
  }

  private clearLearner(): void {
    this.s.learner = "none";
    this.blend = null;
    this.dragging = false;
  }

  private clearCheck(entry: ShotEntry): void {
    this.tracker = null;
    this.checkSkipped = false;
    if (this.continueTimer) clearTimeout(this.continueTimer);
    this.s.holdingForCheck = false;
    this.s.check = { status: entry.shot.interaction.check ? "pending" : "none", result: null };
  }
}
