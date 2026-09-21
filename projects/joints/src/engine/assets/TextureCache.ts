import type { Material, Mesh, Object3D, Texture } from "three";
import type { GLTF } from "three/addons/loaders/GLTFLoader.js";

async function sha256Hex(buffer: ArrayBuffer): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface ParserLike {
  json: { textures?: { source?: number; extensions?: Record<string, { source?: number }> }[]; images?: { bufferView?: number; uri?: string }[] };
  associations: Map<unknown, { textures?: number } | undefined>;
  getDependency(type: "bufferView", index: number): Promise<ArrayBuffer>;
}

/**
 * GPU texture de-duplication across glTF files. Several production files embed byte-identical images (e.g. the tissue normal
 * map sits in the elbow tiers and the body library); each would otherwise become its own GPU texture. Textures are keyed by
 * image content hash + sampling/colour settings; later duplicates are replaced in their materials before they are ever
 * uploaded. Asset files are not modified.
 */
export class TextureCache {
  private readonly byKey = new Map<string, Texture>();
  unique = 0;
  deduplicated = 0;

  async dedupe(gltf: GLTF): Promise<void> {
    const parser = gltf.parser as unknown as ParserLike;
    const materials = new Set<Material>();
    gltf.scene.traverse((o: Object3D) => {
      const m = (o as Mesh).material;
      if (m) for (const x of Array.isArray(m) ? m : [m]) materials.add(x);
    });
    const replacement = new Map<Texture, Texture>();
    const hashes = new Map<number, Promise<string | null>>();
    for (const material of materials) {
      for (const value of Object.values(material)) {
        const texture = value as Texture | null;
        if (!texture?.isTexture || replacement.has(texture) || [...this.byKey.values()].includes(texture)) continue;
        const index = parser.associations.get(texture)?.textures;
        if (index === undefined) continue;
        const def = parser.json.textures?.[index];
        const source = def?.source ?? Object.values(def?.extensions ?? {}).find((e) => typeof e?.source === "number")?.source;
        const image = source === undefined ? undefined : parser.json.images?.[source];
        if (!image || image.bufferView === undefined || source === undefined) continue;
        if (!hashes.has(source)) hashes.set(source, parser.getDependency("bufferView", image.bufferView).then(sha256Hex));
        const hash = await hashes.get(source)!;
        if (!hash) continue;
        const key = [hash, texture.colorSpace, texture.wrapS, texture.wrapT, texture.flipY, texture.magFilter, texture.minFilter, texture.channel].join("|");
        const canonical = this.byKey.get(key);
        if (!canonical) {
          this.byKey.set(key, texture);
          this.unique++;
        } else if (canonical !== texture) {
          replacement.set(texture, canonical);
          this.deduplicated++;
        }
      }
    }
    if (!replacement.size) return;
    for (const material of materials) {
      const record = material as unknown as Record<string, unknown>;
      for (const [k, v] of Object.entries(record)) {
        const next = replacement.get(v as Texture);
        if (next) record[k] = next;
      }
    }
    for (const dup of replacement.keys()) dup.dispose();
  }
}
