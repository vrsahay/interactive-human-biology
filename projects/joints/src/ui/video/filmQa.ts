import { Box3, Vector3 } from "three";
import { SITE_SCALE_M } from "../../engine/camera/CameraDirector";
import type { App } from "../../engine/core/App";
import type { AppVideoRuntime } from "../../engine/video/AppVideoRuntime";
import type { NarrationPlayer } from "../../engine/video/NarrationPlayer";
import type { VideoTimeline } from "../../engine/video/VideoTimeline";

export { installQaApi } from "../../engine/qa/qaApi";

/** QA hooks (?qa=1): read timeline state and drive the same timeline the UI uses. */
export function installFilmQa(timeline: VideoTimeline, app: App, report: unknown, runtime: AppVideoRuntime, narrator?: NarrationPlayer): void {
  (globalThis as unknown as { __jointsFilm: unknown }).__jointsFilm = {
    state: () => timeline.state,
    narration: () => narrator?.diagnostics() ?? null,
    // Step 14 explore hooks: drive an exploration exactly as the UI does.
    explores: () => (timeline.lesson.explores ?? []).map((e) => ({ exploreId: e.exploreId, chapterId: e.chapterId, jointType: e.jointType, status: e.status, site: e.site, kind: e.motion.kind, instructionKey: e.instructionKey, titleKey: e.titleKey })),
    openExplore: async (exploreId: string) => {
      const config = (timeline.lesson.explores ?? []).find((e) => e.exploreId === exploreId);
      if (!config) throw new Error(`unknown explore ${exploreId}`);
      timeline.pause();
      await runtime.openExplore(config);
      return exploreId;
    },
    closeExplore: () => runtime.closeExplore(timeline.entries[timeline.state.shotIndex].shot),
    exploreState: () => {
      const s = runtime.exploreSession;
      if (!s) return null;
      return { exploreId: s.config.exploreId, status: s.config.status, teaching: s.isTeachingSimulation, dofId: s.dofId, readout: s.readout(), displacedGroups: app.body!.displacedGroups };
    },
    exploreDrag: (dx: number, dy: number) => runtime.exploreSession?.drag(dx, dy),
    exploreStep: (n: number, m = 0) => runtime.exploreSession?.step(n, m),
    exploreReset: () => runtime.exploreSession?.reset(),
    narrationClip: (shotId: string) => narrator?.clip(shotId) ?? null,
    narrationCue: (key: string) => narrator?.cue(key) ?? null,
    chapters: () => timeline.lesson.chapters.map((c) => ({ id: c.id, number: c.number, titleKey: c.titleKey, shots: c.shots.map((x) => x.id) })),
    recall: () => (timeline.lesson.recall ? { chapterId: timeline.lesson.recall.chapterId, shotId: timeline.lesson.recall.shotId ?? null, steps: timeline.lesson.recall.steps.map((x) => ({ stepId: x.stepId, questionKey: x.questionKey, revealKey: x.revealKey, answer: x.answer })) } : null),
    setNarration: (on: boolean) => narrator?.setEnabled(on),
    report: () => report,
    entries: () => timeline.entries.map((e) => ({ id: e.shot.id, chapterIndex: e.chapterIndex, startMs: e.startMs, endMs: e.endMs })),
    play: () => timeline.play(),
    pause: () => timeline.pause(),
    seek: (ms: number) => timeline.seek(ms),
    seekShot: (id: string, offsetMs = 0) => {
      const e = timeline.entries.find((x) => x.shot.id === id);
      if (!e) throw new Error(`unknown shot ${id}`);
      timeline.seek(e.startMs + offsetMs);
    },
    seekChapter: (i: number) => timeline.seekChapter(i),
    replay: () => timeline.replay(),
    reset: () => timeline.reset(),
    resume: () => timeline.resume(),
    tick: (ms: number) => timeline.tick(ms),
    explore: (on: boolean) => timeline.setExplore(on),
    answerCheck: () => timeline.answerCheck(),
    camera: () => ({ position: app.stage.camera.position.toArray(), target: app.controls.target.toArray(), mode: app.director.mode, preset: app.director.currentPreset }),
    body: () => ({
      visible: app.body!.visibleStructureIds().length,
      shell: app.body!.shellVisible,
      handedOver: app.body!.handedOverIds,
      presentation: (id: string) => app.body!.presentationOf(id),
      highlighted: app.body!.structureIds().filter((id) => app.body!.presentationOf(id) === "highlight"),
    }),
    presentation: (id: string) => app.body!.presentationOf(id),
    concepts: () => app.concepts!.visibleSites(),
    siteLabels: () => [...app.siteLabels.entries()],
    jointVisible: () => app.structures.all().filter((e) => app.isStructureVisible(e)).map((e) => e.structureId),
    interaction: () => app.interactionPolicy,
    quality: () => app.quality,
    bodyDelivery: () => ({ tier: app.body!.tier, groups: app.body!.groupCount, stages: app.body!.stages().map((s) => ({ stageId: s.stageId, status: app.body!.stageStatus(s.stageId) })), lod: (id: string) => app.body!.lodOf(id) }),
    jointAttached: () => app.jointAttached,
    labelStats: () => ({ layouts: app.labels.layouts, skipped: app.labels.skippedLayouts }),
    textures: () => ({ gpuTextures: app.stage.renderer.info.memory.textures, unique: app.assets.textures.unique, deduplicated: app.assets.textures.deduplicated }),
    manifestValidation: () => app.manifestValidation,
    bodyUpgrades: () => runtime.bodyUpgrades.map((u) => ({ atShot: u.atShot, groups: u.groups })),
    conceptPhase: (siteId: string) => app.concepts!.phaseOf(siteId),
    /** World bounding box of a joint-asset structure at the current pose (handover alignment checks). */
    jointBox: (id: string) => {
      const b = app.worldBBox(id);
      return { min: b.min.toArray(), max: b.max.toArray() };
    },
    bodyBox: (id: string) => app.body!.structure(id)?.bbox ?? null,
    /**
     * Live world state of every render group (Step 16C): world matrix + world bounding box, measured from the scene
     * graph. This is what the Explore isolation invariant compares before and after an interaction.
     */
    bodyGroupWorldState: () => app.body!.groupWorldState(),
    /** Is the camera free to orbit? False while an exploration owns the pointer (Step 16C). */
    orbitEnabled: () => app.controls.enabled,
    orbitLocked: () => app.isOrbitLocked,
    /** Which render group each of these body structures belongs to (QA: "did this bone move?"). */
    groupOfStructure: (ids: string[]) => Object.fromEntries(ids.map((id) => [id, app.body!.structure(id)?.groupId ?? null])),
    /**
     * Screen-space extent of some body structures as a fraction of the viewport, with how much of them is off frame.
     * QA only: it answers "is the thing this sentence is about actually readable in this framing?".
     */
    bodyScreenBounds: (ids: string[]) => {
      const rect = app.stage.renderer.domElement.getBoundingClientRect();
      const camera = app.stage.camera;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, corners = 0, offscreen = 0;
      for (const id of ids) {
        const box = app.body!.structure(id)?.bbox;
        if (!box) continue;
        for (const x of [box.min[0], box.max[0]]) for (const y of [box.min[1], box.max[1]]) for (const z of [box.min[2], box.max[2]]) {
          const v = new Vector3(x, y, z).project(camera);
          corners++;
          if (Math.abs(v.x) > 1 || Math.abs(v.y) > 1) offscreen++;
          const px = (v.x * 0.5 + 0.5) * rect.width;
          const py = (-v.y * 0.5 + 0.5) * rect.height;
          minX = Math.min(minX, px); maxX = Math.max(maxX, px);
          minY = Math.min(minY, py); maxY = Math.max(maxY, py);
        }
      }
      return corners ? { width: (maxX - minX) / rect.width, height: (maxY - minY) / rect.height, corners, offscreen } : null;
    },
    /** Where a body joint site lands on screen, and whether it is in frame at all. */
    siteOnScreen: (siteId: string) => {
      const site = app.body!.manifest.jointSites.find((s: { siteId: string }) => s.siteId === siteId);
      if (!site) return null;
      const rect = app.stage.renderer.domElement.getBoundingClientRect();
      const v = new Vector3(...(site.anchor as [number, number, number])).project(app.stage.camera);
      return { x: (v.x * 0.5 + 0.5) * rect.width, y: (-v.y * 0.5 + 0.5) * rect.height, inView: Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 };
    },
    /**
     * Step 16E: where the exploration's target lands on screen - the projected box of the parts the learner moves (the
     * declared render groups, or the validated joint asset), in CSS pixels. QA only: it answers "can the learner see
     * what they are being asked to move, and is anything drawn over it?".
     */
    exploreTarget: () => {
      const s = runtime.exploreSession;
      if (!s) return null;
      const rect = app.stage.renderer.domElement.getBoundingClientRect();
      const camera = app.stage.camera;
      const toScreen = (p: Vector3) => {
        const v = p.clone().project(camera);
        return { x: rect.left + (v.x * 0.5 + 0.5) * rect.width, y: rect.top + (-v.y * 0.5 + 0.5) * rect.height };
      };
      const projectBox = (box: Box3) => {
        let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
        for (let i = 0; i < 8; i++) {
          const p = toScreen(new Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
          left = Math.min(left, p.x); right = Math.max(right, p.x); top = Math.min(top, p.y); bottom = Math.max(bottom, p.y);
        }
        return { left, top, right, bottom };
      };
      // the parts the learner moves: the declared render groups, or the moving segment of the validated joint
      const box = new Box3();
      const grip = new Box3();
      if (s.config.motion.groups.length) {
        const state = app.body!.groupWorldState();
        for (const g of s.config.motion.groups) {
          const b = state[g]?.bbox;
          if (b) box.union(new Box3(new Vector3(b[0], b[1], b[2]), new Vector3(b[3], b[4], b[5])));
        }
      } else if (app.jointAttached) {
        for (const e of app.structures.all()) {
          if (!app.isStructureVisible(e)) continue;
          box.union(app.worldBBox(e.structureId));
          // the forearm is what the elbow's own drag gesture picks up
          if (e.structureId === "radius_r" || e.structureId === "ulna_r") grip.union(app.worldBBox(e.structureId));
        }
      }
      if (box.isEmpty()) return null;
      // the region the exploration is authored to show: its framing sphere around the joint site
      const site = app.body!.manifest.jointSites.find((x: { siteId: string }) => x.siteId === s.config.site) as { anchor: [number, number, number] } | undefined;
      const centre = site ? new Vector3(...site.anchor) : box.getCenter(new Vector3());
      const radiusM = SITE_SCALE_M * s.config.camera.scale;
      const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const c = toScreen(centre);
      const edge = toScreen(centre.clone().addScaledVector(up, radiusM));
      const radiusPx = Math.hypot(edge.x - c.x, edge.y - c.y);
      const t = projectBox(box);
      // the target, inside the framed region, inside the viewport: what the learner is meant to see and grab
      const region = {
        left: Math.max(t.left, c.x - radiusPx, rect.left), top: Math.max(t.top, c.y - radiusPx, rect.top),
        right: Math.min(t.right, c.x + radiusPx, rect.right), bottom: Math.min(t.bottom, c.y + radiusPx, rect.bottom),
      };
      const g = grip.isEmpty() ? c : toScreen(grip.getCenter(new Vector3()));
      const r = (o: { left: number; top: number; right: number; bottom: number }) => ({ left: Math.round(o.left), top: Math.round(o.top), right: Math.round(o.right), bottom: Math.round(o.bottom) });
      return {
        ...r(t), heightFrac: (t.bottom - t.top) / rect.height, widthFrac: (t.right - t.left) / rect.width,
        region: r(region),
        framed: { x: Math.round(c.x), y: Math.round(c.y), radius: Math.round(radiusPx) },
        grip: { x: Math.round(g.x), y: Math.round(g.y) },
        viewport: { width: Math.round(rect.width), height: Math.round(rect.height) },
      };
    },
    /** The composition in force: horizontal shift and the reserved bottom band, as fractions of the stage. */
    compose: () => runtime.composition,
    /** The rectangle the label layout currently keeps labels out from under (a panel, or the topic heading). */
    labelReserved: () => app.labels.reserved,
    preloadChapter: (i: number) => timeline.preloadChapter(i),
  };
}
