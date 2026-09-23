import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader, DRACO_GLTF_CONFIG } from 'three/addons/loaders/DRACOLoader.js';

/**
 * Loads the GLB assets listed in the manifest (written by `npm run assets:inspect`),
 * prepares materials for per-object control and builds a name → object registry for
 * every node authored in Blender.
 *
 * V2: the scale-specific assets are loaded by priority.
 *   core  (plant, soil, waste symbols) before the first frame
 *   lazy  (leaf, stoma, leaf interior, cell, chloroplast, stem, xylem, root, root hairs)
 *         in the background, in lesson order; `ensure(id)` returns the asset's promise,
 *         so a stage can wait for its model if the learner jumps ahead.
 * Geometry is Draco-compressed; the WASM decoder is bundled by Vite and served from this site.
 */
export class AssetLoader {
  constructor(baseUrl = './') {
    this.baseUrl = baseUrl;
    this.draco = new DRACOLoader();
    this.draco.setDecoderPath(DRACO_GLTF_CONFIG); // the glTF-only WASM decoder, bundled and served from this site
    this.gltfLoader = new GLTFLoader();
    this.gltfLoader.setDRACOLoader(this.draco);
    this.assets = new Map();
    this.registry = new Map();
    this.manifest = null;
    this.pending = new Map();
    this.timings = {};
    this.onAsset = () => {};
  }

  async loadManifest() {
    const res = await fetch(`${this.baseUrl}models/manifest.json`, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`Could not load asset manifest (${res.status})`);
    this.manifest = await res.json();
    return this.manifest;
  }

  entry(id) {
    return this.manifest.assets.find((a) => a.id === id);
  }

  /** Load one asset (once). Resolves with the glTF. */
  ensure(id, onBytes = null) {
    if (this.pending.has(id)) return this.pending.get(id);
    const entry = this.entry(id);
    if (!entry) return Promise.reject(new Error(`[assets] unknown asset ${id}`));
    const t0 = performance.now();
    const p = this.gltfLoader.loadAsync(`${this.baseUrl}${entry.file}`, (xhr) => onBytes?.(xhr.loaded)).then((gltf) => {
      this.prepare(gltf.scene, entry);
      this.assets.set(id, gltf);
      this.timings[id] = Math.round(performance.now() - t0);
      this.onAsset(id, gltf);
      return gltf;
    });
    this.pending.set(id, p);
    return p;
  }

  loaded(id) {
    return this.assets.has(id);
  }

  /** Core assets, with a progress bar. */
  async loadCore(onProgress = () => {}) {
    const manifest = this.manifest || (await this.loadManifest());
    const core = manifest.assets.filter((a) => a.load !== 'lazy');
    const total = core.reduce((s, a) => s + a.bytes, 0);
    const got = new Map();
    const report = () => onProgress(Math.min(1, [...got.values()].reduce((s, v) => s + v, 0) / total));
    await Promise.all(core.map((a) => this.ensure(a.id, (b) => {
      got.set(a.id, b);
      report();
    }).then(() => {
      got.set(a.id, a.bytes);
      report();
    })));
    return this.assets;
  }

  /** Everything else, one after another in the given order (so bandwidth goes to what comes first). */
  async loadLazy(order) {
    const lazy = this.manifest.assets.filter((a) => a.load === 'lazy').map((a) => a.id);
    const ids = [...order.filter((id) => lazy.includes(id)), ...lazy.filter((id) => !order.includes(id))];
    for (const id of ids) {
      try {
        await this.ensure(id);
      } catch (err) {
        console.error(err);
      }
    }
  }

  /** Every asset (used by QA and by tools that need the whole set). */
  async loadAll(onProgress = () => {}) {
    await this.loadCore(onProgress);
    await this.loadLazy([]);
    return this.assets;
  }

  prepare(root, entry) {
    root.userData.assetId = entry.id;
    root.traverse((o) => {
      if (o !== root && o.name) {
        if (this.registry.has(o.name) && this.registry.get(o.name) !== o) {
          console.warn(`[assets] duplicate node name ${o.name}`);
        }
        this.registry.set(o.name, o);
      }
      if (o.isCamera) {
        o.visible = false; // authored camera references are data, not renderables
      }
      if (o.isMesh) {
        o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m.map) m.map.anisotropy = 4;
          if (m.transparent) m.depthWrite = false;
        }
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
  }

  /** Register a runtime-made node (e.g. a label anchor created by a process). */
  register(name, obj) {
    obj.name = name;
    this.registry.set(name, obj);
    return obj;
  }

  get(name) {
    const o = this.registry.get(name);
    if (!o) throw new Error(`[assets] node "${name}" not found — check the Blender export contract`);
    return o;
  }

  find(name) {
    return this.registry.get(name) || null;
  }

  worldPos(name, target = new THREE.Vector3()) {
    return this.get(name).getWorldPosition(target);
  }

  scene(id) {
    return this.assets.get(id)?.scene;
  }
}
