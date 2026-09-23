import * as THREE from 'three';

const WARM = new THREE.Color(0xd89a4e);
const SHELL = new THREE.Color(0xb8c4d6);
const _c = new THREE.Color();

/**
 * Per-mesh visual state, eased every frame towards targets set by the film:
 *   hl    highlight   warm emissive glow (restrained)
 *   dim   darken      colour × 0.13, still OPAQUE (a see-through tissue reads as noise)
 *   fade  opacity     used for the soil "shell" and for things that lift away
 *   shell 0..1        tints towards a cool see-through shell (soil when we look below ground)
 * Every mesh has its own material clone (AssetLoader), so states never leak.
 */
export class Looks {
  constructor() {
    this.entries = new Map();
    this.snap = false;
  }

  register(mesh) {
    if (this.entries.has(mesh)) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const base = mats.map((m) => ({
      m,
      color: m.color ? m.color.clone() : null,
      emissive: m.emissive ? m.emissive.clone().multiplyScalar(m.emissiveIntensity ?? 1) : null,
      opacity: m.opacity,
      transparent: m.transparent,
      depthWrite: m.depthWrite,
      map: m.map || null,
    }));
    this.entries.set(mesh, { mesh, base, cur: { hl: 0, dim: 0, fade: 1, shell: 0 }, tgt: { hl: 0, dim: 0, fade: 1, shell: 0 } });
  }

  registerTree(root) {
    root.traverse((o) => {
      if (o.isMesh && !o.userData.noLook) this.register(o);
    });
  }

  entry(mesh) {
    return this.entries.get(mesh);
  }

  /** Change the resting colour (e.g. a vacuole slowly tinting as it fills). */
  setBaseColor(mesh, color) {
    const e = this.entries.get(mesh);
    if (e) for (const b of e.base) b.color?.copy(color);
  }

  baseColor(mesh) {
    return this.entries.get(mesh)?.base[0].color;
  }

  /** Called once per frame by the film with the targets for this instant. */
  resetTargets() {
    for (const e of this.entries.values()) {
      e.tgt.hl = 0;
      e.tgt.dim = 0;
      e.tgt.fade = e.mesh.userData.restFade ?? 1;
      e.tgt.shell = 0;
    }
  }

  target(meshes, key, value) {
    for (const m of meshes) {
      const e = this.entries.get(m);
      if (e) e.tgt[key] = value;
    }
  }

  apply(dt) {
    const k = this.snap ? 1 : 1 - Math.exp(-dt * 5);
    this.snap = false;
    for (const e of this.entries.values()) {
      const c = e.cur;
      const t = e.tgt;
      let changed = false;
      for (const key of ['hl', 'dim', 'fade', 'shell']) {
        const v = c[key] + (t[key] - c[key]) * k;
        const nv = Math.abs(v - t[key]) < 0.002 ? t[key] : v;
        if (nv !== c[key]) {
          c[key] = nv;
          changed = true;
        }
      }
      if (changed || e.dirty) this.write(e);
      e.dirty = false;
    }
  }

  write(e) {
    const { hl, dim, fade, shell } = e.cur;
    let maxOpacity = 0;
    for (const b of e.base) {
      const m = b.m;
      if (b.color && m.color) {
        _c.copy(b.color).multiplyScalar(1 - dim * 0.87);
        if (shell > 0) _c.lerp(SHELL, shell);
        m.color.copy(_c);
      }
      if (m.emissive && b.emissive) {
        m.emissive.copy(b.emissive).multiplyScalar(1 - dim).lerp(WARM, hl * 0.28);
        m.emissiveIntensity = 1;
      }
      if (b.map) m.map = shell > 0.5 ? null : b.map;
      const o = b.opacity * fade;
      const transparent = o < 0.995 || b.transparent;
      if (m.transparent !== transparent) {
        m.transparent = transparent;
        m.needsUpdate = true;
      }
      if (shell > 0.5 && m.map !== null) m.needsUpdate = true;
      m.opacity = o;
      m.depthWrite = transparent ? false : b.depthWrite;
      maxOpacity = Math.max(maxOpacity, o);
    }
    e.mesh.visible = maxOpacity > 0.01;
  }

  /** Force a rewrite (after a process changed a base value). */
  touch(mesh) {
    const e = this.entries.get(mesh);
    if (e) e.dirty = true;
  }
}

export function meshesOf(obj) {
  const out = [];
  obj?.traverse((o) => {
    if (o.isMesh) out.push(o);
  });
  return out;
}

export function partNodeOf(obj) {
  let o = obj;
  while (o) {
    if (o.userData && o.userData.part) return o;
    o = o.parent;
  }
  return null;
}
