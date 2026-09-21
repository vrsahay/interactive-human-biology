import { Box3, Group, MathUtils, Mesh, Scene, Sphere, Vector3, type Material, type Object3D, type Texture } from "three";
import { QUALITY_SETTINGS, readDeviceSignals, resolveQualityTier, type TierDecision } from "../quality/qualityTier";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { JointContent, LayerState } from "../../content/types";
import { AnchorRegistry } from "../anatomy/AnchorRegistry";
import { BodyLayer } from "../body/BodyLayer";
import { ConceptOverlay } from "../overlays/ConceptOverlay";
import { applyAttachTo, type AttachResult } from "../anatomy/attach";
import { StructureRegistry, type StructureEntry } from "../anatomy/StructureRegistry";
import { StructureStateController } from "../anatomy/StructureStateController";
import { VisibilityPolicy, tracksPose, type MotionState } from "../anatomy/VisibilityPolicy";
import { AssetLoader } from "../assets/AssetLoader";
import { ManifestLoader, type JointManifestModel } from "../assets/ManifestLoader";
import type { TierName } from "../assets/manifestTypes";
import { CameraDirector, type GoOptions, type JointFramingInfo } from "../camera/CameraDirector";
import type { CameraShot } from "../camera/framing";
import { InteractionController, type DragTarget } from "../interaction/InteractionController";
import { admitInput, checkInteractionPolicy, type InteractionPolicy } from "../interaction/interactionPolicy";
import { Picker, type PickHit } from "../interaction/Picker";
import { HingeJoint } from "../joints/HingeJoint";
import type { InputSource, JointController } from "../joints/JointController";
import { JointRegistry } from "../joints/JointRegistry";
import { ALL_AXIS_PARTS, JointAxisOverlay, type AxisOverlayParts } from "../overlays/JointAxisOverlay";
import { LabelSystem, anchorLabelDirectionWorld } from "../overlays/LabelSystem";
import { SchematicBandSystem } from "../overlays/SchematicBandSystem";
import { PerfMonitor } from "../perf/PerfMonitor";
import { Highlighter } from "../rendering/Highlighter";
import { Stage } from "../rendering/Stage";
import { loadBakedEnvironment } from "../rendering/bakedEnvironment";
import { EventBus } from "./EventBus";
import { RenderLoop, type FrameInfo } from "./RenderLoop";

export type AppStatus = { phase: "loading"; step: string } | { phase: "ready" } | { phase: "error"; message: string };

export interface SelectionInfo {
  structureId: string;
  label: string;
  role: string;
  tier: TierName;
  motionBehavior: string;
  group: string;
  driven: boolean;
}

export type { InteractionModeName, InteractionPolicy } from "../interaction/interactionPolicy";

/** Lesson-driven label selection (null = Step-10 layer behaviour). Ids are anchorIds / bandIds. */
export interface LabelPolicy {
  show: Set<string>;
  bands: Set<string>;
  focus: Set<string>;
  dim: Set<string>;
  closeUpOnly: Set<string>;
}

export interface OverlayState extends AxisOverlayParts {
  angleBadge: boolean;
  /** Visible schematic bands (null = all bands). */
  bands: Set<string> | null;
}

export interface AppEvents {
  status: AppStatus;
  pose: { jointId: string; dofId: string; value: number; source: InputSource };
  selection: SelectionInfo | null;
  layers: LayerState;
  motion: MotionState & { hiddenByMotion: number; dragging: boolean };
  tier: { tier: TierName; state: "loading" | "loaded" | "error"; message?: string };
  hover: { structureId: string | null; draggable: boolean };
  camera: { preset: string | null; mode: "guided" | "free" };
  interaction: InteractionPolicy;
  /** A learner input reached the joint (emitted before it is applied) - lesson timelines cancel on this. */
  learnerInput: { dofId: string; source: InputSource; value: number };
  /** A learner input was refused by the interaction policy. */
  inputBlocked: { dofId: string; source: InputSource };
  /** Quality tier chosen before any body asset request. */
  quality: TierDecision;
  /** Deferred joint asset attached (film: after the first frame). */
  joint: { state: "loading" | "attached" | "error"; message?: string };
  /** A later body delivery stage finished loading (prepared, not yet shown). */
  bodyStage: { stageId: string; state: "ready" | "applied" };
}

export interface AppOptions {
  qa?: boolean;
  prefersReducedMotion?: () => boolean;
  fixedPixelRatio?: number;
  /** Full-body orientation asset (video lesson). */
  bodyManifestUrl?: string;
  /** Load these joint tiers during start (so shots can be reconstructed instantly when seeking). */
  preloadTiers?: TierName[];
  /** Visual theme: "studio" (light, Step-10 sandbox) or "cinematic" (dark film stage). */
  theme?: "studio" | "cinematic";
  /** Image-based lighting: a baked CubeUV variant (default) or the runtime PMREM (development A/B only). */
  environment?: { manifestUrl: string; size: number } | { live: true; size?: number };
  /** Choose a quality tier before loading the body (film). Values: URL override and saved learner setting. */
  quality?: { urlValue: string | null; savedValue: string | null };
  /** Do not download the joint asset during start(); attachJoint() does it later (film: after the first frame). */
  deferJoint?: boolean;
  /** Hide every joint structure after start (a film reveals the joint when its chapter begins). */
  jointHiddenAtStart?: boolean;
}

const POSED_EPSILON_DEG = 0.05;
const CAMERA_SETTLE_MS = 180;
const BONE_ROLES = new Set(["bone_fixed", "bone_moving"]);

