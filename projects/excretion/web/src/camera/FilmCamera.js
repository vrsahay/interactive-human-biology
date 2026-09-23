import * as THREE from 'three';
import { easeInOutCubic } from '../animation/easing.js';

const FWD = new THREE.Vector3(0, 0, 1);
const _v = new THREE.Vector3();

/**
 * The film camera: "the camera is the teacher".
 *
 * A shot's camera is data: { preset, from?, transitionMs, endScale, compose, follow? }
 *   preset       authored framing (usually a CAM_/TGT_ pair exported from Blender)
 *   from         start from another framing (a cut), then travel
 *   transitionMs travel time from the previous framing (orbit-style, eased)
 *   endScale     slow push-in (<1) or pull-back (>1) across the whole shot
 *   compose      'right' puts the subject right of the top-left heading (desktop)
 *   follow       track a moving thing from a process (e.g. a water drop)
 *
 * Poses are pure functions of shot time, so pausing, scrubbing and returning
 * from Explore always land on exactly the same frame. Seeking cuts.
 */
export class FilmCamera {
  constructor(camera, assets, presets) {
    this.camera = camera;
    this.assets = assets;
    this.presets = presets;
    this.pose = { pos: camera.position.clone(), target: new THREE.Vector3(0, 0.4, 0), fov: camera.fov };
    this.compose = { x: 0, y: 0, zoom: 1 };
    this.composeTarget = { x: 0, y: 0, zoom: 1 };
    this.reduced = false;
    this.defaultFov = 34;
  }

  vec(v, out = new THREE.Vector3()) {
    if (Array.isArray(v)) return out.set(v[0], v[1], v[2]);
    if (typeof v === 'string') return this.assets.get(v).getWorldPosition(out);
    if (v?.isVector3) return out.copy(v);
    throw new Error('bad camera vector ' + v);
  }

  resolve(name, { aspect = true } = {}) {
    const p = this.presets[name];
    if (!p) throw new Error(`Unknown camera preset "${name}"`);
    const pos = new THREE.Vector3();
    const target = new THREE.Vector3();
    if (p.cam) {
      const cam = this.assets.get(p.cam);
      cam.getWorldPosition(pos);
      this.vec(p.target || cam.userData.target || 'TGT_' + p.cam.slice(4), target);
    } else {
      this.vec(p.pos, pos);
      this.vec(p.target, target);
    }
    if (p.targetOffset) target.add(this.vec(p.targetOffset, _v));
    const off = pos.clone().sub(target);
    if (p.dist) off.multiplyScalar(p.dist);
    if (aspect) off.multiplyScalar(this.aspectFactor(p));
    return { pos: target.clone().add(off), target, fov: p.fov || this.defaultFov };
  }

  /** Portrait screens: pull back so the subject still fits across. */
  aspectFactor(p) {
    const aspect = this.camera.aspect;
    const ref = p.refAspect || 1.3;
    if (aspect >= ref) return 1;
    return Math.min(2.1, Math.pow(ref / aspect, p.aspectPower ?? 0.6));
  }

  static lerpPose(a, b, e) {
    const t0 = a.target.clone().lerp(b.target, e);
    const offA = a.pos.clone().sub(a.target);
    const offB = b.pos.clone().sub(b.target);
    const la = Math.max(offA.length(), 1e-4);
    const lb = Math.max(offB.length(), 1e-4);
    const qa = new THREE.Quaternion().setFromUnitVectors(FWD, offA.normalize());
    const qb = new THREE.Quaternion().setFromUnitVectors(FWD, offB.normalize());
    const q = qa.slerp(qb, e);
    const len = Math.exp(Math.log(la) + (Math.log(lb) - Math.log(la)) * e);
    const pos = FWD.clone().applyQuaternion(q).multiplyScalar(len).add(t0);
    return { pos, target: t0, fov: a.fov + (b.fov - a.fov) * e };
  }

  /**
   * Pose for a shot at local time. `start` is the pose the travel begins from
   * (null = cut). `followPose` supplies a moving framing for follow shots.
   */
  evalShot(cam, localMs, durationMs, start, followPose = null) {
    let end = followPose || this.resolve(cam.preset);
    let from = start;
    if (cam.from) from = this.resolve(cam.from);
    const trans = this.reduced ? 0 : cam.transitionMs ?? 1600;
    let pose = end;
    if (from && trans > 0 && localMs < trans) pose = FilmCamera.lerpPose(from, end, easeInOutCubic(Math.max(0, localMs) / trans));
    if (cam.endScale && !this.reduced) {
      const s = 1 + (cam.endScale - 1) * easeInOutCubic(Math.min(1, Math.max(0, localMs) / Math.max(1, durationMs)));
      const off = pose.pos.clone().sub(pose.target).multiplyScalar(s);
      pose = { pos: pose.target.clone().add(off), target: pose.target.clone(), fov: pose.fov };
    }
    return pose;
  }

  apply(pose) {
    this.pose = { pos: pose.pos.clone(), target: pose.target.clone(), fov: pose.fov };
    this.camera.position.copy(pose.pos);
    this.camera.lookAt(pose.target);
    if (Math.abs(this.camera.fov - pose.fov) > 0.01) {
      this.camera.fov = pose.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Composition in screen space (projection view offset):
   *   x   shift the subject right (desktop 'right' compose)
   *   y   lift the subject above bottom UI / below top UI
   *   zoom shrink to fit when the free area is small (phones with a panel open)
   */
  setComposeTarget(x, y, zoom) {
    this.composeTarget = { x, y, zoom };
  }

  updateCompose(dt, width, height, snap = false) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 4);
    const c = this.compose;
    const t = this.composeTarget;
    c.x += (t.x - c.x) * k;
    c.y += (t.y - c.y) * k;
    c.zoom += (t.zoom - c.zoom) * k;
    const cam = this.camera;
    const sx = c.x;
    const sy = c.y;
    if (Math.abs(sx) < 0.5 && Math.abs(sy) < 0.5) cam.clearViewOffset();
    else {
      const fullW = width + Math.abs(sx) * 2;
      const fullH = height + Math.abs(sy) * 2;
      cam.setViewOffset(fullW, fullH, sx > 0 ? 0 : Math.abs(sx) * 2, sy > 0 ? Math.abs(sy) * 2 : 0, width, height);
    }
    cam.zoom = c.zoom;
    cam.updateProjectionMatrix();
  }
}
