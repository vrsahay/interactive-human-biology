import * as THREE from 'three';

const SVGNS = 'http://www.w3.org/2000/svg';
const _v = new THREE.Vector3();
const _box = new THREE.Box3();
const LEADER = 58;

/**
 * Labels in the platform style: a dark pill at the end of a short leader line
 * from an anchor dot on the 3D subject. At most five per shot. Each label may
 * appear at its own moment (`atMs`) so words arrive with what they name.
 * Labels avoid the reserved top-left heading area and stay on screen.
 */
export class FilmLabels {
  constructor(layer, camera, assets) {
    this.layer = layer;
    this.camera = camera;
    this.assets = assets;
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('aria-hidden', 'true');
    layer.append(this.svg);
    this.items = [];
    this.reserved = null;
    this.bottomLimit = 170;
    this.screen = new Map();
  }

  setShot(shot) {
    this.set((shot.view?.labels || []).slice(0, shot.view?.labelsMax || 5), shot.heading?.appearAtMs ?? 700);
  }

  set(list, defaultAt = 0) {
    for (const it of this.items) this.destroy(it);
    this.items = list.map((l) => this.create({ ...l, atMs: l.atMs ?? defaultAt }));
    // a dense map (the final summary): on small phones the route lines give way to the names
    this.layer.classList.toggle('is-dense', list.length > 4);
  }

  clear() {
    this.set([]);
  }

  create(l) {
    const el = document.createElement('div');
    el.className = 'film-label' + (l.focus ? ' is-focus' : '');
    const t = document.createElement('span');
    t.className = 'film-label__title';
    t.textContent = l.text;
    el.append(t);
    if (l.sub) {
      const s = document.createElement('span');
      s.className = 'film-label__sub';
      s.textContent = l.sub;
      el.append(s);
    }
    const line = document.createElementNS(SVGNS, 'line');
    line.setAttribute('stroke', 'rgba(242,240,234,0.45)');
    line.setAttribute('stroke-width', '1');
    const dot = document.createElementNS(SVGNS, 'circle');
    dot.setAttribute('r', '2.6');
    dot.setAttribute('fill', '#0e1218');
    dot.setAttribute('stroke', 'rgba(242,240,234,0.8)');
    this.svg.append(line, dot);
    this.layer.append(el);
    return { ...l, el, line, dot, on: false };
  }

  destroy(it) {
    it.el.remove();
    it.line.remove();
    it.dot.remove();
  }

  setTime(localMs) {
    for (const it of this.items) {
      const on = localMs >= it.atMs;
      if (on !== it.on) {
        it.on = on;
        it.el.classList.toggle('is-on', on);
      }
    }
  }

  showAll() {
    this.setTime(Infinity);
  }

  anchorPos(anchor, out) {
    if (typeof anchor === 'function') return anchor(out);
    if (Array.isArray(anchor)) return out.set(anchor[0], anchor[1], anchor[2]);
    if (anchor?.isVector3) return out.copy(anchor);
    const node = typeof anchor === 'string' ? this.assets.find(anchor) : anchor;
    if (!node) return null;
    let mesh = false;
    node.traverse((o) => {
      if (o.isMesh && !o.isInstancedMesh) mesh = true;
    });
    if (mesh) {
      _box.setFromObject(node, true);
      return _box.getCenter(out);
    }
    return node.getWorldPosition(out);
  }

  update(width, height) {
    this.camera.updateMatrixWorld();
    const narrow = width < 900;
    const bottomLimit = height - (narrow ? 190 : 170);
    const placed = [];
    for (const it of this.items) {
      const p = this.anchorPos(it.anchor, _v);
      // a process can hold a label back until the thing it names is on screen (V2.4: userData.labelOff)
      const held = typeof it.anchor === 'string' && !!this.assets.find(it.anchor)?.userData?.labelOff;
      const show = !!p && it.on && !held;
      if (!p) {
        // no target on screen (an Explore structure hidden in this view): show nothing, not a wrong line
        it.el.style.visibility = 'hidden';
        it.line.style.visibility = 'hidden';
        it.dot.style.visibility = 'hidden';
        if (it.screen) it.screen.visible = false;
        continue;
      }
      p.project(this.camera);
      const visible = show && p.z < 1 && Math.abs(p.x) < 1.1 && Math.abs(p.y) < 1.1;
      const x = (p.x * 0.5 + 0.5) * width;
      const y = (-p.y * 0.5 + 0.5) * height;
      let dir = it.dir || (x < width * 0.55 ? 'left' : 'right');
      const w = it.el.offsetWidth || 90;
      const h = it.el.offsetHeight || 26;
      let len = narrow ? LEADER * 0.7 : LEADER;
      let ex = x + (dir === 'right' ? len : -len);
      let ey = y - len * 0.35;
      // keep the pill on screen and out of the reserved heading area
      let left = dir === 'right' ? ex + 4 : ex - w - 4;
      if (left < 8) {
        dir = 'right';
        ex = x + len;
        left = ex + 4;
      }
      if (left + w > width - 8) {
        dir = 'left';
        ex = x - len;
        left = ex - w - 4;
      }
      let top = ey - h / 2;
      const r = this.reserved;
      if (r && left < r.right && left + w > r.left && top < r.bottom && top + h > r.top) {
        top = r.bottom + 6;
        ey = top + h / 2;
      }
      top = Math.max(narrow ? 110 : 64, Math.min(bottomLimit - h, top));
      // de-overlap: never let two pills sit on top of each other
      for (const other of placed) {
        // V2.4 (DA-23): a clear 10 px between stacked pills (two-line pills read as one block at 5 px)
        if (left < other.left + other.w + 6 && left + w + 6 > other.left && top < other.top + other.h + 8 && top + h + 8 > other.top) {
          top = other.top + other.h + 10;
        }
      }
      placed.push({ left, top, w, h });
      ey = top + h / 2;
      it.el.style.transform = `translate(${left}px, ${top}px)`;
      it.el.style.visibility = visible ? 'visible' : 'hidden';
      it.line.setAttribute('x1', x);
      it.line.setAttribute('y1', y);
      it.line.setAttribute('x2', dir === 'right' ? left - 2 : left + w + 2);
      it.line.setAttribute('y2', ey);
      it.dot.setAttribute('cx', x);
      it.dot.setAttribute('cy', y);
      const lineOn = visible ? 'visible' : 'hidden';
      it.line.style.visibility = lineOn;
      it.dot.style.visibility = lineOn;
      it.line.style.opacity = it.dot.style.opacity = '1';
      it.screen = { x, y, left, top, w, h, dir, visible };
      if (it.id || it.inset) this.screen.set(it.inset || it.id, it.screen);
    }
  }

  describe() {
    return this.items.filter((i) => i.on).map((i) => (i.sub ? `${i.text}: ${i.sub}` : i.text)).join(', ');
  }
}
