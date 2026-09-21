import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import type { JointManifestModel } from "./ManifestLoader";
import type { TierName } from "./manifestTypes";
import { TextureCache } from "./TextureCache";

export class AssetIntegrityError extends Error {
  override name = "AssetIntegrityError";
}

export interface LoadedTier {
  tier: TierName;
  url: string;
  gltf: GLTF;
  bytes: number;
  sha256: string | null;
  loadMs: number;
}

/** Extensions this loader can decode. KTX2 is intentionally absent: production assets use the WebP fallback. */
export const SUPPORTED_EXTENSIONS = new Set(["EXT_meshopt_compression", "KHR_mesh_quantization", "EXT_texture_webp", "KHR_materials_emissive_strength", "KHR_texture_transform"]);

async function sha256Hex(buffer: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Loads manifest tiers as glTF. Verifies byte length + SHA-256 against the manifest before parsing so the runtime never
 * binds to an asset that differs from the one that passed Gate 2. One in-flight promise per tier (no duplicate downloads).
 */
export class AssetLoader {
  private readonly loader: GLTFLoader;
  private readonly cache = new Map<string, Promise<LoadedTier>>();
  /** Shared across every file this loader parses (joint tiers, body stages, material library). */
  readonly textures = new TextureCache();

  constructor(private readonly fetchImpl: typeof fetch = (...args) => fetch(...args)) {
    this.loader = new GLTFLoader();
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  loadTier(manifest: JointManifestModel, tier: TierName): Promise<LoadedTier> {
    const url = manifest.tierUrl(tier);
    let pending = this.cache.get(url);
    if (!pending) {
      pending = this.fetchAndParse(manifest, tier, url);
      pending.catch(() => this.cache.delete(url));
      this.cache.set(url, pending);
    }
    return pending;
  }

  async parseBuffer(buffer: ArrayBuffer, resourcePath = ""): Promise<GLTF> {
    await MeshoptDecoder.ready;
    return this.loader.parseAsync(buffer, resourcePath);
  }

  private async fetchAndParse(manifest: JointManifestModel, tier: TierName, url: string): Promise<LoadedTier> {
    const spec = manifest.tier(tier);
    const loaded = await this.fetchVerified(url, { label: tier, bytes: spec.bytes, sha256: spec.sha256, extensionsRequired: spec.extensionsRequired });
    return { tier, ...loaded };
  }

  /** Load any manifest-described GLB (e.g. the body overview asset) with the same byte/sha verification. */
  loadFile(url: string, spec: { label: string; bytes: number; sha256: string; extensionsRequired: string[] }): Promise<Omit<LoadedTier, "tier">> {
    let pending = this.fileCache.get(url);
    if (!pending) {
      pending = this.fetchVerified(url, spec);
      pending.catch(() => this.fileCache.delete(url));
      this.fileCache.set(url, pending);
    }
    return pending;
  }

  private readonly fileCache = new Map<string, Promise<Omit<LoadedTier, "tier">>>();

  private async fetchVerified(url: string, spec: { label: string; bytes: number; sha256: string; extensionsRequired: string[] }): Promise<Omit<LoadedTier, "tier">> {
    const unsupported = spec.extensionsRequired.filter((e) => !SUPPORTED_EXTENSIONS.has(e));
    if (unsupported.length) throw new AssetIntegrityError(`${spec.label}: unsupported required extensions ${unsupported.join(", ")}`);
    const started = performance.now();
    const response = await this.fetchImpl(url);
    if (!response.ok) throw new AssetIntegrityError(`${spec.label}: request failed ${response.status} (${url})`);
    const buffer = await response.arrayBuffer();
    performance.mark(`joints:fetched:${spec.label}`);
    if (buffer.byteLength !== spec.bytes) throw new AssetIntegrityError(`${spec.label}: ${buffer.byteLength} bytes, manifest expects ${spec.bytes}`);
    const sha256 = await sha256Hex(buffer);
    if (sha256 !== null && sha256 !== spec.sha256) throw new AssetIntegrityError(`${spec.label}: sha256 ${sha256} does not match manifest ${spec.sha256}`);
    const gltf = await this.parseBuffer(buffer, new URL(".", url).href);
    await this.textures.dedupe(gltf);
    performance.mark(`joints:parsed:${spec.label}`);
    return { url, gltf, bytes: buffer.byteLength, sha256, loadMs: performance.now() - started };
  }
}
