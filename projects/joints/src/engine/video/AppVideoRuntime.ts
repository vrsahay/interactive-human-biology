import { Vector3 } from "three";
import type { App } from "../core/App";
import { SITE_SCALE_M, type BodyViewName, type PresetParams, type ViewName } from "../camera/CameraDirector";
import { interpolateShot, type CameraShot } from "../camera/framing";
import { resolveJointRefs, resolvePoseValue } from "./validateVideoLesson";
import { ExploreSession } from "../explore/ExploreSession";
import type { ExploreConfig } from "../explore/exploreTypes";
import type { PoseValue, Shot } from "./videoTypes";
import type { ShotApplyOptions, VideoRuntime } from "./VideoRuntime";
import { easeInOutCubic } from "./poseKeys";
import { shotAssetNeeds } from "./assetNeeds";

const BODY_VIEWS = new Set(["front", "frontRight", "right", "backRight", "left", "frontLeft"]);
/** Camera travel for a learner-paced detour: long enough to read as a move, short enough not to be a wait. */
const EXPLORE_MOVE_MS = 1100;
/** The layout breakpoint the film's CSS uses: below it panels stack under the subject, above it they sit beside it. */
const NARROW_MAX_PX = 900;
/** Clear space kept between the composed subject's band and the panel below it. */
const BAND_GAP_PX = 12;

/** What an open exploration panel occupies, and how far down the top bar reaches, in stage CSS pixels. */
export interface ExploreReserve {
  panel: { left: number; top: number; right: number; bottom: number };
  topInset: number;
}
const RECALL_MOVE_MS = 900;
const STATIC_CONCEPT_PHASE = 0.125;

/**
 * VideoRuntime over the Step-10/11 App. Shot patterns (presentBody, presentJoint, presentLabels, presentOverlays,
 * frameCamera, setInteraction) are generic; nothing here names a bone, a joint or a chapter.
 */
export class AppVideoRuntime implements VideoRuntime {
  private shotCameras: { start: CameraShot; end: CameraShot } | null = null;
  private travelFrom: CameraShot | null = null;
  private currentShotId: string | null = null;
  private readonly scratch = { position: new Vector3(), target: new Vector3() };
  private readonly scratch2 = { position: new Vector3(), target: new Vector3() };
  private placing = false;

  private shift = 0;
  private shiftFrom = 0;
  private lift = 0;
  private liftFrom = 0;
  private exploring = false;
  /** Step 16E: what an open exploration panel leaves free, measured by the shell (stage CSS pixels). */
  private reserve: ExploreReserve | null = null;
  /** The framing an open exploration asked for, so a resize re-frames the exploration rather than the shot beneath it. */
  private exploreView: { site: string; scale: number; bodyView: BodyViewName; elevation?: number } | null = null;
  /** The band the subject is composed into while exploring (QA). */
  private band: { top: number; bottom: number; scale: number } | null = null;
  private lastShot: Shot | null = null;
  private lastLocal = 0;
  private lastGlobal = 0;

  constructor(private readonly app: App, private readonly text: (key: string) => string) {
    if (!app.body || !app.concepts) throw new Error("the video runtime requires the body orientation asset");
    app.director.externallyDriven = true;
    // Prepared body stages are swapped in only at a shot boundary (a cut, or a travel that starts from a full-body framing),
    // never in the middle of a shot: the new state change coincides with the shot change.
    app.resizeHooks.push(() => {
      // An open exploration is framed on its own joint, not on the shot underneath it: rotating a phone mid-task must
      // not drop the learner back into the film's framing with the panel still open.
      if (this.session && this.exploreView) {
        void this.app.view("site", { params: this.exploreView, durationMs: 0, immediate: true });
        this.composeForExplore();
        return;
      }
      if (!this.lastShot) return;
      // Framing depends on the aspect ratio: recompute the shot cameras and re-place without travel.
      const shot = this.lastShot;
      this.computeShotCameras(shot);
      this.travelFrom = null;
      this.updateShotTime(shot, this.lastLocal, this.lastGlobal, { reduced: this.prefersReducedMotion() });
    });
  }

  prefersReducedMotion(): boolean {
    return this.app.prefersReducedMotion();
  }

