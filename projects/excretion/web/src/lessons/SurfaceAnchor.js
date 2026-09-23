import * as THREE from 'three';
import { surfaceTable } from '../animation/ParticleField.js';

/**
 * A label target that lies ON the visible surface of a structure (Explore, V2.4 label audit).
 *
 * Why: a node's bounding-box centre is not a point of the structure. For rings and shells (bark,
 * phloem, xylem, old xylem, cell wall, membranes, the root hair zone…) the centre is the hollow
 * middle, so the leader line ended on the stem's centre, the membrane, a soil grain, etc.
 *
 * How: points are sampled on the structure's own meshes (in mesh space, so they move with it). For
 * the current camera, the chosen point is one the viewer can actually see: a ray from the camera
 * reaches it before any opaque object (see-through tissue does not hide it). The point is kept while
 * it stays visible (no jumping while turning the model) and re-chosen once the camera settles after
 * it was turned or zoomed. A tapped point is used first when there is one.
 */
const SEE_THROUGH = 0.75;
const SETTLE_MS = 140;

export function surfaceAnchor({ nodes, stage, camera, prefer = null, count = 96 }) {
  const part = new Set();
  for (const n of nodes) n.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) part.add(o); });
  const meshes = [...part];
  const per = meshes.length <= 6 ? Math.max(48, count) : Math.max(8, Math.ceil((count * 6) / meshes.length));
  const samples = [];
  meshes.forEach((m, i) => {
    try {
      for (const s of surfaceTable(m, per, 7331 + i, { space: 'local' })) samples.push({ mesh: m, local: s.p });
    } catch { /* degenerate mesh: no samples */ }
  });
  const rc = new THREE.Raycaster();
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const occluders = () => {
    const out = [];
    stage.traverse((o) => { if (o.isMesh && !o.isInstancedMesh && o.visible && !o.userData.noLook) out.push(o); });
    return out;
  };
  const seeThrough = (o) => {
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    return mats.every((mt) => mt.transparent && mt.opacity < SEE_THROUGH);
  };
  const world = (c, out = new THREE.Vector3()) => c.mesh.localToWorld(out.copy(c.local));

  /**
   * The visible point of the structure along the camera ray through world point p.
   * Returns { mesh, local } when it can be seen, else { buried } = how far behind the surface in
   * front of it the point lies (a structure that only shows in a slit, like the stomatal pore, is
   * least buried exactly where the learner can see it).
   */
  function visibleAt(p, objs) {
    dir.copy(p).sub(camera.position);
    const dist = dir.length();
    rc.set(camera.position, dir.normalize());
    rc.far = dist + 0.02;
    rc.near = 0;
    for (const h of rc.intersectObjects(objs, false)) {
      if (part.has(h.object)) return { mesh: h.object, local: h.object.worldToLocal(h.point.clone()) };
      if (seeThrough(h.object)) continue;
      return { buried: dist - h.distance };
    }
    return { buried: Infinity };
  }
  const onScreen = (p) => {
    v.copy(p).project(camera);
    return v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.92 ? v.clone() : null;
  };

  // "just behind the surface" for this model (4% of its size)
  let near = 0;
  const nearSurface = () => {
    if (!near) {
      const box = new THREE.Box3().setFromObject(stage);
      near = box.isEmpty() ? 0.02 : box.getSize(new THREE.Vector3()).length() * 0.04;
    }
    return near;
  };

  let chosen = null;
  let lastSig = '';
  let changedAt = 0;
  let dirty = true;

  function choose() {
    const objs = occluders();
    // 1. keep the current point while it is still visible (stable while the model is turned)
    if (chosen) {
      const p = world(chosen);
      if (onScreen(p) && visibleAt(p, objs).mesh) return;
    }
    // 2. a tapped point
    if (prefer) {
      const hit = onScreen(prefer.point) ? visibleAt(prefer.point, objs) : null;
      prefer = null;
      if (hit?.mesh) { chosen = hit; return; }
    }
    // 3. where is the structure actually on screen? Scan its on-screen area: a pixel counts when the
    //    first thing seen there is the structure itself. This finds narrow slivers (a pore showing in
    //    its slit) that sampling its surface can miss.
    const cand = [];
    let x0 = 1;
    let x1 = -1;
    let y0 = 1;
    let y1 = -1;
    for (const s of samples) {
      const p = world(s);
      const sp = onScreen(p);
      if (!sp) continue;
      cand.push({ s, p, sp });
      x0 = Math.min(x0, sp.x); x1 = Math.max(x1, sp.x); y0 = Math.min(y0, sp.y); y1 = Math.max(y1, sp.y);
    }
    if (!cand.length) return;
    const N = 16;
    const seen = [];
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = x0 + ((x1 - x0) * i) / N;
        const y = y0 + ((y1 - y0) * j) / N;
        rc.setFromCamera({ x, y }, camera);
        rc.far = Infinity;
        rc.near = 0;
        for (const h of rc.intersectObjects(objs, false)) {
          if (part.has(h.object)) { seen.push({ x, y, h }); break; }
          if (seeThrough(h.object)) continue;
          break;
        }
      }
    }
    if (seen.length) {
      const cx = seen.reduce((a, c) => a + c.x, 0) / seen.length;
      const cy = seen.reduce((a, c) => a + c.y, 0) / seen.length;
      seen.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
      const best = seen[0].h;
      chosen = { mesh: best.object, local: best.object.worldToLocal(best.point.clone()) };
      return;
    }
    // 4. nothing of it is unobstructed: the point lying least deep behind what is in front of it.
    //    Accept it only when it is just behind the surface (a pore seen in its slit); if the structure
    //    is properly hidden (the root tip out of the framing, a layer behind the whole model) no point
    //    on screen belongs to it, so the label says nothing rather than pointing at the wrong tissue.
    let least = null;
    for (const c of cand.slice(0, 64)) {
      const hit = visibleAt(c.p, objs);
      if (hit.mesh) { chosen = hit; return; }
      if (!least || hit.buried < least.buried) least = { buried: hit.buried, s: c.s };
    }
    if (least && least.buried <= nearSurface()) chosen = { mesh: least.s.mesh, local: least.s.local.clone() };
    else chosen = null;
  }

  const anchor = (out) => {
    camera.updateMatrixWorld();
    const e = camera.matrixWorld.elements;
    const sig = `${e[12].toFixed(3)},${e[13].toFixed(3)},${e[14].toFixed(3)},${e[8].toFixed(3)},${e[9].toFixed(3)},${e[10].toFixed(3)},${camera.fov}`;
    const now = performance.now();
    if (sig !== lastSig) { lastSig = sig; changedAt = now; dirty = true; }
    if (dirty && (!chosen || now - changedAt > SETTLE_MS)) {
      dirty = false;
      choose();
    }
    if (!chosen) return null;
    return world(chosen, out);
  };
  anchor.refresh = () => { dirty = true; changedAt = 0; };
  return anchor;
}
