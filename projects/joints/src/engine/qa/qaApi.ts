import { Box3, Frustum, Matrix4, Vector3, type Line, type Mesh, type Object3D, type Points } from "three";
import type { App } from "../core/App";
import { HingeJoint } from "../joints/HingeJoint";
import type { PoseSample, V3 } from "./poseCompare";

/** Development/QA hooks (enabled with ?qa=1). Read-mostly; pose changes still go through setDof. */
export function installQaApi(app: App): void {
  const toArr = (v: Vector3): V3 => [v.x, v.y, v.z];
  const project = (world: Vector3) => {
    const rect = app.stage.renderer.domElement.getBoundingClientRect();
    const n = world.clone().project(app.stage.camera);
    return { x: rect.left + (n.x * 0.5 + 0.5) * rect.width, y: rect.top + (-n.y * 0.5 + 0.5) * rect.height, inView: n.z > -1 && n.z < 1 && Math.abs(n.x) <= 1 && Math.abs(n.y) <= 1 };
  };
  const api = {
    get status() {
      return app.status;
    },
    idle: () => app.loop.idle,
    renderNow: () => new Promise<void>((resolve) => {
      app.loop.requestRender();
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }),
    joint: () => ({ jointId: app.joint.jointId, jointType: app.joint.jointType, dofs: app.joint.dofs.map((d) => ({ id: d.id, min: d.min, max: d.max, neutral: d.neutral, axis: d.axisToken, rangeStatus: d.rangeStatus })), pose: app.joint.currentPose(), binding: app.joint instanceof HingeJoint ? app.joint.binding : null }),
    setDof: (dofId: string, value: number) => app.setDof(dofId, value, "api"),
    // null while the film has not attached the deferred joint asset yet
    getDof: (dofId: string) => (app.jointAttached ? app.joint.getDof(dofId) : null),
    poseUpdates: () => app.poseUpdates,
    counts: () => ({ structures: app.structures.size, anchors: app.anchors.size, tiers: [...app.loadedTiers], attached: app.attachLog.length, labels: app.labels.ids().length }),
    registry: () => app.structures.all().map((e) => ({ structureId: e.structureId, tier: e.spec.tier, role: e.spec.role, meshes: e.meshes.length, meshName: e.meshes[0]?.name, visible: app.isStructureVisible(e), driven: app.manifest.isDriven(e.structureId) })),
    rigNodes: () => ({ controller: app.structures.node(app.manifest.controller.node)?.userData.role ?? null, pivot: app.structures.node(app.manifest.pivot.node)?.userData.role ?? null }),
    sample: (): PoseSample => {
      const joint = app.joint;
      const anchors: Record<string, V3> = {};
      for (const a of app.anchors.all()) anchors[a.anchorId] = toArr(app.anchors.worldPosition(a.anchorId));
      const structures: PoseSample["structures"] = {};
      for (const e of app.structures.all()) {
        e.node.updateWorldMatrix(true, false);
        const box = new Box3().setFromObject(e.meshes[0], true);
        structures[e.structureId] = { worldMatrix: e.node.matrixWorld.toArray(), worldBBox: { min: toArr(box.min), max: toArr(box.max) } };
      }
      return { flexionDeg: joint.getDof(joint.dofs[0].id), anchors, structures };
    },
    hinge: () => {
      const j = app.joint;
      if (!(j instanceof HingeJoint)) return null;
      const angle = j.angle;
      return { pivot: toArr(j.pivotWorld()), axis: toArr(j.axisWorld()), direction: toArr(j.directionAtWorld(angle)), overlayDirection: app.axisOverlay ? toArr(app.axisOverlay.currentDirectionWorld()) : null, overlayAngle: app.axisOverlay?.currentAngle ?? null, overlayVisible: app.axisOverlay?.visible ?? false };
    },
    bands: () => (app.bands ? app.bands.list().map((b) => {
      const e = app.bands!.endpoints(b.bandId);
      const core = b.core;
      return { bandId: b.bandId, structureId: b.structureId, contentLabel: b.contentLabel, representation: b.group.userData.representation, deformationSimulation: b.group.userData.deformationSimulation, visible: app.bands!.visible, proximal: toArr(e.proximal), distal: toArr(e.distal), meshCenter: toArr(core.position), meshLength: core.scale.y };
    }) : []),
    labels: () => app.labels.lastLayout.map((l) => ({ ...l })),
    visibleStructureIds: () => app.structures.all().filter((e) => app.isStructureVisible(e)).map((e) => e.structureId),
    selection: () => app.selection?.structureId ?? null,
    select: (id: string | null) => app.select(id),
    view: (preset: string, immediate = true) => app.view(preset, immediate),
    /** Frame a body joint site directly (QA: trying framings without rebuilding the lesson). */
    viewSite: (params: { site: string; view: string; scale: number; elevation?: number }) => app.view("site", { params: { site: params.site, bodyView: params.view as never, scale: params.scale, elevation: params.elevation }, immediate: true }),
    setLayer: (key: string, value: boolean) => app.setLayer(key as never, value as never),
    ensureTier: (tier: "detail" | "context") => app.ensureTier(tier),
    layers: () => ({ ...app.layers }),
    perf: () => app.perf.snapshot(),
    resetPerfWindow: () => app.perf.resetWindow(),
    /** Scene graph cost summary: node counts, auto-updated matrices, visible drawables (name, material, triangles, top-level parent). */
    sceneStats: () => {
      let nodes = 0;
      let autoUpdate = 0;
      const drawables: { name: string; type: string; material: string; materialId: string; triangles: number; root: string; transparent: boolean; frustumCulled: boolean; inFrustum: boolean; bounds: { c: number[]; r: number } | null; worldPos: number[] }[] = [];
      const cam = app.stage.camera;
      cam.updateMatrixWorld();
      const frustum = new Frustum().setFromProjectionMatrix(new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
      const visit = (o: Object3D, visible: boolean, root: string) => {
        nodes++;
        if (o.matrixAutoUpdate) autoUpdate++;
        const vis = visible && o.visible;
        const m = o as Mesh;
        if (vis && (m.isMesh || (o as Line).isLine || (o as Points).isPoints)) {
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          const g = m.geometry;
          const count = g.index ? g.index.count : (g.attributes.position?.count ?? 0);
          for (const mat of mats)
            if (mat.visible)
              drawables.push({
                name: o.name,
                type: o.type,
                material: `${mat.type}:${mat.name}`,
                materialId: mat.uuid.slice(0, 8),
                triangles: Math.round(count / 3),
                root,
                transparent: mat.transparent,
                frustumCulled: o.frustumCulled,
                inFrustum: frustum.intersectsObject(o),
                bounds: g.boundingSphere ? { c: g.boundingSphere.center.toArray().map((v) => Math.round(v * 1e3) / 1e3), r: Math.round(g.boundingSphere.radius * 1e3) / 1e3 } : null,
                worldPos: [m.matrixWorld.elements[12], m.matrixWorld.elements[13], m.matrixWorld.elements[14]].map((v) => Math.round(v * 1e3) / 1e3),
              });
        }
        for (const c of o.children) visit(c, vis, root);
      };
      for (const c of app.stage.scene.children) visit(c, true, c.name || c.type);
      return { nodes, autoUpdate, drawables };
    },
    /** Diagnostic only: hide/show a top-level scene root ("body", "anatomy", "overlays") to isolate render cost. */
    setRootVisible: (name: string, visible: boolean) => {
      const root = app.stage.scene.children.find((c) => c.name === name);
      if (!root) return false;
      root.visible = visible;
      app.loop.requestRender();
      return true;
    },
    project: (p: V3) => project(new Vector3(...p)),
    anchorScreen: (anchorId: string) => project(app.anchors.worldPosition(anchorId)),
    /** Screen point that picks the structure (vertex sampling + real raycast), for pointer tests. */
    findScreenPoint: (structureId: string, preferFar = false) => {
      const e = app.structures.require(structureId);
      const mesh = e.meshes[0];
      const pos = mesh.geometry.getAttribute("position");
      const rect = app.stage.renderer.domElement.getBoundingClientRect();
      const pivot = new Vector3(...app.manifest.pivot.point);
      const candidates: { x: number; y: number; d: number }[] = [];
      const v = new Vector3();
      mesh.updateWorldMatrix(true, false);
      const stride = Math.max(1, Math.floor(pos.count / 400));
      for (let i = 0; i < pos.count; i += stride) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        const s = project(v);
        if (!s.inView) continue;
        candidates.push({ x: s.x, y: s.y, d: v.distanceTo(pivot) });
      }
      candidates.sort((a, b) => (preferFar ? b.d - a.d : a.d - b.d));
      // Integer pixel whose 5x5 neighbourhood all picks the structure (robust to input rounding and silhouette edges).
      const solid = (x: number, y: number, r: number) => [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]].every(([dx, dy]) => app.picker.pick(x + dx, y + dy, rect, app.stage.camera)?.structureId === structureId);
      for (const r of [2, 1]) {
        for (const c of candidates) {
          for (const [dx, dy] of [[0, 0], [3, 0], [-3, 0], [0, 3], [0, -3]]) {
            const x = Math.round(c.x + dx);
            const y = Math.round(c.y + dy);
            if (solid(x, y, r)) return { x, y, distanceFromPivotM: c.d };
          }
        }
      }
      return null;
    },
  };
  (globalThis as unknown as { __jointsQA: typeof api }).__jointsQA = api;
}