  now(): number {
    return performance.now();
  }

  /**
   * Lesson time and render-frame time are not the same thing (Step 16B).
   *
   * The render loop clamps its own frame delta so a long gap cannot fling a camera tween or a pose animation across the
   * scene. Feeding that clamped delta to the film made the *lesson* slow down whenever frames were dropped: at 1.6 fps
   * the film ran at an eighth of real time while the narration, which rides the audio clock, carried on. Measured
   * against the reference lesson under the same throttling, ours lost seven seconds of every eight.
   *
   * So the film gets true elapsed time from the frame timestamp instead. Dropped frames now cost frames, not lesson
   * time: the next rendered frame shows the moment the lesson has actually reached.
   *
   * A gap longer than SUSPEND_MS is not throttling - the page was backgrounded, or the machine slept. Fast-forwarding
   * through minutes of lesson would be worse than pausing through them, so that tick is skipped and the clock
   * re-anchors; narration is re-positioned from the film's time on the next state emit, so the two stay together either
   * way.
   */
  startClock(tick: (dtMs: number) => void): () => void {
    let running = true;
    let last = this.now();
    const remove = this.app.loop.addTicker((_dt, now) => {
      if (!running) return false;
      const elapsed = now - last;
      last = now;
      if (elapsed > 0 && elapsed <= AppVideoRuntime.SUSPEND_MS) tick(elapsed);
      return running;
    });
    return () => {
      running = false;
      remove();
    };
  }

  /** Longer than this between frames is a suspended page, not a slow one. */
  static readonly SUSPEND_MS = 4000;

  setPlaying(playing: boolean): void {
    this.app.externalMotion = playing;
    this.app.loop.requestRender();
  }

  // ------------------------------------------------------------------ shot patterns

  applyShot(shot: Shot, options: ShotApplyOptions): void {
    // Swap prepared LOD upgrades only where they cannot be seen changing: on a cut, or while the camera still rests on a
    // full-body framing (a travel from it starts at that framing).
    if (this.app.body!.hasPending && (options.cut || this.framingIsFullBody())) this.upgradeBody();
    this.presentBody(shot);
    this.presentJoint(shot);
    this.presentLabels(shot);
    this.presentOverlays(shot);
    this.setInteraction(shot, false);
    this.frameCamera(shot, options);
    this.currentShotId = shot.id;
  }

  /** Body presentation: visibility, restrained highlight, dim-others, skin shell, handover to the joint asset. */
  presentBody(shot: Shot): void {
    const body = this.app.body!;
    body.present({ visible: shot.body.visible, highlight: body.resolve(shot.body.highlight), dimOthers: shot.body.dimOthers, shell: shot.body.shell, hidden: body.resolve(shot.body.hidden) });
    const shared = this.app.manifest.structures.filter((s) => this.app.loadedTiers.has(s.tier)).map((s) => s.source.object as string);
    body.handOver(shared, shot.joint.visible && shot.joint.handOver);
  }

  /** Joint asset presentation: all structures hidden unless the shot shows the joint; detail/reveal/highlight by id. */
  presentJoint(shot: Shot): void {
    const app = this.app;
    if (!app.jointAttached) {
      if (shot.joint.visible) throw new Error(`${shot.id}: joint asset not attached (prepareShot was not awaited)`);
      return;
    }
    const all = app.structures.all().map((e) => e.structureId);
    const states = app.structureStates;
    states.reset();
    if (!shot.joint.visible) {
      states.set(all, { visibility: "hide" });
    } else {
      const problems: string[] = [];
      const reveal = resolveJointRefs(shot.joint.reveal, app.manifest, problems, shot.id);
      const highlight = resolveJointRefs(shot.joint.highlight, app.manifest, problems, shot.id);
      if (problems.length) throw new Error(problems.join("; "));
      if (reveal.length) states.set(reveal, { visibility: "show" });
      if (highlight.length) states.highlightOnly(highlight);
    }
    app.setLayers({ detail: shot.joint.visible && shot.joint.detail, context: false, labels: true, axis: shot.joint.visible, bands: shot.joint.visible });
  }

