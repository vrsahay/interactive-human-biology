import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NIGHT_SKY = new THREE.Color(0x5b74b8);
const NIGHT_KEY = new THREE.Color(0x9fb4ff);

/**
 * Renderer + cinematic lighting + frame loop + picture-in-picture insets.
 *
 * Look (platform standard): transparent clear so the CSS gradient shows,
 * NeutralToneMapping, soft environment, a warm key and a cool rim that follow
 * the camera, no shadows.
 *
 * Insets: small round windows that render ANOTHER stage (e.g. the cell) with
 * its own camera, drawn on top of the main view. Used in the final synthesis
 * so the whole plant and its internal stores can be seen together.
 */
export class Stage {
  constructor(container, { quality = 'auto' } = {}) {
    this.container = container;
    const mobile = matchMedia('(max-width: 900px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    this.mobile = mobile;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.maxPixelRatio = quality === 'low' ? 1 : mobile ? 1.75 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    renderer.info.autoReset = false; // count every pass (main + insets + overlay)
    container.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('tabindex', '-1');
    this.renderer = renderer;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.38;
    this.scene = scene;

    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 80);
    this.camera.position.set(0, 1, 4);
    scene.add(this.camera);

    const hemi = new THREE.HemisphereLight(0xdfe6f2, 0x1a1f28, 0.55);
    scene.add(hemi);
    // key + rim are children of the camera so the subject is always well lit from the viewer's side
    const key = new THREE.DirectionalLight(0xfff1de, 2.1);
    key.position.set(2.5, 3.2, 3);
    const keyTarget = new THREE.Object3D();
    keyTarget.position.set(0, 0, -4);
    this.camera.add(key, keyTarget);
    key.target = keyTarget;
    const rim = new THREE.DirectionalLight(0xb9d3ff, 1.35);
    rim.position.set(-3, 2.2, -3.5);
    const rimTarget = new THREE.Object3D();
    rimTarget.position.set(0, 0, -4);
    this.camera.add(rim, rimTarget);
    rim.target = rimTarget;
    this.lights = { hemi, key, rim };
    this.lightBase = { hemi: hemi.intensity, key: key.intensity, rim: rim.intensity, env: scene.environmentIntensity,
      hemiSky: hemi.color.clone(), keyColor: key.color.clone() };

    this.frameFns = [];
    this.insets = [];
    this.overlay = { scene: new THREE.Scene(), camera: new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1) };
    this.stats = { fps: 0, calls: 0, triangles: 0 };
    this.resizeFns = [];
    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
  }

  onFrame(fn) {
    this.frameFns.push(fn);
  }

  onResize(fn) {
    this.resizeFns.push(fn);
  }

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const o = this.overlay.camera;
    o.left = 0; o.right = w; o.top = h; o.bottom = 0;
    o.updateProjectionMatrix();
    for (const fn of this.resizeFns) fn(w, h);
  }

  /** Register an inset window rendering `group` through `camera`. */
  addInset(id, group, camera) {
    const rt = new THREE.WebGLRenderTarget(512, 512, { samples: 4 });
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(0.5, 64),
      new THREE.MeshBasicMaterial({ map: rt.texture, transparent: true, opacity: 0, toneMapped: false }),
    );
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.5, 0.52, 64),
      new THREE.MeshBasicMaterial({ color: 0xe2a95c, transparent: true, opacity: 0, toneMapped: false }),
    );
    disc.visible = ring.visible = false;
    this.overlay.scene.add(disc, ring);
    const inset = { id, group, camera, rt, disc, ring, opacity: 0, x: 0, y: 0, size: 150 };
    this.insets.push(inset);
    return inset;
  }

  renderFrame() {
    const r = this.renderer;
    r.setRenderTarget(null);
    r.clear();
    r.render(this.scene, this.camera);
    const live = this.insets.filter((i) => i.opacity > 0.01);
    if (!live.length) return;
    // render each inset's stage alone into its target
    const visibility = new Map();
    this.scene.children.forEach((c) => visibility.set(c, c.visible));
    for (const inset of live) {
      this.scene.children.forEach((c) => {
        if (c.name && c.name.startsWith('STAGE_')) c.visible = c === inset.group;
      });
      inset.group.visible = true;
      r.setRenderTarget(inset.rt);
      r.setClearColor(0x11151c, 1);
      r.clear();
      r.render(this.scene, inset.camera);
    }
    this.scene.children.forEach((c) => (c.visible = visibility.get(c)));
    r.setRenderTarget(null);
    r.setClearColor(0x000000, 0);
    for (const inset of this.insets) {
      const on = inset.opacity > 0.01;
      inset.disc.visible = inset.ring.visible = on;
      if (!on) continue;
      inset.disc.material.opacity = inset.opacity;
      inset.ring.material.opacity = inset.opacity * 0.9;
      const y = this.height - inset.y;
      inset.disc.position.set(inset.x, y, 0);
      inset.ring.position.set(inset.x, y, 0);
      inset.disc.scale.setScalar(inset.size);
      inset.ring.scale.setScalar(inset.size);
    }
    r.render(this.overlay.scene, this.overlay.camera);
  }

  start() {
    let last = performance.now();
    let acc = 0;
    let frames = 0;
    const loop = (now = performance.now()) => {
      requestAnimationFrame(loop);
      // real elapsed time, so the film keeps pace with its (real-time) narration on slow devices and
      // through main-thread hiccups; the film pauses when the page is hidden, so a long gap cannot jump it
      const dt = Math.min(Math.max(0, (now - last) / 1000), 1.0);
      last = now;
      if (this.manual) return;
      this.step(dt);
      acc += dt;
      frames++;
      if (acc > 0.5) {
        this.stats.fps = Math.round(frames / acc);
        acc = 0;
        frames = 0;
      }
    };
    loop();
  }

  /**
   * Night (0..1): the key light dims and cools, the sky light turns deep blue. Used when the
   * lesson shows what a leaf does at night (no photosynthesis).
   */
  setNight(k) {
    if (this.nightK === k) return;
    this.nightK = k;
    const b = this.lightBase;
    const { hemi, key, rim } = this.lights;
    hemi.intensity = b.hemi * (1 - 0.45 * k);
    key.intensity = b.key * (1 - 0.62 * k);
    rim.intensity = b.rim * (1 + 0.25 * k);
    this.scene.environmentIntensity = b.env * (1 - 0.5 * k);
    hemi.color.copy(b.hemiSky).lerp(NIGHT_SKY, k);
    key.color.copy(b.keyColor).lerp(NIGHT_KEY, k);
  }

  /** Compile one stage's shaders as soon as its model arrives (no stall when it is first shown). */
  precompileGroup(group) {
    const was = group.visible;
    group.visible = true;
    try {
      this.renderer.compile(this.scene, this.camera);
    } finally {
      group.visible = was;
    }
  }

  /** Compile every stage's shaders up front, so entering a stage mid-lesson never stalls a frame. */
  precompile(groups) {
    const was = groups.map((g) => g.visible);
    groups.forEach((g) => (g.visible = true));
    this.renderer.compile(this.scene, this.camera);
    groups.forEach((g, i) => (g.visible = was[i]));
  }

  step(dt, render = true) {
    for (const fn of this.frameFns) fn(dt);
    if (render) {
      this.renderer.info.reset();
      this.renderFrame();
      this.stats.calls = this.renderer.info.render.calls;
      this.stats.triangles = this.renderer.info.render.triangles;
    }
  }
}
