import { MathUtils, Sphere, Vector3, type Box3, type Object3D, type PerspectiveCamera } from "three";
import type { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { RenderLoop } from "../core/RenderLoop";
import { easeInOutCubic, shotForBox, shotForSphere, type CameraShot } from "./framing";

/** Joint geometry a camera preset may use. Hinge joints provide all fields; other controller types can provide a subset. */
export interface JointFramingInfo {
  pivot: Vector3;
  /** Rotation axis (hinge) - viewing from +axis shows increasing DOF as counter-clockwise motion. */
  axis?: Vector3;
  /** Direction of travel at neutral (anterior for a flexion hinge). */
  travel?: Vector3;
  /** Radius (m) that contains the articular landmarks and the motion arc. */
  focusRadius: number;
}

export type ViewName = "oblique" | "anterior" | "axisPositive" | "axisNegative";
export type BodyViewName = "front" | "frontRight" | "right" | "backRight" | "left" | "frontLeft";

/** Body-level framing info (full-body orientation asset). */
export interface BodyFramingInfo {
  up: Vector3;
  right: Vector3;
  anterior: Vector3;
  bounds: () => Box3;
  site: (siteId: string) => { anchor: Vector3; radiusM: number };
}

export interface PresetParams {
  /** structureIds (already resolved) to frame. */
  structures?: string[];
  view?: ViewName;
  margin?: number;
  /** Half-size (m) of a pivot-centred framing volume. */
  extentM?: number;
  /** Body presets: joint site id and body-relative view. */
  site?: string;
  bodyView?: BodyViewName;
  /** Site framing radius multiplier (radius = 0.05 m x scale). */
  scale?: number;
  /** Extra upward component added to the view direction. */
  elevation?: number;
}

export interface PresetContext {
  camera: PerspectiveCamera;
  up: Vector3;
  joint: JointFramingInfo;
  /** Objects currently visible and relevant for framing. */
  subjects: () => Object3D[];
  /** Bounding box of the visible subjects over the joint's whole motion range (pose-independent framing). */
  motionEnvelope: () => Box3;
  /** World box of the given structures at the current pose (visible or not). */
  structureBox: (structureIds: readonly string[]) => Box3;
  /** Default structures for the Focus preset (the joint's principal bones, by role). */
  focusStructures: () => string[];
  /** Current camera shot (for Free). */
  currentShot: () => CameraShot;
  /** Present when a body orientation asset is loaded. */
  body?: BodyFramingInfo;
}

/** Body-relative view directions (target -> camera), from the body frame in the body manifest. */
export function bodyViewDirection(body: Pick<BodyFramingInfo, "up" | "right" | "anterior">, view: BodyViewName): Vector3 {
  const d = new Vector3();
  switch (view) {
    case "front": d.copy(body.anterior).addScaledVector(body.up, 0.06); break;
    case "frontRight": d.copy(body.anterior).addScaledVector(body.right, 0.85).addScaledVector(body.up, 0.12); break;
    case "right": d.copy(body.right).addScaledVector(body.anterior, 0.18).addScaledVector(body.up, 0.08); break;
    case "backRight": d.copy(body.anterior).negate().addScaledVector(body.right, 0.9).addScaledVector(body.up, 0.12); break;
    case "left": d.copy(body.right).negate().addScaledVector(body.anterior, 0.18).addScaledVector(body.up, 0.08); break;
    case "frontLeft": d.copy(body.anterior).addScaledVector(body.right, -0.85).addScaledVector(body.up, 0.12); break;
  }
  return d.normalize();
}

const elevate = (dir: Vector3, up: Vector3, elevation = 0) => (elevation ? dir.addScaledVector(up, elevation).normalize() : dir);

/** Metres of framing radius per unit of site scale. */
export const SITE_SCALE_M = 0.05;

export type CameraPreset = (ctx: PresetContext, params: PresetParams) => CameraShot;

/** Joint-relative view directions (unit, target -> camera). Derived from the joint frame, never from a named joint. */
export function viewDirection(ctx: Pick<PresetContext, "joint" | "up">, view: ViewName): Vector3 {
  const d = new Vector3();
  const { axis, travel } = ctx.joint;
  switch (view) {
    case "axisPositive":
      if (axis) d.copy(axis).addScaledVector(ctx.up, 0.08);
      break;
    case "axisNegative":
      if (axis) d.copy(axis).negate().addScaledVector(ctx.up, 0.08);
      break;
    case "anterior":
      if (travel) d.copy(travel).addScaledVector(ctx.up, 0.15);
      if (axis) d.addScaledVector(axis, 0.3);
      break;
    case "oblique":
    default:
      if (axis) d.addScaledVector(axis, 0.9);
      if (travel) d.addScaledVector(travel, 0.42);
      d.addScaledVector(ctx.up, 0.22);
      break;
  }
  if (d.lengthSq() < 1e-8) d.set(0, 0, 1);
  return d.normalize();
}

export const BUILTIN_PRESETS: Record<string, CameraPreset> = {
  /** Where is this joint? Whole visible anatomy over its full motion range. */
  overview: (ctx, p) => shotForBox(ctx.motionEnvelope(), viewDirection(ctx, p.view ?? "oblique"), ctx.up, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.08),
  /** What bones meet here? Principal bones at the current pose, generous margin, anterior three-quarter view. */
  focus: (ctx, p) => shotForBox(ctx.structureBox(p.structures?.length ? p.structures : ctx.focusStructures()), elevate(viewDirection(ctx, p.view ?? "oblique"), ctx.up, p.elevation), ctx.up, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.25),
  /** Structure detail: the listed structures (+15%), or the joint landmark sphere. */
  closeUp: (ctx, p) => {
    const dir = elevate(viewDirection(ctx, p.view ?? "oblique"), ctx.up, p.elevation);
    if (p.structures?.length) return shotForBox(ctx.structureBox(p.structures), dir, ctx.up, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.15);
    return shotForSphere(new Sphere(ctx.joint.pivot.clone(), ctx.joint.focusRadius), dir, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.0);
  },
  /** See the motion in its plane: looks along the DOF axis, framing the pivot and the moving segment's sweep. */
  movement: (ctx, p) => {
    const dir = elevate(viewDirection(ctx, p.view ?? "axisPositive"), ctx.up, p.elevation);
    if (p.extentM) return shotForSphere(new Sphere(ctx.joint.pivot.clone(), p.extentM), dir, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.0);
    return shotForBox(ctx.motionEnvelope(), dir, ctx.up, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.06);
  },
  /** Learner-controlled orbit: keep the current camera. */
  free: (ctx) => ctx.currentShot(),
  /** Whole-body orientation shot (body asset bounds). */
  body: (ctx, p) => {
    if (!ctx.body) throw new Error("body preset requires the body asset");
    return shotForBox(ctx.body.bounds(), elevate(bodyViewDirection(ctx.body, p.bodyView ?? "front"), ctx.body.up, p.elevation), ctx.body.up, ctx.camera.fov, ctx.camera.aspect, p.margin ?? 1.08);
  },
  /** A body joint site: sphere around the site anchor, radius SITE_SCALE_M x scale. */
  site: (ctx, p) => {
    if (!ctx.body || !p.site) throw new Error("site preset requires the body asset and a site id");
    const s = ctx.body.site(p.site);
    return shotForSphere(new Sphere(s.anchor.clone(), SITE_SCALE_M * (p.scale ?? 2)), elevate(bodyViewDirection(ctx.body, p.bodyView ?? "frontRight"), ctx.body.up, p.elevation), ctx.camera.fov, ctx.camera.aspect, 1.0);
  },
};

export interface CameraDirectorOptions {
  prefersReducedMotion: () => boolean;
  durationMs?: number;
  /** Notified when the preset or guided/free mode changes. */
  onChange?: (state: { preset: string | null; mode: "guided" | "free" }) => void;
}

export interface GoOptions {
  immediate?: boolean;
  params?: PresetParams;
  durationMs?: number;
  easing?: (t: number) => number;
}

/**
 * Named camera presets (Overview, Focus, Close-up, Movement, Free, Reset) + transitions.
 * Presets are pure functions of the joint framing info and structure boxes; lessons reference them by id.
 * Transitions orbit about the target (spherical interpolation) with a duration scaled by angular distance
 * (0.8-1.6 s); reduced motion cuts.
 */
export class CameraDirector {
  private readonly presets = new Map<string, CameraPreset>(Object.entries(BUILTIN_PRESETS));
  private active: { cancel: (jumpToEnd: boolean) => void } | null = null;
  currentPreset: string | null = null;
  mode: "guided" | "free" = "guided";
  readonly defaultPreset = "overview";
  private lastGuided: { name: string; params: PresetParams } = { name: "overview", params: {} };
  /** Target of the "reset" preset (a lesson sets it to the step's start camera). */
  resetTo: { name: string; params: PresetParams } | null = null;

  constructor(
    private readonly camera: PerspectiveCamera,
    private readonly controls: OrbitControls,
    private readonly loop: RenderLoop,
    private readonly context: () => PresetContext,
    private readonly options: CameraDirectorOptions,
  ) {}

  registerPreset(name: string, preset: CameraPreset): void {
    this.presets.set(name, preset);
  }

  presetNames(): string[] {
    return [...this.presets.keys(), "reset"];
  }

  has(name: string): boolean {
    return name === "reset" || this.presets.has(name);
  }

  shot(name: string, params: PresetParams = {}): CameraShot {
    if (name === "reset") {
      const target = this.resetTo ?? { name: this.defaultPreset, params: {} };
      return this.shot(target.name, target.params);
    }
    const preset = this.presets.get(name);
    if (!preset) throw new Error(`unknown camera preset ${name}`);
    return preset(this.context(), params);
  }

  /** Animated unless reduced motion is preferred (or immediate), in which case it cuts. Resolves when done. */
  go(name: string, options: GoOptions | boolean = {}): Promise<void> {
    const opts: GoOptions = typeof options === "boolean" ? { immediate: options } : options;
    const params = opts.params ?? {};
    if (name === "free") {
      this.cancel(false);
      this.setMode("free", null);
      return Promise.resolve();
    }
    const resolvedName = name === "reset" ? (this.resetTo?.name ?? this.defaultPreset) : name;
    const resolvedParams = name === "reset" ? (this.resetTo?.params ?? {}) : params;
    const shot = this.shot(resolvedName, resolvedParams);
    this.lastGuided = { name: resolvedName, params: resolvedParams };
    this.setMode("guided", resolvedName);
    return this.apply(shot, opts.immediate || this.options.prefersReducedMotion(), opts.durationMs, opts.easing);
  }

  reset(immediate = false): Promise<void> {
    return this.go("reset", { immediate });
  }

  /** Return from Free to the last guided preset. */
  returnToGuided(immediate = false): Promise<void> {
    return this.go(this.lastGuided.name, { immediate, params: this.lastGuided.params });
  }

  get transitioning(): boolean {
    return this.active !== null;
  }

  private setMode(mode: "guided" | "free", preset: string | null): void {
    this.mode = mode;
    this.currentPreset = preset;
    this.options.onChange?.({ preset, mode });
  }

  /** Stop a running transition: where it is, or at its end state. */
  cancel(jumpToEnd = false): void {
    this.active?.cancel(jumpToEnd);
  }

  /** Transition duration for an orbit of `angleRad` and a distance ratio (design: 0.8-1.6 s). */
  static durationFor(angleRad: number, distanceRatio: number): number {
    const orbit = MathUtils.clamp(angleRad / Math.PI, 0, 1);
    const zoom = MathUtils.clamp(Math.abs(Math.log(Math.max(distanceRatio, 1e-3))) / Math.log(4), 0, 1);
    return 800 + 800 * Math.max(orbit, zoom);
  }

  /** Place the camera exactly (timeline-driven shots). Cancels any director transition. */
  place(position: Vector3, target: Vector3, limits?: { minDistance: number; maxDistance: number }): void {
    this.active?.cancel(false);
    this.camera.position.copy(position);
    this.controls.target.copy(target);
    this.camera.lookAt(target);
    if (limits) {
      this.controls.minDistance = Math.min(limits.minDistance, this.camera.position.distanceTo(target));
      this.controls.maxDistance = Math.max(limits.maxDistance, this.camera.position.distanceTo(target) * 2);
    }
    this.loop.requestRender();
  }

  /** Mark the camera as timeline-directed (guided) without moving it. */
  markGuided(preset: string): void {
    if (this.mode !== "guided" || this.currentPreset !== preset) this.setMode("guided", preset);
  }

  private apply(shot: CameraShot, immediate: boolean, durationMs?: number, easing = easeInOutCubic): Promise<void> {
    this.active?.cancel(false);
    this.controls.minDistance = Math.min(shot.minDistance, this.controls.minDistance);
    this.controls.maxDistance = Math.max(shot.maxDistance, 0.5);
    const finish = () => {
      this.camera.position.copy(shot.position);
      this.controls.target.copy(shot.target);
      this.camera.lookAt(shot.target);
      this.controls.update();
      this.controls.minDistance = shot.minDistance;
      this.loop.requestRender();
    };
    if (immediate) {
      finish();
      return Promise.resolve();
    }
    const fromTarget = this.controls.target.clone();
    const fromOffset = this.camera.position.clone().sub(fromTarget);
    const toOffset = shot.position.clone().sub(shot.target);
    const fromDir = fromOffset.clone().normalize();
    const toDir = toOffset.clone().normalize();
    const fromR = fromOffset.length();
    const toR = toOffset.length();
    const angle = fromDir.angleTo(toDir);
    const duration = durationMs ?? this.options.durationMs ?? CameraDirector.durationFor(angle, toR / Math.max(fromR, 1e-6));
    const axis = new Vector3().crossVectors(fromDir, toDir);
    if (axis.lengthSq() < 1e-10) axis.copy(this.camera.up).cross(fromDir);
    axis.normalize();
    let elapsed = 0;
    let done = false;
    return new Promise((resolve) => {
      const remove = this.loop.addTicker((dt) => {
        if (done) return false;
        elapsed += dt;
        const t = easing(Math.min(1, elapsed / Math.max(duration, 1)));
        const dir = fromDir.clone().applyAxisAngle(axis, angle * t);
        const r = MathUtils.lerp(fromR, toR, t);
        this.controls.target.lerpVectors(fromTarget, shot.target, t);
        this.camera.position.copy(this.controls.target).addScaledVector(dir, r);
        this.camera.lookAt(this.controls.target);
        if (elapsed >= duration) {
          done = true;
          this.active = null;
          finish();
          resolve();
          return false;
        }
        return true;
      });
      this.active = {
        cancel: (jumpToEnd) => {
          if (done) return;
          done = true;
          remove();
          this.active = null;
          if (jumpToEnd) finish();
          resolve();
        },
      };
    });
  }

  /** Set by an external camera driver (film timeline): resize re-framing is then the driver's job. */
  externallyDriven = false;

  /** Re-frame the active preset without animation (viewport resize). No-op in Free mode. */
  refresh(): void {
    if (this.externallyDriven) return;
    if (this.mode === "guided" && this.currentPreset && !this.active) void this.go(this.currentPreset, { immediate: true, params: this.lastGuided.params });
  }

  /** The learner took the camera (orbit): stop any transition where it is and enter Free mode. */
  interrupt(): void {
    this.cancel(false);
    this.setMode("free", null);
  }
}