  /** Anchor labels (joint), band labels, body site labels - all by id, text from the locale. */
  presentLabels(shot: Shot): void {
    const l = shot.labels;
    this.app.setLabelPolicy({ show: new Set(l.anchors), bands: new Set(l.bands), focus: new Set(l.focus), dim: new Set(), closeUpOnly: new Set() });
    this.app.setSiteLabels(new Map(l.sites.map((s) => [s.siteId, this.text(s.textKey)])));
  }

  /** Joint motion overlays, schematic bands and body concept indicators. */
  presentOverlays(shot: Shot): void {
    const o = shot.overlays;
    this.app.axisOverlay?.setOpacityScale(1);
    this.app.setOverlayState({ axis: o.axis, neutralDirection: o.neutralDirection, currentDirection: o.currentDirection, motionArrow: o.motionArrow, angleBadge: o.angleBadge, arc: o.arc, ticks: o.ticks, bands: new Set(o.bands) });
    this.app.concepts!.show(o.concepts);
  }

  setInteraction(shot: Shot, explore: boolean): void {
    const guided = shot.joint.visible && (shot.interaction.mode === "guided" || explore);
    this.app.setInteractionPolicy({ mode: guided ? (explore ? "free" : "guided") : "passive", picking: explore, dofRange: {} });
  }

  // ------------------------------------------------------------------ camera

  private presetParams(shot: Shot, scale: number): { name: string; params: PresetParams } {
    const c = shot.camera;
    if (c.preset === "body") return { name: "body", params: { bodyView: c.view as BodyViewName, margin: scale, elevation: c.elevation } };
    if (c.preset === "site") return { name: "site", params: { site: c.site, bodyView: c.view as BodyViewName, scale, elevation: c.elevation } };
    const problems: string[] = [];
    const structures = c.structures ? resolveJointRefs(c.structures, this.app.manifest, problems, shot.id) : undefined;
    if (BODY_VIEWS.has(c.view)) throw new Error(`${shot.id}: joint camera with body view`);
    return { name: c.preset, params: { view: c.view as ViewName, margin: scale, structures, extentM: c.extentM, elevation: c.elevation } };
  }

  /** Compute the shot's start/end framing; record where the camera is now for a travel transition. */
  private computeShotCameras(shot: Shot): string {
    const d = this.app.director;
    const a = this.presetParams(shot, shot.camera.scale);
    const b = this.presetParams(shot, shot.camera.endScale ?? shot.camera.scale);
    this.shotCameras = { start: d.shot(a.name, a.params), end: d.shot(b.name, b.params) };
    return a.name;
  }

  frameCamera(shot: Shot, options: ShotApplyOptions): void {
    const name = this.computeShotCameras(shot);
    const travel = !options.cut && !options.reduced && shot.camera.transitionMs > 0;
    this.travelFrom = travel ? { position: this.app.stage.camera.position.clone(), target: this.app.controls.target.clone(), minDistance: 0, maxDistance: 0 } : null;
    this.shiftFrom = travel ? this.shift : AppVideoRuntime.composeShift(shot);
    this.liftFrom = travel ? this.lift : this.liftFor(shot);
    this.app.director.markGuided(name);
    this.lastShot = shot;
    this.updateShotTime(shot, 0, 0, { reduced: options.reduced });
  }

  /** Horizontal projection shift (fraction of viewport width) for a shot's composition; mobile keeps the subject centred. */
  static composeShift(shot: Shot, width = globalThis.innerWidth ?? 1280): number {
    if (width < 900) return 0;
    return shot.camera.compose === "right" ? 0.16 : shot.camera.compose === "left" ? -0.16 : 0;
  }

  /**
   * Narrow layouts stack the captions, the interaction panel and the player at the bottom of the screen: frame shots in the
   * area above them (fraction of the height reserved at the bottom). Wide layouts keep the Step-11 composition.
   */
  static composeLift(width: number, withPanel: boolean): number {
    if (width >= 900) return 0;
    return withPanel ? 0.4 : 0.28;
  }

  private liftFor(shot: Shot): number {
    const panel = shot.joint.visible && (shot.interaction.mode === "guided" || this.exploring);
    return AppVideoRuntime.composeLift(this.app.stage.size.width, panel);
  }

