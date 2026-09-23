import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Turn / zoom / pan for Explore only. During the guided film the camera is the
 * teacher, so the rig is disabled. Limits keep the subject in view.
 */
export class OrbitRig {
  constructor(camera, dom, filmCamera) {
    this.filmCamera = filmCamera;
    const c = new OrbitControls(camera, dom);
    c.enableDamping = true;
    c.dampingFactor = 0.09;
    c.rotateSpeed = 0.7;
    c.zoomSpeed = 0.8;
    c.panSpeed = 0.6;
    c.screenSpacePanning = true;
    c.enabled = false;
    c.addEventListener('change', () => {
      if (!c.enabled) return;
      if (this.bounds) c.target.clamp(this.bounds.min, this.bounds.max);
      filmCamera.pose = { pos: camera.position.clone(), target: c.target.clone(), fov: camera.fov };
    });
    this.controls = c;
  }

  enable({ target, minDistance = 0.3, maxDistance = 6, panRadius = 0.6 } = {}) {
    const c = this.controls;
    c.target.copy(target);
    c.minDistance = minDistance;
    c.maxDistance = maxDistance;
    this.bounds = new THREE.Box3(target.clone().subScalar(panRadius), target.clone().addScalar(panRadius));
    c.enabled = true;
    c.update();
  }

  disable() {
    this.controls.enabled = false;
  }

  update() {
    if (this.controls.enabled) this.controls.update();
  }
}
