// Test-only helpers: load the PRODUCTION manifest and GLBs from public/assets (read-only).
// Node has no image decoding, so textures are removed from an in-memory copy before parsing with three's GLTFLoader;
// node hierarchy, extras, transforms and (meshopt-decoded, quantised) geometry are unchanged. Real textures are covered by Playwright.
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";
import { Group } from "three";
import { AssetLoader } from "../../src/engine/assets/AssetLoader";
import { JointManifestModel } from "../../src/engine/assets/ManifestLoader";
import { parseManifest } from "../../src/engine/assets/manifestSchema";
import type { TierName } from "../../src/engine/assets/manifestTypes";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const JOINT_DIR = join(ROOT, "public", "assets", "joints", "elbow_r");
export const MANIFEST_PATH = join(JOINT_DIR, "joint-manifest.json");

export function productionManifestText(): string {
  return readFileSync(MANIFEST_PATH, "utf8");
}

export function productionManifest(): JointManifestModel {
  return new JointManifestModel(parseManifest(productionManifestText()), "http://localhost/assets/joints/elbow_r/joint-manifest.json");
}

export async function loadTierScene(manifest: JointManifestModel, tier: TierName): Promise<Group> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.readBinary(new Uint8Array(readFileSync(join(JOINT_DIR, manifest.tier(tier).url))));
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === "EXT_meshopt_compression" || ext.extensionName === "EXT_texture_webp") ext.dispose();
  const glb = await io.writeBinary(doc);
  const gltf = await new AssetLoader().parseBuffer(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer);
  const group = new Group();
  group.add(...gltf.scene.children);
  return group;
}

export const BODY_DIR = join(ROOT, "public", "assets", "body", "v3");

export function productionBodyManifest(): any {
  return JSON.parse(readFileSync(join(BODY_DIR, "body-delivery.json"), "utf8"));
}

/** A production body delivery file (or the shared material library) parsed in Node, textures stripped in memory. */
export async function loadBodyFile(fileId: string | "materials"): Promise<Group> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const manifest = productionBodyManifest();
  const path = fileId === "materials" ? join(BODY_DIR, manifest.materialLibrary.url) : join(BODY_DIR, manifest.files[fileId].url);
  const doc = await io.readBinary(new Uint8Array(readFileSync(path)));
  for (const t of doc.getRoot().listTextures()) t.dispose();
  for (const ext of doc.getRoot().listExtensionsUsed()) if (ext.extensionName === "EXT_meshopt_compression" || ext.extensionName === "EXT_texture_webp") ext.dispose();
  const glb = await io.writeBinary(doc);
  const gltf = await new AssetLoader().parseBuffer(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer);
  const g = new Group();
  g.add(...gltf.scene.children);
  return g;
}

/** Stand-in for AssetLoader.loadFile that serves stripped production body files by URL (no network, no image decoding). */
export function bodyFileLoader(): { loadFile: (url: string) => Promise<{ gltf: { scene: Group } }>; requested: string[] } {
  const manifest = productionBodyManifest();
  const requested: string[] = [];
  return {
    requested,
    loadFile: async (url: string) => {
      const name = url.split("/").pop()!;
      requested.push(name);
      const id = name === "body-materials.glb" ? "materials" : Object.entries(manifest.files).find(([, f]) => (f as { url: string }).url === name)?.[0];
      if (!id) throw new Error(`unknown body file ${url}`);
      return { gltf: { scene: await loadBodyFile(id) } };
    },
  };
}
