/**
 * Quality tiers. The tier is chosen once per page load, BEFORE any body asset is requested, from device signals that may be
 * missing on some browsers (deviceMemory and connection are Chromium-only; Safari masks the GPU string). Selection is a pure,
 * deterministic function of the signals; missing signals never promote a device to HIGH.
 */
export type QualityTier = "high" | "medium" | "low";
export const QUALITY_TIERS: readonly QualityTier[] = ["high", "medium", "low"];

export interface DeviceSignals {
  /** navigator.deviceMemory (GiB, Chromium caps at 8), null when unavailable. */
  deviceMemoryGB: number | null;
  /** navigator.hardwareConcurrency, null when unavailable. */
  hardwareConcurrency: number | null;
  webgl2: boolean;
  /** gl.MAX_TEXTURE_SIZE, null when unknown. */
  maxTextureSize: number | null;
  /** Unmasked renderer string when exposed, else the masked RENDERER, else null. */
  gpuRenderer: string | null;
  /** min(screen.width, screen.height) in CSS px. */
  screenShortSideCss: number;
  devicePixelRatio: number;
  /** matchMedia("(pointer: coarse)") for the primary pointer. */
  coarsePointer: boolean;
  /** navigator.connection.saveData, null when unavailable. */
  saveData: boolean | null;
  /** navigator.connection.effectiveType ("slow-2g" | "2g" | "3g" | "4g"), null when unavailable. */
  effectiveType: string | null;
}

export interface TierDecision {
  tier: QualityTier;
  source: "auto" | "override";
  reasons: string[];
  signals: DeviceSignals;
}

export interface QualitySettings {
  /** Upper bound for the renderer pixel ratio. */
  maxPixelRatio: number;
  /** Body delivery tier (manifest `tiers` key). */
  bodyTier: QualityTier;
  antialias: boolean;
}

export const QUALITY_SETTINGS: Readonly<Record<QualityTier, QualitySettings>> = {
  high: { maxPixelRatio: 2, bodyTier: "high", antialias: true },
  medium: { maxPixelRatio: 1.5, bodyTier: "medium", antialias: true },
  low: { maxPixelRatio: 1, bodyTier: "low", antialias: true },
};

const SOFTWARE_GPU = /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i;
const MOBILE_GPU = /adreno|mali|powervr|apple gpu|videocore|immortalis|xclipse/i;

export function selectQualityTier(s: DeviceSignals): TierDecision {
  const low: string[] = [];
  if (!s.webgl2) low.push("no WebGL2");
  if (s.gpuRenderer && SOFTWARE_GPU.test(s.gpuRenderer)) low.push(`software renderer (${s.gpuRenderer})`);
  if (s.deviceMemoryGB !== null && s.deviceMemoryGB <= 2) low.push(`deviceMemory ${s.deviceMemoryGB} GB`);
  if (s.hardwareConcurrency !== null && s.hardwareConcurrency <= 2) low.push(`${s.hardwareConcurrency} logical cores`);
  if (s.saveData === true) low.push("Save-Data requested");
  if (s.effectiveType && ["slow-2g", "2g", "3g"].includes(s.effectiveType)) low.push(`effective connection ${s.effectiveType}`);
  if (s.maxTextureSize !== null && s.maxTextureSize < 4096) low.push(`MAX_TEXTURE_SIZE ${s.maxTextureSize}`);
  if (low.length) return { tier: "low", source: "auto", reasons: low, signals: s };

  const notHigh: string[] = [];
  if (s.coarsePointer) notHigh.push("coarse primary pointer (phone/tablet class)");
  if (s.screenShortSideCss < 700) notHigh.push(`screen short side ${s.screenShortSideCss}px`);
  if (s.hardwareConcurrency === null || s.hardwareConcurrency < 6) notHigh.push(`hardwareConcurrency ${s.hardwareConcurrency ?? "unknown"}`);
  if (s.deviceMemoryGB !== null && s.deviceMemoryGB < 8) notHigh.push(`deviceMemory ${s.deviceMemoryGB} GB`);
  if (s.gpuRenderer && MOBILE_GPU.test(s.gpuRenderer)) notHigh.push(`mobile GPU family (${s.gpuRenderer})`);
  if (notHigh.length) return { tier: "medium", source: "auto", reasons: notHigh, signals: s };
  return { tier: "high", source: "auto", reasons: ["desktop-class signals: fine pointer, large screen, >= 6 cores, no memory limit reported below 8 GB"], signals: s };
}

export function parseQualityTier(value: string | null | undefined): QualityTier | null {
  return value === "high" || value === "medium" || value === "low" ? value : null;
}

/** Read signals from the browser. The WebGL probe uses the renderer's own context when given (no extra context). */
export function readDeviceSignals(gl: WebGLRenderingContext | WebGL2RenderingContext | null, env: typeof globalThis = globalThis): DeviceSignals {
  const nav = env.navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean; effectiveType?: string } };
  let gpuRenderer: string | null = null;
  let maxTextureSize: number | null = null;
  if (gl) {
    try {
      const ext = gl.getExtension("WEBGL_debug_renderer_info");
      gpuRenderer = String(ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
      maxTextureSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || null;
    } catch {
      /* signals are optional */
    }
  }
  const screen = env.screen as Screen | undefined;
  return {
    deviceMemoryGB: typeof nav?.deviceMemory === "number" ? nav.deviceMemory : null,
    hardwareConcurrency: typeof nav?.hardwareConcurrency === "number" && nav.hardwareConcurrency > 0 ? nav.hardwareConcurrency : null,
    webgl2: !!gl && typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext,
    maxTextureSize,
    gpuRenderer,
    screenShortSideCss: screen ? Math.min(screen.width, screen.height) : Math.min(env.innerWidth ?? 0, env.innerHeight ?? 0),
    devicePixelRatio: env.devicePixelRatio || 1,
    coarsePointer: env.matchMedia?.("(pointer: coarse)").matches ?? false,
    saveData: typeof nav?.connection?.saveData === "boolean" ? nav.connection.saveData : null,
    effectiveType: nav?.connection?.effectiveType ?? null,
  };
}

/** Override order: URL `?quality=` > saved learner setting > automatic selection. */
export function resolveQualityTier(signals: DeviceSignals, urlValue: string | null, savedValue: string | null): TierDecision {
  const forced = parseQualityTier(urlValue) ?? parseQualityTier(savedValue);
  const auto = selectQualityTier(signals);
  if (!forced) return auto;
  return { tier: forced, source: "override", reasons: [`${parseQualityTier(urlValue) ? "URL" : "saved setting"} requested ${forced} (automatic choice: ${auto.tier})`], signals };
}
