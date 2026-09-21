import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Sphere, Vector3 } from "three";
import { fitDistance, shotForSphere } from "../../src/engine/camera/framing";
import { EventBus } from "../../src/engine/core/EventBus";
import { RenderLoop } from "../../src/engine/core/RenderLoop";
import { countOverlaps, layoutLabels, type LabelBox } from "../../src/engine/overlays/labelLayout";
import { comparePose, landmarkStatus, type PoseSample } from "../../src/engine/qa/poseCompare";

describe("render-on-demand loop", () => {
  it("coalesces requests into one frame and stops when tickers finish", () => {
    const queue: FrameRequestCallback[] = [];
    const render = vi.fn();
    const loop = new RenderLoop(render, (cb) => queue.push(cb));
    loop.requestRender();
    loop.requestRender();
    expect(queue).toHaveLength(1);
    queue.shift()!(16);
    expect(render).toHaveBeenCalledTimes(1);
    expect(loop.idle).toBe(true);
    let n = 0;
    loop.addTicker(() => ++n < 3);
    while (queue.length) queue.shift()!(16 * (n + 2));
    expect(render).toHaveBeenCalledTimes(4);
    expect(loop.idle).toBe(true);
  });
});

describe("event bus", () => {
  it("delivers typed events and unsubscribes", () => {
    const bus = new EventBus<{ a: number }>();
    const h = vi.fn();
    const off = bus.on("a", h);
    bus.emit("a", 1);
    off();
    bus.emit("a", 2);
    expect(h).toHaveBeenCalledExactlyOnceWith(1);
  });
});

describe("camera framing math", () => {
  it("fits a sphere on the tighter frustum axis", () => {
    const tall = fitDistance(1, 30, 0.5, 1);
    const wide = fitDistance(1, 30, 2, 1);
    expect(wide).toBeCloseTo(1 / Math.sin((15 * Math.PI) / 180), 6);
    expect(tall).toBeGreaterThan(wide);
    const shot = shotForSphere(new Sphere(new Vector3(1, 2, 3), 0.5), new Vector3(0, 0, 2), 30, 1);
    expect(shot.target.toArray()).toEqual([1, 2, 3]);
    expect(shot.position.x).toBe(1);
    expect(shot.position.z).toBeGreaterThan(3);
  });
});

describe("label layout", () => {
  it("removes overlaps deterministically and keeps labels inside the viewport insets", () => {
    const boxes: LabelBox[] = [0, 1, 2, 3, 4].map((i) => ({ id: `l${i}`, ax: 300, ay: 300 + i, x: 360, y: 300 + i * 2, w: 120, h: 22, align: "start", priority: i === 2 ? 5 : 1 }));
    const placed = layoutLabels(boxes, { width: 800, height: 600, insetBottom: 56 });
    expect(countOverlaps(placed)).toBe(0);
    expect(placed.every((p) => p.top >= 0 && p.top + p.h <= 600 - 56)).toBe(true);
    expect(layoutLabels(boxes, { width: 800, height: 600, insetBottom: 56 })).toEqual(placed);
    // a label pinned against the top inset pushes its neighbour down instead of overlapping it
    const pinned: LabelBox[] = [
      { id: "a", ax: 400, ay: 90, x: 380, y: 96, w: 60, h: 24, align: "end", priority: 4 },
      { id: "b", ax: 405, ay: 112, x: 385, y: 108, w: 60, h: 24, align: "end", priority: 4 },
    ];
    expect(countOverlaps(layoutLabels(pinned, { width: 800, height: 600, insetTop: 100 }))).toBe(0);
    const edge = layoutLabels([{ id: "e", ax: 790, ay: 590, x: 850, y: 640, w: 100, h: 20, align: "start", priority: 1 }], { width: 800, height: 600 });
    expect(edge[0].left + edge[0].w).toBeLessThanOrEqual(800);
  });

  it("a label moved off a full-width reserved rectangle is not pushed back under it by the de-overlap (Step 16F)", () => {
    // the body map on a 320 px phone: the topic heading spans the width at the top, and two labels stack under it
    const reserved = { left: 16, top: 58, right: 304, bottom: 123 };
    const stacked: LabelBox[] = [
      { id: "fixed", ax: 150, ay: 110, x: 93, y: 117, w: 52, h: 26, align: "end", priority: 3 },
      { id: "pivot", ax: 155, ay: 150, x: 102, y: 147, w: 50, h: 26, align: "end", priority: 3 },
    ];
    const placed = layoutLabels(stacked, { width: 320, height: 844, insetTop: 100, insetBottom: 190, reserved });
    expect(countOverlaps(placed)).toBe(0);
    for (const p of placed) {
      const clear = p.top >= reserved.bottom || p.top + p.h <= reserved.top || p.left >= reserved.right || p.left + p.w <= reserved.left;
      expect(clear, `${p.id} is under the reserved rectangle`).toBe(true);
    }
  });
});

