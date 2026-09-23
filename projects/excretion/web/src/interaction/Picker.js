import * as THREE from 'three';
import { partNodeOf } from '../scene/Looks.js';

/**
 * Raycast hover + tap selection over an explicit set of pickable nodes.
 * Emits through callbacks so it stays independent from lesson logic.
 * Touch: a tap is a pointerdown/up pair that moved < 8 px (so orbit drags don't pick).
 */
export class Picker {
  constructor(dom, camera, highlighter, appEl) {
    this.dom = dom;
    this.camera = camera;
    this.highlighter = highlighter;
    this.appEl = appEl;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.targets = [];
    this.enabled = false;
    this.filter = null;
    this.onPick = null;
    this.onHover = null;
    this.down = null;

    dom.addEventListener('pointermove', (e) => this.handleMove(e));
    dom.addEventListener('pointerdown', (e) => {
      this.down = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    dom.addEventListener('pointerup', (e) => this.handleUp(e));
    dom.addEventListener('pointerleave', () => this.setHover(null));
  }

  /** nodes: Object3D list; filter(partNode) → boolean decides what may be picked. */
  enable(nodes, { filter = null, onPick = null, onHover = null } = {}) {
    this.targets = nodes.filter(Boolean);
    this.filter = filter;
    this.onPick = onPick;
    this.onHover = onHover;
    this.enabled = true;
    this.appEl.classList.add('is-pickable');
  }

  disable() {
    this.enabled = false;
    this.targets = [];
    this.onPick = null;
    this.setHover(null);
    this.appEl.classList.remove('is-pickable');
  }

  cast(e) {
    const rect = this.dom.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, true);
    for (const h of hits) {
      if (!h.object.visible) continue;
      const mats = Array.isArray(h.object.material) ? h.object.material : [h.object.material];
      if (mats.every((m) => m.opacity < 0.25)) continue; // ghosted things are see-through for picking too
      const node = partNodeOf(h.object);
      if (!node) continue;
      if (this.filter && !this.filter(node)) continue;
      return { node, point: h.point };
    }
    return null;
  }

  handleMove(e) {
    if (!this.enabled || e.pointerType === 'touch') return;
    const hit = this.cast(e);
    this.setHover(hit?.node || null);
  }

  setHover(node) {
    if (this.hoverNode === node) return;
    this.hoverNode = node;
    this.highlighter.setHover(node);
    this.appEl.classList.toggle('is-hovering', !!node);
    this.onHover?.(node);
  }

  handleUp(e) {
    if (!this.enabled || !this.down) return;
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
    const quick = performance.now() - this.down.t < 600;
    this.down = null;
    if (moved > 8 || !quick) return;
    const hit = this.cast(e);
    if (hit) this.onPick?.(hit.node, hit.point);
  }
}