  private applyShift(shift: number, liftFraction: number): void {
    const cam = this.app.stage.camera;
    const { width, height } = this.app.stage.size;
    this.shift = shift;
    this.lift = liftFraction;
    const lift = Math.round(height * liftFraction);
    if (Math.abs(shift) < 1e-4 && lift === 0) {
      if (cam.zoom !== 1) cam.zoom = 1;
      if (cam.view?.enabled) cam.clearViewOffset();
      else cam.updateProjectionMatrix();
      return;
    }
    // A taller virtual frame whose lower part is rendered puts the optical centre in the middle of the area above the
    // reserved band. That view alone magnifies by (h + lift) / h; the zoom brings the subject back to fit h - lift.
    cam.zoom = (height - lift) / (height + lift);
    cam.setViewOffset(width, height + lift, -shift * width, lift, width, height);
  }

  updateShotTime(shot: Shot, localMs: number, globalMs: number, options: { reduced: boolean }): void {
    if (!this.shotCameras) return;
    const f = shot.durationMs > 0 ? Math.min(1, localMs / shot.durationMs) : 1;
    // Reduced motion: no in-shot dolly; hold the authored end framing.
    const dolly = options.reduced ? 1 : easeInOutCubic(f);
    const at = interpolateShot(this.shotCameras.start, this.shotCameras.end, dolly, this.scratch);
    this.lastShot = shot;
    this.lastLocal = localMs;
    this.lastGlobal = globalMs;
    let position = at.position;
    let target = at.target;
    const shiftTo = AppVideoRuntime.composeShift(shot, this.app.stage.size.width);
    const liftTo = this.liftFor(shot);
    let shift = shiftTo;
    let lift = liftTo;
    if (this.travelFrom && !options.reduced) {
      const tf = shot.camera.transitionMs > 0 ? Math.min(1, localMs / shot.camera.transitionMs) : 1;
      shift = this.shiftFrom + (shiftTo - this.shiftFrom) * easeInOutCubic(tf);
      lift = this.liftFrom + (liftTo - this.liftFrom) * easeInOutCubic(tf);
      if (tf < 1) {
        const destination: CameraShot = { position: at.position.clone(), target: at.target.clone(), minDistance: 0, maxDistance: 0 };
        const blended = interpolateShot(this.travelFrom, destination, easeInOutCubic(tf), this.scratch2);
        position = blended.position;
        target = blended.target;
      } else this.travelFrom = null;
    }
    this.applyShift(shift, lift);
    this.placing = true;
    this.app.director.place(position, target, { minDistance: this.shotCameras.end.minDistance, maxDistance: this.shotCameras.end.maxDistance });
    this.placing = false;
    // Concept indicators: phase from the global clock (static under reduced motion).
    const loop = shot.overlays.conceptLoopMs;
    for (const site of shot.overlays.concepts) this.app.concepts!.setPhase(site, options.reduced ? STATIC_CONCEPT_PHASE : (globalMs % loop) / loop);
    this.app.loop.requestRender();
  }

  // ------------------------------------------------------------------ delivery

  private framingIsFullBody(): boolean {
    return !!this.lastShot && this.lastShot.camera.preset === "body" && this.travelFrom === null;
  }

  private upgradeBody(): void {
    const applied = this.app.body!.applyPending();
    if (applied.length) {
      performance.mark("joints:groups-applied");
      this.bodyUpgrades.push({ atShot: this.lastShot?.id ?? null, groups: applied.length, at: performance.now() });
      this.app.events.emit("bodyStage", { stageId: "*", state: "applied" });
      this.app.loop.requestRender();
    }
  }

  /** Record of LOD upgrades (QA: they must happen on full-body framing or a cut). */
  readonly bodyUpgrades: { atShot: string | null; groups: number; at: number }[] = [];