/** Composition root of the runtime. Everything joint-specific arrives through the manifest + content config. */
export class App {
  readonly events = new EventBus<AppEvents>();
  readonly stage: Stage;
  readonly loop: RenderLoop;
  readonly controls: OrbitControls;
  readonly assets = new AssetLoader();
  readonly joints = new JointRegistry();
  readonly highlighter = new Highlighter();
  readonly perf: PerfMonitor;
  manifest!: JointManifestModel;
  structures!: StructureRegistry;
  structureStates!: StructureStateController;
  anchors!: AnchorRegistry;
  joint!: JointController;
  policy!: VisibilityPolicy;
  director!: CameraDirector;
  axisOverlay: JointAxisOverlay | null = null;
  bands: SchematicBandSystem | null = null;
  labels!: LabelSystem;
  interaction!: InteractionController;
  picker!: Picker;
  readonly anatomyRoot = new Group();
  readonly overlayRoot = new Group();
  layers: LayerState;
  readonly loadedTiers = new Set<TierName>();
  readonly attachLog: AttachResult[] = [];
  selection: { structureId: string; localPoint: Vector3 | null; mesh: Mesh | null } | null = null;
  interactionPolicy: InteractionPolicy = { mode: "free", picking: true, dofRange: {} };
  labelPolicy: LabelPolicy | null = null;
  overlayState: OverlayState = { ...ALL_AXIS_PARTS, angleBadge: true, bands: null };
  body: BodyLayer | null = null;
  concepts: ConceptOverlay | null = null;
  readonly resizeHooks: (() => void)[] = [];
  /** Body site labels currently shown: siteId -> text. */
  siteLabels = new Map<string, string>();
  private hovered: string | null = null;
  private dragging = false;
  private animating = 0;
  private detachInteraction: (() => void) | null = null;
  private orbitTicker = false;
  private readonly startedAt = performance.now();
  quality: TierDecision | null = null;
  manifestValidation: "build-pinned" | "runtime-schema" | null = null;
  private jointAttach: Promise<void> | null = null;
  private readonly compiledJointTiers = new Set<TierName>();
  readonly prefersReducedMotion: () => boolean;
  status: AppStatus = { phase: "loading", step: "Starting" };
  poseUpdates = 0;

