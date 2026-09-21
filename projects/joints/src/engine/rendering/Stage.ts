import {
  ACESFilmicToneMapping,
  Color,
  DirectionalLight,
  HemisphereLight,
  NeutralToneMapping,
  PMREMGenerator,
  PerspectiveCamera,
  SRGBColorSpace,
  Scene,
  WebGLRenderer,
  type Texture,
} from "three";

export interface StageOptions {
  maxPixelRatio?: number;
  /** Deterministic size/DPR for QA snapshots. */
  fixedPixelRatio?: number;
  preserveDrawingBuffer?: boolean;
  /** "studio": light neutral (sandbox). "cinematic": dark stage with a stronger rim for silhouette. */
  theme?: "studio" | "cinematic";
}

/**
 * Scene + camera + renderer with a restrained scientific look: neutral tone mapping, soft room environment for ambient
 * shading, one soft key light and a cool rim for silhouette. No bloom, no shadows, transparent clear over a CSS backdrop.
 */
export class Stage {
  readonly scene = new Scene();
  readonly camera: PerspectiveCamera;
  readonly renderer: WebGLRenderer;
  readonly lightRig: { key: DirectionalLight; rim: DirectionalLight; hemi: HemisphereLight };
  private environment: Texture | null = null;
  private readonly resizeObserver: ResizeObserver | null = null;
  private onResize: (() => void) | null = null;

  constructor(readonly container: HTMLElement, private readonly options: StageOptions = {}) {
    performance.mark("joints:stage-start");
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: options.preserveDrawingBuffer ?? false });
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.renderer.toneMapping = NeutralToneMapping ?? ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(new Color(0x000000), 0);
    this.renderer.domElement.classList.add("stage-canvas");
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    container.appendChild(this.renderer.domElement);

    this.camera = new PerspectiveCamera(32, 1, 0.005, 20);

    performance.mark("joints:renderer-created");
    // The image-based lighting is a baked CubeUV texture (setEnvironment); nothing is generated on the main thread here.
    this.scene.environmentIntensity = 0.55;

    const hemi = new HemisphereLight(0xf4f1ea, 0x5d6470, 0.55);
    const key = new DirectionalLight(0xfff6ea, 1.55);
    key.position.set(1.2, 2.2, 1.6);
    const rim = new DirectionalLight(0xdce8ff, 0.7);
    rim.position.set(-1.5, 0.6, -2.0);
    this.lightRig = { key, rim, hemi };
    if (options.theme === "cinematic") {
      this.scene.environmentIntensity = 0.38;
      hemi.intensity = 0.3;
      hemi.color.set(0xdfe6f2);
      hemi.groundColor.set(0x1a1f28);
      key.intensity = 1.9;
      key.color.set(0xfff1de);
      rim.intensity = 1.35;
      rim.color.set(0xb9d3ff);
      this.renderer.toneMappingExposure = 1.05;
    }
    this.scene.add(hemi, key, rim);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    }
    this.resize();
  }

  /** Keep lights in a camera-relative arrangement so the anatomy is always lit from the viewer's upper side. */
  syncLightsToCamera(): void {
    const { key, rim } = this.lightRig;
    const q = this.camera.quaternion;
    key.position.set(1.2, 2.0, 2.2).applyQuaternion(q).add(this.camera.position);
    rim.position.set(-1.6, 0.8, -2.4).applyQuaternion(q).add(this.camera.position);
    key.target.position.copy(this.camera.position).add(this.camera.getWorldDirection(key.target.position.clone()));
    key.target.updateMatrixWorld();
    rim.target.position.copy(key.target.position);
    rim.target.updateMatrixWorld();
  }

  /** Use a ready CubeUV environment (baked PMREM). */
  setEnvironment(texture: Texture): void {
    if (this.environment && this.environment !== texture) this.environment.dispose();
    this.environment = texture;
    this.scene.environment = texture;
  }

  /** Development A/B only: generate the RoomEnvironment PMREM at runtime (the Step-11 behaviour, ~3 s blocking on ANGLE D3D11). */
  async generateRoomEnvironment(size = 256): Promise<void> {
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
    const pmrem = new PMREMGenerator(this.renderer);
    this.setEnvironment(pmrem.fromScene(new RoomEnvironment(), 0.04, 0.1, 100, { size }).texture);
    pmrem.dispose();
    performance.mark("joints:environment-ready");
  }

  /** Quality tiers cap the pixel ratio after the renderer exists. */
  setMaxPixelRatio(max: number): void {
    if (this.options.maxPixelRatio === max) return;
    this.options.maxPixelRatio = max;
    this.resize();
  }

  setResizeHandler(fn: () => void): void {
    this.onResize = fn;
  }

  get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }

  private cachedSize = { width: 1, height: 1 };

  resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.cachedSize = { width: w, height: h };
    const dpr = this.options.fixedPixelRatio ?? Math.min(globalThis.devicePixelRatio || 1, this.options.maxPixelRatio ?? 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.onResize?.();
  }

  /** Container size from the last resize (reading clientWidth per frame forces a layout). */
  get size(): { width: number; height: number } {
    return this.cachedSize;
  }

  render(): void {
    this.syncLightsToCamera();
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.resizeObserver?.disconnect();
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