  prepareShot(shot: Shot): Promise<void> | null {
    const app = this.app;
    const body = app.body!;
    const needs = shotAssetNeeds(shot, app.manifest, body.stages());
    const waits: Promise<unknown>[] = [];
    for (const stageId of needs.bodyStages) {
      const st = body.stageStatus(stageId);
      if (st !== "ready" && st !== "applied") waits.push(body.ensureStage(stageId));
    }
    if (needs.joint && !app.jointReady(needs.jointTiers))
      waits.push(
        app.attachJoint(needs.jointTiers).then(() => {
          // A deferred attach finishes while some other shot is on screen. That shot's joint presentation ran when the joint
          // did not exist yet (presentJoint returns early), so without this the joint asset appears with its initial layers -
          // fitted axis overlay, schematic bands - during a shot that asks for none of them.
          // Only shots that do not show the joint are re-applied: re-applying a shot that does show it would reset structure
          // states under an active interaction.
          if (this.lastShot && !this.lastShot.joint.visible) {
            this.presentJoint(this.lastShot);
            this.presentOverlays(this.lastShot);
          }
        }),
      );
    return waits.length ? Promise.all(waits).then(() => undefined) : null;
  }

  preload(shots: readonly Shot[]): void {
    for (const shot of shots) {
      const p = this.prepareShot(shot);
      // Failures surface when the shot is reached (prepareShot is called again and the timeline reports the error).
      p?.catch((error) => console.warn(`preload for ${shot.id} failed: ${(error as Error).message}`));
    }
  }

  // ------------------------------------------------------------------ pose

  resolvePose(value: PoseValue, dof: string): number {
    return resolvePoseValue(value, dof, this.app.manifest);
  }

  getPose(): Record<string, number> {
    return this.app.joint.currentPose();
  }

  setPose(pose: Record<string, number>): void {
    for (const [dof, v] of Object.entries(pose)) this.app.setDof(dof, v, "lesson");
  }

  // ------------------------------------------------------------------ explore
  //
  // An explore session is a detour from the film: it re-frames the camera on one joint, lights that joint and hands the
  // learner a control. Closing it restores the shot exactly, so an exploration can never leak into lesson state.

  private session: ExploreSession | null = null;

  /** QA: the composition currently applied to the camera (fractions of the stage; the band in stage pixels). */
  get composition(): { shift: number; lift: number; band: { top: number; bottom: number; scale: number } | null } {
    return { shift: this.shift, lift: this.lift, band: this.band };
  }

  /**
   * The shell measures the open exploration panel and the top bar and hands them here (Step 16E). The subject is then
   * composed into the stage those leave free, instead of into a fixed fraction that no longer matched the panel.
   */
  setExploreReserve(reserve: ExploreReserve | null): void {
    this.reserve = reserve;
    if (this.session) this.composeForExplore();
  }

  get exploreSession(): ExploreSession | null {
    return this.session;
  }

  /**
   * Both learner-paced detours - an exploration and the recall challenge - light or move individual bones, which the
   * delivery proxy cannot do. A learner can reach either from anywhere (a chapter jump, a deep link), so neither may
   * assume the grouped body has already arrived: wait for it, and apply it, before presenting anything.
   */
  async ensureGroupedBody(): Promise<void> {
    const body = this.app.body!;
    for (const stage of body.stages().slice(1)) {
      const status = body.stageStatus(stage.stageId);
      if (status !== "ready" && status !== "applied") await body.ensureStage(stage.stageId);
    }
    if (body.hasPending) this.upgradeBody();
  }