  constructor(readonly container: HTMLElement, readonly content: JointContent, readonly options: AppOptions = {}) {
    this.prefersReducedMotion = options.prefersReducedMotion ?? (() => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
    this.layers = { ...content.initialLayers };
    this.stage = new Stage(container, { fixedPixelRatio: options.fixedPixelRatio, preserveDrawingBuffer: options.qa, theme: options.theme });
    this.loop = new RenderLoop((info) => this.renderFrame(info));
    this.perf = new PerfMonitor(this.stage.renderer);
    this.controls = new OrbitControls(this.stage.camera, this.stage.renderer.domElement);
    this.controls.enableDamping = !this.prefersReducedMotion();
    this.controls.dampingFactor = 0.14;
    this.controls.rotateSpeed = 0.7;
    this.controls.zoomSpeed = 0.8;
    this.controls.screenSpacePanning = true;
    this.controls.addEventListener("start", () => {
      this.director?.interrupt();
      this.startOrbitTicker();
    });
    this.controls.addEventListener("change", () => {
      // Occlusion raycasts wait until the camera has been still for a moment (they are the costliest per-frame label work).
      this.cameraMovedAt = performance.now();
      this.scheduleSettledFrame();
      this.loop.requestRender();
    });
    this.controls.addEventListener("end", () => this.startOrbitTicker());
    this.anatomyRoot.name = "anatomy";
    this.overlayRoot.name = "overlays";
    this.stage.scene.add(this.anatomyRoot, this.overlayRoot);
    this.stage.setResizeHandler(() => {
      this.axisOverlay?.setResolution(this.stage.size.width, this.stage.size.height);
      this.concepts?.setResolution(this.stage.size.width, this.stage.size.height);
      this.director?.refresh();
      for (const hook of this.resizeHooks) hook();
      this.loop.requestRender();
    });
  }

  private setStatus(status: AppStatus): void {
    this.status = status;
    this.events.emit("status", status);
  }

  async start(): Promise<void> {
    try {
      this.setStatus({ phase: "loading", step: "Reading joint manifest" });
      performance.mark("joints:start");
      const environment = this.loadEnvironment();
      if (this.options.quality) {
        // Tier first: it decides which body files are requested at all.
        this.quality = resolveQualityTier(readDeviceSignals(this.stage.renderer.getContext()), this.options.quality.urlValue, this.options.quality.savedValue);
        this.stage.setMaxPixelRatio(QUALITY_SETTINGS[this.quality.tier].maxPixelRatio);
        this.events.emit("quality", this.quality);
      }
      // The joint manifest, the environment and the body (tier-selected) load in parallel: nothing waits on another round trip.
      const bodyLoad = this.options.bodyManifestUrl ? this.loadBody(this.options.bodyManifestUrl) : Promise.resolve();
      bodyLoad.catch(() => undefined);
      const manifestLoader = new ManifestLoader();
      this.manifest = await manifestLoader.load(this.content.manifestUrl);
      this.manifestValidation = manifestLoader.lastValidation;
      performance.mark("joints:joint-manifest");
      if (this.manifest.jointId !== this.content.jointId) throw new Error(`content ${this.content.jointId} loaded manifest for ${this.manifest.jointId}`);
      this.structures = new StructureRegistry(this.manifest);
      this.structureStates = new StructureStateController(this.structures, () => this.onStructureStateChange());
      this.anchors = new AnchorRegistry(this.manifest, this.structures);
      this.policy = new VisibilityPolicy(this.manifest);

      this.setStatus({ phase: "loading", step: "Loading anatomy" });
      this.labels = new LabelSystem(this.container, () => this.structures.meshes((e) => this.isStructureVisible(e)));
      if (this.options.deferJoint) {
        await Promise.all([bodyLoad, environment]);
      } else {
        const [core] = await Promise.all([this.assets.loadTier(this.manifest, "core"), bodyLoad, environment]);
        this.bindJoint(core.gltf.scene);
      }
      performance.mark("joints:first-assets-loaded");
      const app = this;
      this.director = new CameraDirector(
        this.stage.camera,
        this.controls,
        this.loop,
        () => ({
          camera: this.stage.camera,
          up: new Vector3(0, 1, 0),
          // Joint presets read this lazily; body/site presets never touch it (the joint may not be attached yet).
          get joint() {
            return app.framingInfo();
          },
          subjects: () => this.structures.meshes((e) => this.isStructureVisible(e)),
          motionEnvelope: () => this.motionEnvelope(),
          structureBox: (ids) => this.structureBox(ids),
          focusStructures: () => this.structures.all().filter((e) => BONE_ROLES.has(e.spec.role)).map((e) => e.structureId),
          currentShot: (): CameraShot => ({ target: this.controls.target.clone(), position: this.stage.camera.position.clone(), minDistance: this.controls.minDistance, maxDistance: this.controls.maxDistance }),
          body: this.body
            ? {
                up: new Vector3(...this.body.manifest.frame.up),
                right: new Vector3(...this.body.manifest.frame.right),
                anterior: new Vector3(...this.body.manifest.frame.anterior),
                bounds: () => this.body!.bounds(),
                site: (id: string) => {
                  const s = this.body!.site(id);
                  return { anchor: new Vector3(...s.anchor), radiusM: s.radiusM };
                },
              }
            : undefined,
        }),
        { prefersReducedMotion: this.prefersReducedMotion, onChange: (s) => this.events.emit("camera", s) },
      );
      if (!this.options.deferJoint) {
        for (const tier of this.options.preloadTiers ?? []) await this.ensureTier(tier);
        if (this.options.jointHiddenAtStart) this.structureStates.set(this.structures.all().map((e) => e.structureId), { visibility: "hide" });
        await this.director.go(this.content.initialCamera, true);
        this.applyVisibility();
        if (this.layers.detail) void this.ensureTier("detail");
        if (this.layers.context) void this.ensureTier("context");
      }
      performance.mark("joints:ready");
      this.setStatus({ phase: "ready" });
      this.events.emit("layers", { ...this.layers });
      this.loop.requestRender();
    } catch (error) {
      console.error(error);
      this.setStatus({ phase: "error", message: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async loadEnvironment(): Promise<void> {
    const env = this.options.environment ?? { manifestUrl: `${import.meta.env.BASE_URL}assets/shared/env/environment.json`, size: 64 };
    if ("live" in env) {
      await this.stage.generateRoomEnvironment(env.size);
      return;
    }
    const { texture } = await loadBakedEnvironment(env.manifestUrl, env.size);
    this.stage.setEnvironment(texture);
    performance.mark("joints:environment-ready");
  }

  private bindJoint(coreScene: Object3D): void {
    // A deferred attach happens after the app is ready: it must not bring back the full-screen loading state.
    if (this.status.phase !== "ready") this.setStatus({ phase: "loading", step: "Binding structures" });
    this.bindTier("core", coreScene, true);
    this.joint = this.joints.create(this.manifest, (name) => this.structures.node(name));
    const hierarchy = this.joint instanceof HingeJoint ? this.joint.verifyDrivenHierarchy((id) => this.structures.resolve(id)) : { problems: [] as string[] };
    if (hierarchy.problems.length) throw new Error("driven hierarchy mismatch:\n - " + hierarchy.problems.join("\n - "));
    this.anchors.verifyNeutralPositions();
    this.joint.events.on("change", (c) => this.onPoseChange(c.dofId, c.value, c.source));
    this.buildOverlays();
    this.buildInteraction();
  }

  get jointAttached(): boolean {
    return !!this.joint;
  }

  /**
   * Deferred joint asset (film): download + bind the core tier (and the given extra tiers), hide it, and compile its
   * shader programs in parallel before resolving, so the first joint shot never stalls. Idempotent.
   */
  attachJoint(tiers: TierName[] = []): Promise<void> {
    if (!this.jointAttach) {
      this.events.emit("joint", { state: "loading" });
      this.jointAttach = (async () => {
        const core = await this.assets.loadTier(this.manifest, "core");
        if (!this.joint) {
          this.bindJoint(core.gltf.scene);
          this.structureStates.set(this.structures.all().map((e) => e.structureId), { visibility: "hide" });
          // A deferred attach can land while any shot is on screen, so the arriving asset must not switch anything on by
          // itself: its motion overlays (fitted axis, schematic bands) stay off until a shot asks for them. Without this the
          // joint's initial layers leaked the fitted elbow axis into the schematic ball-and-socket and pivot chapters.
          this.setLayers({ axis: false, bands: false });
          this.applyVisibility();
        }
      })().catch((error) => {
        this.jointAttach = null;
        this.events.emit("joint", { state: "error", message: (error as Error).message });
        throw error;
      });
    }
    return this.jointAttach.then(async () => {
      for (const tier of tiers) await this.ensureTier(tier);
      if (![...this.loadedTiers].every((t) => this.compiledJointTiers.has(t))) {
        const loaded = [...this.loadedTiers];
        await this.precompileJoint();
        for (const t of loaded) this.compiledJointTiers.add(t);
      }
      performance.mark("joints:joint-ready");
      this.events.emit("joint", { state: "attached" });
    });
  }

  /** Joint attached, the given tiers bound, and their shader programs compiled. */
  jointReady(tiers: readonly TierName[] = []): boolean {
    return !!this.joint && this.compiledJointTiers.has("core") && tiers.every((t) => this.loadedTiers.has(t) && this.compiledJointTiers.has(t));
  }

  /**
   * Parallel (KHR_parallel_shader_compile) compilation of every program a set of meshes/materials will need, via a proxy
   * scene lit like the stage. Nothing visible changes; the main thread is not blocked while programs link.
   */
  async precompile(items: { object: Object3D; material?: Material | Material[] }[]): Promise<void> {
    const proxy = new Scene();
    for (const { object, material } of items) {
      const src = object as Mesh;
      if (!src.geometry) continue;
      const Ctor = src.constructor as new (g: unknown, m: unknown) => Mesh;
      const clone = new Ctor(src.geometry, material ?? src.material);
      clone.matrixAutoUpdate = false;
      clone.frustumCulled = false;
      proxy.add(clone);
    }
    if (!proxy.children.length) return;
    await this.stage.renderer.compileAsync(proxy, this.stage.camera, this.stage.scene);
  }

  /** Programs for the currently visible scene (call before the first frame is shown). */
  precompileVisible(): Promise<unknown> {
    return this.stage.renderer.compileAsync(this.stage.scene, this.stage.camera);
  }

  private precompileJoint(): Promise<void> {
    const items: { object: Object3D; material?: Material | Material[] }[] = [];
    for (const e of this.structures.all()) {
      if (!this.loadedTiers.has(e.spec.tier)) continue;
      for (const m of e.meshes) for (const state of ["none", "highlight", "faded", "reveal", "selected", "hover"] as const) items.push({ object: m, material: this.highlighter.materialFor(m, state) });
    }
    this.overlayRoot.traverse((o) => {
      if ((o as Mesh).isMesh || (o as { isLine2?: boolean }).isLine2) items.push({ object: o });
    });
    return this.precompile(items);
  }

  /** Background compilation of every body presentation state and the concept indicators (after the first frame). */
  precompileBodyStates(): Promise<void> {
    const items: { object: Object3D; material?: Material | Material[] }[] = [];
    for (const v of this.body?.presentationVariants() ?? []) items.push({ object: v.mesh, material: this.highlighter.materialFor(v.mesh, v.state) });
    this.concepts?.group.traverse((o) => {
      if ((o as Mesh).isMesh || (o as { isLine2?: boolean }).isLine2) items.push({ object: o });
    });
    return this.precompile(items);
  }

  // ------------------------------------------------------------------ tiers

  private bindTier(tier: TierName, scene: Object3D, isCore: boolean): StructureEntry[] {
    const tierGroup = new Group();
    tierGroup.name = `tier:${tier}`;
    tierGroup.add(...scene.children);
    const entries = this.structures.registerTier(tier, tierGroup);
    this.anchors.registerTier(tier, tierGroup);
    this.anatomyRoot.add(tierGroup);
    tierGroup.updateMatrixWorld(true);
    this.trackTextures(tierGroup);
    if (isCore) this.attachLog.push(...applyAttachTo(entries, (name) => this.structures.node(name)));
    this.loadedTiers.add(tier);
    return entries;
  }

  /** Lazy-load a secondary tier and bind it at the exported neutral pose (attachTo keeps world transforms). */
  async ensureTier(tier: TierName): Promise<void> {
    if (this.loadedTiers.has(tier)) return;
    this.events.emit("tier", { tier, state: "loading" });
    try {
      const loaded = await this.assets.loadTier(this.manifest, tier);
      if (this.loadedTiers.has(tier)) return;
      this.joint.withNeutralPose(() => {
        const entries = this.bindTier(tier, loaded.gltf.scene, false);
        this.attachLog.push(...applyAttachTo(entries, (name) => this.structures.node(name)));
        this.anchors.verifyNeutralPositions();
      });
      if (this.joint instanceof HingeJoint) {
        const h = this.joint.verifyDrivenHierarchy((id) => this.structures.resolve(id));
        if (h.problems.length) throw new Error(h.problems.join("; "));
      }
      this.rebuildLabels();
      this.applyVisibility();
      this.events.emit("tier", { tier, state: "loaded" });
      this.loop.requestRender();
    } catch (error) {
      console.error(error);
      this.events.emit("tier", { tier, state: "error", message: (error as Error).message });
      throw error;
    }
  }

  private trackTextures(root: Object3D): void {
    const textures = new Set<Texture>();
    root.traverse((o) => {
      const mesh = o as Mesh;
      if (!mesh.isMesh) return;
      for (const m of ([] as Material[]).concat(mesh.material)) for (const v of Object.values(m)) if ((v as Texture)?.isTexture) textures.add(v as Texture);
    });
    this.perf.trackTextures(textures);
  }

  // ------------------------------------------------------------------ body orientation layer

  private async loadBody(url: string): Promise<void> {
    const body = new BodyLayer(this.assets, this.highlighter, () => this.loop.requestRender());
    body.onStageReady = (stageId) => this.events.emit("bodyStage", { stageId, state: "ready" });
    body.prepareHook = (meshes, states) => this.precompile(meshes.flatMap((mesh, i) => states[i].map((state) => ({ object: mesh, material: this.highlighter.materialFor(mesh, state) }))));
    await body.load(url, this.quality?.tier ?? "medium");
    this.body = body;
    this.stage.scene.add(body.group);
    const f = body.manifest.frame;
    this.concepts = new ConceptOverlay({ up: new Vector3(...f.up), right: new Vector3(...f.right), anterior: new Vector3(...f.anterior) });
    for (const site of body.manifest.jointSites) {
      this.concepts.ensure({ siteId: site.siteId, kind: site.indicator, anchor: site.anchor, radiusM: site.radiusM, axis: site.indicatorAxis?.axis, sphere: site.sphere });
    }
    this.concepts.setResolution(this.stage.size.width, this.stage.size.height);
    this.overlayRoot.add(this.concepts.group);
    this.trackTextures(body.group);
  }

  /** Show text labels at body joint sites (siteId -> text); others are hidden. */
  setSiteLabels(labels: ReadonlyMap<string, string>): void {
    if (!this.body) throw new Error("site labels require the body asset");
    const right = new Vector3(...this.body.manifest.frame.right);
    for (const [siteId, text] of labels) {
      const site = this.body.site(siteId);
      const id = `site:${siteId}`;
      if (!this.labels.has(id)) {
        const anchor = new Vector3(...site.anchor);
        this.labels.set({
          id,
          kind: "anchor",
          title: text,
          category: "joint_site",
          priority: 4,
          leader: true,
          world: (t) => t.copy(anchor),
          direction: (t) => t.copy(right),
          visible: () => this.siteLabels.has(siteId),
        });
      }
      this.labels.updateTitle(id, text);
    }
    this.siteLabels = new Map(labels);
    this.loop.requestRender();
  }

  // ------------------------------------------------------------------ framing

  private framingInfo(): JointFramingInfo {
    const pivot = new Vector3(...this.manifest.pivot.point);
    const landmarkTypes = new Set(["region", "bony_landmark_approx", "joint_center", "band_attachment"]);
    let radius = this.manifest.motion.arcRadiusMm / 1000;
    for (const a of this.manifest.anchors) if (landmarkTypes.has(a.anchorType)) radius = Math.max(radius, pivot.distanceTo(new Vector3(...a.neutralWorldPosition)));
    if (this.joint instanceof HingeJoint) {
      return { pivot: this.joint.pivotWorld(), axis: this.joint.axisWorld(), travel: this.joint.travelAtWorld(this.joint.dofs[0].neutral), focusRadius: radius * 1.25 };
    }
    return { pivot, focusRadius: radius * 1.25 };
  }

  /** Box around visible anatomy sampled across every DOF range (min..max), so framing never clips any pose. */
  motionEnvelope(): Box3 {
    const meshes = this.structures.meshes((e) => this.isStructureVisible(e));
    const box = new Box3();
    const tmp = new Box3();
    const dofs = this.joint.dofs;
    const samples = [0, 0.25, 0.5, 0.75, 1].map((f) => Object.fromEntries(dofs.map((d) => [d.id, d.min + (d.max - d.min) * f])));
    for (const pose of samples) {
      this.joint.withPose(pose, () => {
        for (const m of meshes) {
          tmp.setFromObject(m, true);
          if (!tmp.isEmpty()) box.union(tmp);
        }
      });
    }
    if (box.isEmpty()) new Sphere(new Vector3(...this.manifest.pivot.point), 0.3).getBoundingBox(box);
    return box;
  }

  /** World box of the given structures at the current pose, regardless of visibility. Unknown ids throw. */
  structureBox(structureIds: readonly string[]): Box3 {
    const box = new Box3();
    const tmp = new Box3();
    for (const id of structureIds) {
      for (const m of this.structures.require(id).meshes) {
        m.updateWorldMatrix(true, false);
        tmp.setFromObject(m, true);
        if (!tmp.isEmpty()) box.union(tmp);
      }
    }
    if (box.isEmpty()) new Sphere(new Vector3(...this.manifest.pivot.point), 0.1).getBoundingBox(box);
    return box;
  }

  // ------------------------------------------------------------------ overlays / labels

  private buildOverlays(): void {
    if (this.joint instanceof HingeJoint) {
      const dof = this.joint.dof(this.joint.dofId);
      this.axisOverlay = new JointAxisOverlay(this.joint, {
        axisLengthM: this.manifest.motion.axisLengthMm / 1000,
        arcRadiusM: this.manifest.motion.arcRadiusMm / 1000,
        arcTickDeg: this.manifest.motion.arcTickDeg,
        minDeg: dof.min,
        maxDeg: dof.max,
      });
      this.axisOverlay.setResolution(this.stage.size.width, this.stage.size.height);
      this.overlayRoot.add(this.axisOverlay.group);
    }
    if (this.manifest.bands.length) {
      this.bands = new SchematicBandSystem(this.manifest.bands, this.anchors);
      this.overlayRoot.add(this.bands.group);
    }
    this.rebuildLabels();
  }

  private motionState(): MotionState {
    if (!this.joint) return { posed: false, moving: false };
    return { posed: !this.joint.isNeutral(POSED_EPSILON_DEG), moving: this.dragging || this.animating > 0 };
  }

  isStructureVisible(e: StructureEntry): boolean {
    return e.meshes.some((m) => m.visible);
  }

  private bandVisible(bandId: string): boolean {
    return this.layers.bands && (this.overlayState.bands === null || this.overlayState.bands.has(bandId));
  }

  private rebuildLabels(): void {
    const allowed = new Set(this.content.labelAnchorTypes);
    const byStructure = (id: string) => {
      const e = this.structures.get(id);
      return !!e && this.isStructureVisible(e);
    };
    for (const a of this.anchors.all()) {
      if (!allowed.has(a.spec.anchorType)) continue;
      const id = `anchor:${a.anchorId}`;
      if (this.labels.has(id)) continue;
      const spec = a.spec;
      this.labels.set({
        id,
        kind: "anchor",
        title: spec.label,
        category: spec.displayCategory,
        priority: spec.anchorType === "structure_label" ? 2 : spec.anchorType === "joint_center" ? 3 : 1,
        leader: true,
        anchorId: a.anchorId,
        structureId: spec.structureId,
        world: (t) => this.anchors.worldPosition(a.anchorId, t),
        direction: (t) => anchorLabelDirectionWorld(spec, a.node, t, true),
        emphasis: () => (this.labelPolicy?.focus.has(a.anchorId) ? "focus" : this.labelPolicy?.dim.has(a.anchorId) ? "dim" : null),
        visible: () => {
          const selected = this.selection?.structureId === spec.structureId && spec.anchorType === "structure_label";
          const lp = this.labelPolicy;
          if (lp) {
            if (!this.layers.labels && !selected) return false;
            if (!lp.show.has(a.anchorId) && !selected) return false;
            if (lp.closeUpOnly.has(a.anchorId) && this.director?.currentPreset !== "closeUp") return false;
            return this.policy.anchorLabelVisible(spec, byStructure, this.motionState());
          }
          if (!this.layers.labels && !selected) return false;
          if (!this.layers.labels && selected) return byStructure(spec.structureId);
          return this.policy.anchorLabelVisible(spec, byStructure, this.motionState());
        },
      });
    }
    if (this.bands) {
      for (const band of this.manifest.bands) {
        const id = `band:${band.bandId}`;
        if (this.labels.has(id)) continue;
        const distal = this.anchors.require(band.distalAnchorId);
        this.labels.set({
          id,
          kind: "band",
          title: this.manifest.structure(band.structureId)?.label ?? band.structureId,
          subtitle: band.contentLabel,
          category: "ligament_band",
          priority: 1,
          leader: true,
          structureId: band.structureId,
          world: (t) => {
            const { proximal, distal: d } = this.bands!.endpoints(band.bandId);
            return t.copy(proximal).lerp(d, 0.5);
          },
          direction: (t) => anchorLabelDirectionWorld(distal.spec, distal.node, t, true),
          visible: () => this.layers.labels && this.bandVisible(band.bandId) && (this.labelPolicy ? this.labelPolicy.bands.has(band.bandId) : true),
        });
      }
    }
    if (this.axisOverlay && !this.labels.has("badge:angle")) {
      this.labels.set({
        id: "badge:angle",
        kind: "badge",
        title: `${Math.round(this.joint.getDof(this.joint.dofs[0].id))}°`,
        category: "angle",
        priority: 5,
        leader: false,
        world: (t) => this.axisOverlay!.arcEndWorld(t),
        direction: () => null,
        visible: () => this.layers.axis && this.overlayState.angleBadge && (this.axisOverlay?.opacity ?? 0) > 0.05,
      });
    }
  }

  /** Lesson label selection (null restores the layer-driven Step-10 behaviour). */
  setLabelPolicy(policy: LabelPolicy | null): void {
    for (const id of policy ? [...policy.show, ...policy.focus, ...policy.dim, ...policy.closeUpOnly] : []) this.anchors.require(id);
    for (const id of policy?.bands ?? []) if (!this.manifest.bands.some((b) => b.bandId === id)) throw new Error(`unknown bandId ${id}`);
    this.labelPolicy = policy;
    this.loop.requestRender();
  }

  /** Overlay part visibility (axis, arc, directions, arrow, ticks, angle badge, per-band). */
  setOverlayState(patch: Partial<OverlayState>): void {
    if (patch.bands) for (const id of patch.bands) if (!this.manifest.bands.some((b) => b.bandId === id)) throw new Error(`unknown bandId ${id}`);
    this.overlayState = { ...this.overlayState, ...patch };
    this.axisOverlay?.setParts(this.overlayState);
    this.applyVisibility();
  }

  // ------------------------------------------------------------------ interaction

  private buildInteraction(): void {
    this.picker = new Picker(this.structures, () => this.structures.meshes((e) => this.isStructureVisible(e)));
    // getBoundingClientRect forces a layout; the canvas only moves on resize / scroll.
    let rect: DOMRect | null = null;
    const invalidate = () => (rect = null);
    this.resizeHooks.push(invalidate);
    globalThis.addEventListener?.("scroll", invalidate, { passive: true, capture: true });
    globalThis.addEventListener?.("resize", invalidate, { passive: true });
    document.addEventListener?.("fullscreenchange", invalidate);
    const canvasRect = () => (rect ??= this.stage.renderer.domElement.getBoundingClientRect());
    this.interaction = new InteractionController({
      camera: () => this.stage.camera,
      rect: canvasRect,
      pick: (x, y) => this.picker.pick(x, y, canvasRect(), this.stage.camera),
      rayAt: (x, y) => this.picker.setFromClient(x, y, canvasRect(), this.stage.camera).ray,
      dragTargetFor: (structureId) => this.dragTargetFor(structureId),
      setOrbitEnabled: (enabled) => {
        this.controls.enabled = enabled && !this.orbitLocked;
      },
      onSelect: (hit) => this.selectHit(hit),
      onHover: (hit, draggable) => this.setHover(hit?.structureId ?? null, draggable),
      onDragState: (dragging) => {
        this.dragging = dragging;
        this.container.classList.toggle("is-dragging-joint", dragging);
        this.applyVisibility();
        this.loop.requestRender();
      },
      requestRender: () => this.loop.requestRender(),
    });
    this.detachInteraction = this.interaction.attach(this.container);
  }

  /**
   * While an exploration owns the pointer, a drag belongs to the joint and must never orbit the camera (Step 16C).
   *
   * A teaching simulation sets the interaction policy to "passive", so no structure is a drag target and the
   * InteractionController classifies every gesture as an orbit. The exploration's own pointer handler was driving the
   * joint from the same gesture, so one drag both rotated the target and swung the camera around the whole body -
   * which a learner reads as "the whole skeleton moved". The lock is held for the session, not for one gesture, and it
   * outranks anything the InteractionController asks for.
   */
  setOrbitLocked(locked: boolean): void {
    if (this.orbitLocked === locked) return;
    this.orbitLocked = locked;
    this.controls.enabled = !locked;
    this.loop.requestRender();
  }

  get isOrbitLocked(): boolean {
    return this.orbitLocked;
  }

  private orbitLocked = false;

  setInteractionPolicy(policy: InteractionPolicy): void {
    const problems = checkInteractionPolicy(policy, (dof) => this.joint.limits(dof));
    if (problems.length) throw new Error(problems.join("; "));
    this.interactionPolicy = { ...policy, dofRange: { ...policy.dofRange } };
    this.container.dataset.interaction = policy.mode;
    if (!policy.picking && this.selection) this.select(null);
    this.events.emit("interaction", this.interactionPolicy);
  }

  get learnerOwnsJoint(): boolean {
    return this.interactionPolicy.mode !== "passive";
  }

  /** A structure drags a joint DOF only if the joint's controller drives it and the policy lets the learner move it. */
  dragTargetFor(structureId: string): DragTarget | null {
    const joint = this.joint;
    if (!this.learnerOwnsJoint || !(joint instanceof HingeJoint) || !this.manifest.isDriven(structureId)) return null;
    return {
      jointId: joint.jointId,
      dofId: joint.dofId,
      frame: () => ({ pivot: joint.pivotWorld(), axis: joint.axisWorld(), neutralDir: joint.directionAtWorld(joint.dof(joint.dofId).neutral) }),
      getDof: () => joint.getDof(joint.dofId),
      setDof: (value, source) => this.setDof(joint.dofId, value, source),
    };
  }

  private setHover(structureId: string | null, draggable: boolean): void {
    if (structureId === this.hovered) return;
    const prev = this.hovered;
    this.hovered = structureId;
    for (const id of [prev, structureId]) if (id) this.refreshMaterial(id);
    this.container.dataset.cursor = structureId ? (draggable ? "grab" : this.interactionPolicy.picking ? "pointer" : "") : "";
    this.events.emit("hover", { structureId, draggable });
    this.loop.requestRender();
  }

  private selectHit(hit: PickHit | null): void {
    if (!this.interactionPolicy.picking) return;
    this.select(hit?.structureId ?? null, hit ? { mesh: hit.mesh, localPoint: hit.localPoint } : undefined);
  }

  /** Select by structureId. Pose is untouched. */
  select(structureId: string | null, at?: { mesh: Mesh; localPoint: Vector3 }): void {
    const previous = this.selection?.structureId ?? null;
    if (this.selection) this.labels.remove("selection");
    const entry = structureId ? this.structures.get(structureId) : null;
    if (!entry) {
      this.selection = null;
      this.labels.selectedStructureId = null;
      if (previous) this.refreshMaterial(previous);
      this.events.emit("selection", null);
      this.loop.requestRender();
      return;
    }
    const mesh = at?.mesh ?? entry.meshes[0];
    let localPoint = at?.localPoint ?? null;
    if (!localPoint) {
      mesh.geometry.computeBoundingBox();
      localPoint = mesh.geometry.boundingBox!.getCenter(new Vector3());
    }
    this.selection = { structureId: entry.structureId, localPoint, mesh };
    if (previous) this.refreshMaterial(previous);
    this.refreshMaterial(entry.structureId);
    this.labels.selectedStructureId = entry.structureId;
    const hasTeachingLabel = this.anchors.all().some((a) => a.spec.structureId === entry.structureId && a.spec.anchorType === "structure_label" && this.content.labelAnchorTypes.includes("structure_label"));
    if (!hasTeachingLabel) {
      const lp = localPoint.clone();
      this.labels.set({
        id: "selection",
        kind: "selection",
        title: entry.spec.label,
        category: "selection",
        priority: 10,
        leader: true,
        structureId: entry.structureId,
        world: (t) => {
          mesh.updateWorldMatrix(true, false);
          return t.copy(lp).applyMatrix4(mesh.matrixWorld);
        },
        direction: () => null,
        visible: () => this.isStructureVisible(entry),
      });
    }
    const s = entry.spec;
    this.events.emit("selection", { structureId: s.structureId, label: s.label, role: s.role, tier: s.tier, motionBehavior: s.motionBehavior, group: s.group, driven: this.manifest.isDriven(s.structureId) });
    this.loop.requestRender();
  }

  // ------------------------------------------------------------------ structure presentation

  private refreshMaterial(structureId: string): void {
    const e = this.structures.get(structureId);
    if (!e) return;
    this.highlighter.set(e.meshes, this.structureStates.materialState(structureId, { selected: this.selection?.structureId === structureId, hovered: this.hovered === structureId }));
  }

  private onStructureStateChange(): void {
    if (!this.joint) return;
    for (const e of this.structures.all()) this.refreshMaterial(e.structureId);
    this.bands?.update();
    this.applyVisibility();
  }

  // ------------------------------------------------------------------ pose

  private onPoseChange(dofId: string, value: number, source: InputSource): void {
    this.poseUpdates++;
    if (this.axisOverlay && this.joint instanceof HingeJoint && dofId === this.joint.dofId) this.axisOverlay.setAngle(value);
    this.bands?.update();
    this.labels.updateTitle("badge:angle", `${Math.round(value)}°`);
    // Visibility only depends on the posed / moving flags, not on the angle itself.
    const m = this.motionState();
    if (!this.lastMotion || m.posed !== this.lastMotion.posed || m.moving !== this.lastMotion.moving) this.applyVisibility();
    this.events.emit("pose", { jointId: this.joint.jointId, dofId, value, source });
    this.loop.requestRender();
  }

  /** Learner inputs are filtered by the interaction policy (passive refuses; guided/free clamp to the lesson range). */
  private admitLearnerValue(dofId: string, value: number, source: InputSource): number | null {
    const a = admitInput(this.interactionPolicy, dofId, value, source);
    if (!a.admitted) {
      this.events.emit("inputBlocked", { dofId, source });
      return null;
    }
    if (a.learner) this.events.emit("learnerInput", { dofId, source, value: a.value });
    return a.value;
  }

  /** Every input path ends here -> JointController.setDof. */
  setDof(dofId: string, value: number, source: InputSource): number {
    const admitted = this.admitLearnerValue(dofId, value, source);
    if (admitted === null) return this.joint.getDof(dofId);
    this.cancelDofAnimation();
    return this.joint.setDof(dofId, admitted, source);
  }

  private dofAnimationCancel: ((jumpToEnd: boolean) => void) | null = null;

  /** Stop a running DOF animation where it is (or at its target). */
  cancelDofAnimation(jumpToEnd = false): void {
    const cancel = this.dofAnimationCancel;
    this.dofAnimationCancel = null;
    cancel?.(jumpToEnd);
  }

  get dofAnimating(): boolean {
    return this.animating > 0;
  }

  /**
   * Move a DOF to a target through repeated setDof calls. Duration comes from `speedDegPerSec` when given.
   * Reduced motion: `stepped` jumps in a few visible steps, otherwise it cuts.
   */
  animateDof(dofId: string, target: number, source: InputSource = "preset", options: { speedDegPerSec?: number; easing?: (t: number) => number; reducedSteps?: number } = {}): Promise<void> {
    const admitted = this.admitLearnerValue(dofId, target, source);
    if (admitted === null) return Promise.resolve();
    this.cancelDofAnimation();
    const dof = this.joint.dof(dofId);
    const to = MathUtils.clamp(admitted, dof.min, dof.max);
    const from = this.joint.getDof(dofId);
    if (Math.abs(to - from) < 0.01) {
      this.joint.setDof(dofId, to, source);
      return Promise.resolve();
    }
    const reduced = this.prefersReducedMotion();
    if (reduced && !(options.reducedSteps && options.reducedSteps > 1)) {
      this.joint.setDof(dofId, to, source);
      return Promise.resolve();
    }
    const ease = options.easing ?? ((t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2));
    const duration = reduced
      ? 600
      : options.speedDegPerSec
        ? (Math.abs(to - from) / options.speedDegPerSec) * 1000
        : MathUtils.clamp((Math.abs(to - from) / (dof.max - dof.min)) * 900, 220, 900);
    let elapsed = 0;
    let done = false;
    this.animating++;
    this.applyVisibility();
    return new Promise((resolve) => {
      const finish = (jumpToEnd: boolean) => {
        if (done) return;
        done = true;
        this.animating--;
        remove();
        if (jumpToEnd) this.joint.setDof(dofId, to, source);
        this.applyVisibility();
        this.loop.requestRender();
        resolve();
      };
      const remove = this.loop.addTicker((dt) => {
        if (done) return false;
        elapsed += dt;
        const t = Math.min(1, elapsed / duration);
        const f = reduced ? Math.ceil(t * options.reducedSteps!) / options.reducedSteps! : ease(t);
        this.joint.setDof(dofId, from + (to - from) * f, t >= 1 ? source : "animation");
        if (t >= 1) {
          this.dofAnimationCancel = null;
          queueMicrotask(() => finish(false));
          return false;
        }
        return true;
      });
      this.dofAnimationCancel = finish;
    });
  }

  resetPose(source: InputSource = "reset"): Promise<void> {
    const pose = this.joint.neutralPose();
    return Promise.all(Object.entries(pose).map(([id, v]) => this.animateDof(id, v, source))).then(() => undefined);
  }

  // ------------------------------------------------------------------ visibility / layers

  applyVisibility(): void {
    if (!this.structures || !this.structureStates || !this.joint) return;
    const motion = this.motionState();
    this.lastMotion = motion;
    const baseTiers = { core: true, detail: this.layers.detail, context: this.layers.context };
    for (const e of this.structures.all()) {
      const override = this.structureStates.visibilityOverride(e.structureId);
      const visible = this.policy.structureVisibleWithOverride(e.spec, override, { tiers: baseTiers, keepNonTrackingDuringMotion: this.layers.keepContextDuringMotion }, motion);
      for (const m of e.meshes) m.visible = visible;
    }
    if (this.axisOverlay) this.axisOverlay.visible = this.layers.axis;
    if (this.bands) {
      this.bands.visible = this.layers.bands;
      for (const b of this.bands.list()) b.group.visible = this.bandVisible(b.bandId);
    }
    if (this.selection && !this.isStructureVisible(this.structures.require(this.selection.structureId))) this.select(null);
    const hidden = this.structures.all().filter((e) => this.loadedTiers.has(e.spec.tier) && (baseTiers[e.spec.tier] || this.structureStates.visibilityOverride(e.structureId) === "show") && this.structureStates.visibilityOverride(e.structureId) !== "hide" && !tracksPose(e.spec.motionBehavior) && !e.meshes.some((m) => m.visible)).length;
    this.events.emit("motion", { ...motion, hiddenByMotion: hidden, dragging: this.dragging });
    this.loop.requestRender();
  }

  setLayer<K extends keyof LayerState>(key: K, value: LayerState[K]): void {
    this.layers = { ...this.layers, [key]: value };
    if (key === "detail" && value) void this.ensureTier("detail").catch(() => undefined);
    if (key === "context" && value) void this.ensureTier("context").catch(() => undefined);
    this.applyVisibility();
    this.events.emit("layers", { ...this.layers });
  }

  setLayers(patch: Partial<LayerState>): void {
    this.layers = { ...this.layers, ...patch };
    this.applyVisibility();
    this.events.emit("layers", { ...this.layers });
  }

  // ------------------------------------------------------------------ camera

  async view(preset: string, options: GoOptions | boolean = false): Promise<void> {
    await this.director.go(preset, options);
  }

  resetView(immediate = false): Promise<void> {
    return this.director.reset(immediate);
  }

  // ------------------------------------------------------------------ frame

  private startOrbitTicker(): void {
    if (this.orbitTicker) return;
    this.orbitTicker = true;
    this.loop.addTicker(() => {
      const moving = this.controls.update();
      if (!moving) this.orbitTicker = false;
      return moving;
    });
  }

  /** Frames that are driven externally (a playing timeline) defer occlusion raycasts like any other motion. */
  externalMotion = false;

  private firstRenderMarked = false;
  private cameraMovedAt = 0;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  private scheduleSettledFrame(): void {
    if (this.settleTimer) return;
    const check = () => {
      const quietFor = performance.now() - this.cameraMovedAt;
      if (quietFor < CAMERA_SETTLE_MS) {
        this.settleTimer = setTimeout(check, CAMERA_SETTLE_MS - quietFor + 20);
        return;
      }
      this.settleTimer = null;
      this.loop.requestRender();
    };
    this.settleTimer = setTimeout(check, CAMERA_SETTLE_MS + 20);
  }
  private lastMotion: MotionState | null = null;

  private renderFrame(info: FrameInfo): void {
    const start = performance.now();
    if (!this.firstRenderMarked) performance.mark("joints:first-render-start");
    this.stage.render();
    if (!this.firstRenderMarked) {
      this.firstRenderMarked = true;
      performance.mark("joints:first-draw-submitted");
    }
    if (this.labels) {
      const { width, height } = this.stage.size;
      this.labels.update(this.stage.camera, width, height, { deferOcclusion: !info.settled || this.dragging || this.animating > 0 || this.externalMotion || performance.now() - this.cameraMovedAt < CAMERA_SETTLE_MS });
    }
    this.perf.frame(start, performance.now(), this.loadedTiers.has("core") || !!this.body?.loaded);
  }

  timeSinceStartMs(): number {
    return performance.now() - this.startedAt;
  }

  worldBBox(structureId: string): Box3 {
    const e = this.structures.require(structureId);
    return new Box3().setFromObject(e.meshes[0], true);
  }

  dispose(): void {
    this.detachInteraction?.();
    this.loop.dispose();
    this.controls.dispose();
    this.axisOverlay?.dispose();
    this.bands?.dispose();
    this.concepts?.dispose();
    this.labels?.dispose();
    this.highlighter.dispose();
    this.stage.dispose();
  }
}
