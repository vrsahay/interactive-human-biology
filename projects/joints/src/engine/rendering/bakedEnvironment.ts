import { CubeUVReflectionMapping, DataTexture, DataUtils, HalfFloatType, LinearFilter, LinearSRGBColorSpace, RGBAFormat } from "three";

/** One baked CubeUV environment (see pipeline/env/bake_environment.mjs). */
export interface BakedEnvironmentVariant {
  size: number;
  url: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
}

export interface EnvironmentManifest {
  kind: "environment_cubeuv";
  encoding: "rgbe8";
  generator: string;
  variants: BakedEnvironmentVariant[];
}

export class EnvironmentError extends Error {
  override name = "EnvironmentError";
}

/** RGBE8 (alpha = exponent + 128) -> half-float RGBA, the texture layout PMREMGenerator produces. */
export function decodeRgbeToHalfFloat(rgbe: Uint8Array, width: number, height: number): Uint16Array {
  if (rgbe.length !== width * height * 4) throw new EnvironmentError(`environment: ${rgbe.length} bytes for ${width}x${height} RGBE`);
  const out = new Uint16Array(width * height * 4);
  const one = DataUtils.toHalfFloat(1);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    const e = rgbe[o + 3];
    if (e === 0 && rgbe[o] === 0 && rgbe[o + 1] === 0 && rgbe[o + 2] === 0) {
      out[o + 3] = one;
      continue;
    }
    const f = Math.pow(2, e - 128) / 256;
    out[o] = DataUtils.toHalfFloat((rgbe[o] + 0.5) * f);
    out[o + 1] = DataUtils.toHalfFloat((rgbe[o + 1] + 0.5) * f);
    out[o + 2] = DataUtils.toHalfFloat((rgbe[o + 2] + 0.5) * f);
    out[o + 3] = one;
  }
  return out;
}

/** A ready CubeUV texture: WebGLRenderer uses it as-is (no PMREM pass, no extra shader programs). */
export function cubeUvTexture(data: Uint16Array, width: number, height: number): DataTexture {
  const texture = new DataTexture(data, width, height, RGBAFormat, HalfFloatType);
  // CubeUV is the PMREM output layout; @types/three does not list it as a DataTexture constructor mapping.
  (texture as { mapping: number }).mapping = CubeUVReflectionMapping;
  texture.colorSpace = LinearSRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.name = "baked-environment";
  texture.needsUpdate = true;
  return texture;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Fetch + verify (bytes, sha256) + decode a baked environment variant. */
export async function loadBakedEnvironment(manifestUrl: string, size: number, fetchImpl: typeof fetch = (...a) => fetch(...a)): Promise<{ texture: DataTexture; variant: BakedEnvironmentVariant }> {
  const base = new URL(manifestUrl, globalThis.location?.href ?? "http://localhost/").href;
  const res = await fetchImpl(base);
  if (!res.ok) throw new EnvironmentError(`environment manifest request failed ${res.status}`);
  const manifest = (await res.json()) as EnvironmentManifest;
  if (manifest.kind !== "environment_cubeuv" || manifest.encoding !== "rgbe8") throw new EnvironmentError("environment manifest: unsupported kind/encoding");
  const variant = manifest.variants.find((v) => v.size === size);
  if (!variant) throw new EnvironmentError(`environment manifest has no ${size} variant`);
  const r = await fetchImpl(new URL(variant.url, base).href);
  if (!r.ok) throw new EnvironmentError(`environment request failed ${r.status}`);
  const buffer = await r.arrayBuffer();
  if (buffer.byteLength !== variant.bytes) throw new EnvironmentError(`environment: ${buffer.byteLength} bytes, manifest expects ${variant.bytes}`);
  const hash = await sha256Hex(buffer);
  if (hash !== null && hash !== variant.sha256) throw new EnvironmentError("environment: sha256 does not match the manifest");
  performance.mark("joints:env-fetched");
  return { texture: cubeUvTexture(decodeRgbeToHalfFloat(new Uint8Array(buffer), variant.width, variant.height), variant.width, variant.height), variant };
}