  /**
   * Open an exploration (the caller pauses the film first).
   * A rig-driven explore needs its joint asset, which is loaded lazily, so this is async: the learner can reach the elbow
   * explore from anywhere, not only from the chapter that happens to have already loaded it.
   */
  async openExplore(config: ExploreConfig): Promise<ExploreSession> {
    this.closeExplore();
    const app = this.app;
    await this.ensureGroupedBody();
    if (config.motion.kind === 'dof' && !app.jointAttached) await app.attachJoint([]);
    // the exploration owns the pointer for as long as it is open: a drag moves the joint, never the camera
    app.setOrbitLocked(true);
    this.session = new ExploreSession(config, {
      body: app.body!,
      setDof: (dofId, value, source) => app.setDof(dofId, value, source),
      getDof: (dofId) => (app.jointAttached ? app.joint.getDof(dofId) : 0),
      requestRender: () => app.loop.requestRender(),
    });
    const body = app.body!;
    const rig = config.motion.kind === 'dof';
    body.present({ visible: true, highlight: body.resolve(config.highlight), dimOthers: true, shell: false, hidden: [] });
    if (rig) {
      // The validated joint asset is what the learner drives, so it replaces the body's copy of those bones exactly as the
      // lesson's own elbow shots do. Input is opened to the same free mode the film uses for a learner-controlled moment.
      app.structureStates.reset();
      const shared = app.manifest.structures.filter((st) => app.loadedTiers.has(st.tier)).map((st) => st.source.object as string);
      body.handOver(shared, true);
      app.setLayers({ detail: false, context: false, labels: true, axis: true, bands: true });
      app.setInteractionPolicy({ mode: 'free', picking: false, dofRange: {} });
    } else {
      // A teaching simulation moves render groups itself; the joint asset stays out of it and nothing may drive a DOF.
      body.handOver([], false);
      app.setLayers({ detail: false, context: false, labels: true, axis: false, bands: false });
      app.setInteractionPolicy({ mode: 'passive', picking: false, dofRange: {} });
    }
    app.setSiteLabels(new Map(config.siteLabels.map((l) => [l.siteId, this.text(l.textKey)])));
    this.exploreView = { site: config.site, scale: config.camera.scale, bodyView: config.camera.view as BodyViewName, elevation: config.camera.elevation };
    this.composeForExplore();
    // A deliberate, brisk move: the learner should see the joint they asked to explore, not wait out a long dolly.
    void app.view('site', { params: this.exploreView, durationMs: EXPLORE_MOVE_MS, immediate: this.prefersReducedMotion() });
    app.loop.requestRender();
    return this.session;
  }

  /**
   * Show one retrieval step: light the joint in question, frame it, and say nothing about which category it is - that is
   * what the learner is being asked to supply.
   */
  presentRecallStep(step: { site: string; highlight: string[]; camera: { view: string; scale: number; elevation?: number } }): void {
    const app = this.app;
    const body = app.body!;
    body.present({ visible: true, highlight: body.resolve(step.highlight), dimOthers: true, shell: false, hidden: [] });
    body.handOver([], false);
    app.setSiteLabels(new Map());
    app.setLabelPolicy({ show: new Set(), bands: new Set(), focus: new Set(), dim: new Set(), closeUpOnly: new Set() });
    app.concepts!.show([]);
    app.setLayers({ detail: false, context: false, labels: true, axis: false, bands: false });
    app.setInteractionPolicy({ mode: "passive", picking: false, dofRange: {} });
    this.liftForPanel();
    // Short enough that the question and its joint arrive together, long enough to show which way the camera travelled.
    void app.view("site", { params: { site: step.site, scale: step.camera.scale, bodyView: step.camera.view as BodyViewName, elevation: step.camera.elevation }, durationMs: RECALL_MOVE_MS, immediate: this.prefersReducedMotion() });
    app.loop.requestRender();
  }

  /**
   * A detour opens a panel over the stage. On a narrow layout that panel covers the middle of the picture, which is
   * exactly where the joint the learner was asked about would otherwise be: lift the subject above it, the same way the
   * film's own guided shots do. Leaving the detour re-applies the shot, which restores the shot's own composition.
   */
  private liftForPanel(): void {
    this.applyShift(0, AppVideoRuntime.composeLift(this.app.stage.size.width, true));
  }