describe("gate 3 comparison infrastructure", () => {
  const sample = (dx: number): PoseSample => ({
    flexionDeg: 90,
    anchors: { a: [dx, 0, 0] },
    structures: { s: { worldMatrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, dx, 0, 0, 1], worldBBox: { min: [dx, 0, 0], max: [1 + dx, 1, 1] } } },
  });
  it("passes within tolerance and reports the worst offenders", () => {
    expect(comparePose(sample(0.00005), sample(0)).passed).toBe(true);
    const bad = comparePose(sample(0.001), sample(0));
    expect(bad.passed).toBe(false);
    expect(bad.anchorMaxMm).toBeCloseTo(1, 6);
    expect(bad.worstAnchor).toBe("a");
    const missing = comparePose({ ...sample(0), anchors: {} }, sample(0));
    expect(missing.missing).toEqual(["anchor:a"]);
  });
  it("formal landmark validation is NOT AVAILABLE without approved definitions", () => {
    expect(landmarkStatus(null, "elbow_r")).toEqual({ status: "NOT AVAILABLE", reason: "approved landmark definitions missing" });
    expect(landmarkStatus("{}", "elbow_r").status).toBe("NOT AVAILABLE");
    expect(landmarkStatus(JSON.stringify({ jointId: "elbow_r", approvedBy: "reviewer", poses: [{ flexionDeg: 0, landmarks: [] }] }), "elbow_r").status).toBe("AVAILABLE");
  });

  it("a draft landmark package is reported but never approves Gate 3", () => {
    const draft = readFileSync(join(import.meta.dirname, "..", "..", "qa", "elbow_r.poses.draft.json"), "utf8");
    const parsed = JSON.parse(draft) as { approvedBy?: string; landmarks: { landmarkId: string; bindPose: { localMeshSpace: number[] } }[] };
    expect(parsed.approvedBy, "a draft must never carry approvedBy").toBeUndefined();
    const s = landmarkStatus(null, "elbow_r", draft);
    expect(s.status).toBe("NOT AVAILABLE");
    if (s.status !== "NOT AVAILABLE" || !s.draft || s.draft.present !== true) throw new Error("draft summary missing");
    expect(s.draft.formalGate3).toBe("PENDING EXPERT LANDMARK APPROVAL");
    expect(s.draft.landmarkIds).toEqual(["olecranon_tip", "coronoid_tip", "ulnar_styloid", "radial_styloid", "radial_head_centre", "medial_epicondyle", "lateral_epicondyle", "third_metacarpal_head"]);
    for (const l of parsed.landmarks) expect(l.bindPose.localMeshSpace.every((v) => Number.isFinite(v)), l.landmarkId).toBe(true);
    // a draft that claims approval is refused rather than silently treated as a draft
    const claimed = landmarkStatus(null, "elbow_r", JSON.stringify({ ...parsed, approvedBy: "someone" }));
    if (claimed.status !== "NOT AVAILABLE" || !claimed.draft) throw new Error("expected NOT AVAILABLE");
    expect(claimed.draft.present).toBe(false);
  });
});

describe("box framing", () => {
  it("places every corner of an elongated box inside the frustum", async () => {
    const { Box3, PerspectiveCamera } = await import("three");
    const { shotForBox } = await import("../../src/engine/camera/framing");
    const box = new Box3(new Vector3(-0.05, 0.6, -0.1), new Vector3(0.1, 1.45, 0.3));
    for (const aspect of [0.6, 1, 1.8]) {
      const cam = new PerspectiveCamera(32, aspect, 0.01, 20);
      const shot = shotForBox(box, new Vector3(-0.9, 0.2, 0.4), new Vector3(0, 1, 0), 32, aspect, 1.05);
      cam.position.copy(shot.position);
      cam.lookAt(shot.target);
      cam.updateMatrixWorld(true);
      let worst = 0;
      for (let i = 0; i < 8; i++) {
        const c = new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(cam);
        worst = Math.max(worst, Math.abs(c.x), Math.abs(c.y));
      }
      expect(worst).toBeLessThanOrEqual(1);
      expect(worst).toBeGreaterThan(0.85);
    }
  });
});