  /**
   * Step 16E. Compose an open exploration into the part of the stage its panel leaves free.
   *
   * The old rule reserved a fixed 40 % at the bottom of a narrow screen. The panel and the player had grown to cover
   * 68-78 % of a 390 x 844 screen, so the joint the learner was asked to move sat underneath the panel. The old rule also
   * shrank the subject by the reserved fraction whichever way it had been fitted: in portrait the fit is limited by the
   * width, so that shrink bought nothing and only made the target smaller.
   *
   * Narrow: centre the subject in the band between the top bar and the panel, and shrink it only if that band is shorter
   * than the side the subject was fitted to. Wide: the panel sits beside the subject, so centre the subject in the width
   * the panel leaves, at the same scale. The camera itself - position, distance, framing sphere - is exactly what the
   * exploration asked for; only the projection is composed.
   */
  private composeForExplore(): void {
    const r = this.reserve;
    const { width, height } = this.app.stage.size;
    if (!width || !height) return;
    if (!r) {
      // Not measured yet: the panel renders after the session opens, and reports in a frame later. Until then, assume the
      // old reserved fraction - but through the same projection as the measured case. The old path widened the virtual
      // frame, and three.js's setViewOffset sets camera.aspect = fullWidth / fullHeight, so the exploration's framing was
      // computed for a 0.33 aspect instead of 0.46 (390 x 844) and the camera stood 1.39x further back than its own
      // framing asked for.
      const bottom = width >= NARROW_MAX_PX ? height : height * (1 - AppVideoRuntime.composeLift(width, true));
      this.applyBand(0, 0, bottom, Math.min(1, Math.min(width, bottom) / Math.min(width, height)));
      return;
    }
    if (width >= NARROW_MAX_PX) {
      const [from, to] = r.panel.left < width / 2 ? [r.panel.right, width] : [0, r.panel.left];
      const shift = Math.max(-0.3, Math.min(0.3, ((from + to) / 2 - width / 2) / width));
      this.applyBand(shift, 0, height, 1);
      return;
    }
    const top = Math.max(0, r.topInset);
    const bottom = Math.max(top + 1, Math.min(height, r.panel.top - BAND_GAP_PX));
    const band = bottom - top;
    // never magnified beyond the fit the exploration asked for; reduced only when the band is the tighter side
    const scale = Math.min(1, Math.min(width, band) / Math.min(width, height));
    this.applyBand(0, top, bottom, scale);
  }

  /** Put the optical centre in the middle of [top, bottom] (stage pixels), shifted sideways by `shift` x width. */
  private applyBand(shift: number, top: number, bottom: number, scale: number): void {
    const cam = this.app.stage.camera;
    const { width, height } = this.app.stage.size;
    this.band = { top: Math.round(top), bottom: Math.round(bottom), scale: +scale.toFixed(4) };
    this.shift = shift;
    this.lift = (height - bottom) / height;
    const centreY = (top + bottom) / 2;
    cam.zoom = scale;
    cam.setViewOffset(width, height, -shift * width, height / 2 - centreY, width, height);
    this.app.loop.requestRender();
  }

  /** Close the session and restore the shot the film was on. */
  closeExplore(shot?: Shot): void {
    if (!this.session) return;
    this.session.exit();
    this.session = null;
    this.exploreView = null;
    this.band = null;
    // the pointer goes back to the lesson: orbiting is allowed again
    this.app.setOrbitLocked(false);
    this.app.body!.clearGroupTransforms();
    if (shot) {
      // The shot's camera is computed from the camera's aspect, which the composition sets: give it the shot's own
      // composition first, so the film comes back to the framing it has when it plays, not one shaped by the panel.
      this.applyShift(AppVideoRuntime.composeShift(shot, this.app.stage.size.width), this.liftFor(shot));
      this.presentBody(shot);
      this.presentJoint(shot);
      this.presentLabels(shot);
      this.presentOverlays(shot);
      this.frameCamera(shot, { cut: true, reduced: this.prefersReducedMotion() });
    }
    this.app.loop.requestRender();
  }

  setExplore(on: boolean, shot: Shot): void {
    this.exploring = on;
    this.setInteraction(shot, on);
    // the joint controls panel appears in Explore: keep the subject above it on narrow layouts
    if (on && this.lastShot) this.applyShift(this.shift, this.liftFor(shot));
    if (!on) this.app.director.markGuided(shot.camera.preset);
  }

  // ------------------------------------------------------------------ events

  onLearnerInput(cb: (e: { dofId: string; source: string; value: number }) => void): () => void {
    return this.app.events.on("learnerInput", cb);
  }

  onDragState(cb: (dragging: boolean) => void): () => void {
    return this.app.events.on("motion", (m) => cb(m.dragging));
  }

  onCameraTakeover(cb: () => void): () => void {
    return this.app.events.on("camera", (c) => {
      if (c.mode === "free" && !this.placing) cb();
    });
  }

  get shotId(): string | null {
    return this.currentShotId;
  }

  /** Framing radius (m) for site presets, exposed for QA. */
  static siteRadius(scale: number): number {
    return SITE_SCALE_M * scale;
  }
}
