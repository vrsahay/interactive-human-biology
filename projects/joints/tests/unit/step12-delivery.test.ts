import { beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CubeUVReflectionMapping, DataUtils, HalfFloatType } from "three";
import type { AssetLoader } from "../../src/engine/assets/AssetLoader";
import { BodyLayer, checkBodyManifest, type BodyManifest } from "../../src/engine/body/BodyLayer";
import { SITE_SCALE_M } from "../../src/engine/camera/CameraDirector";
import { RenderLoop } from "../../src/engine/core/RenderLoop";
import { QUALITY_SETTINGS, resolveQualityTier, selectQualityTier, type DeviceSignals } from "../../src/engine/quality/qualityTier";
import { cubeUvTexture, decodeRgbeToHalfFloat } from "../../src/engine/rendering/bakedEnvironment";
import { Highlighter } from "../../src/engine/rendering/Highlighter";
import { shotAssetNeeds } from "../../src/engine/video/assetNeeds";
import { validateVideoLesson } from "../../src/engine/video/validateVideoLesson";
import { PRELOAD_LOOKAHEAD_MS, VideoTimeline } from "../../src/engine/video/VideoTimeline";
import type { Shot, VideoLesson, VideoLocale } from "../../src/engine/video/videoTypes";
import { FakeVideoRuntime } from "../helpers/fakeVideoRuntime";
import { BODY_DIR, ROOT, bodyFileLoader, loadBodyFile, productionBodyManifest, productionManifest } from "../helpers/production";

const joint = productionManifest();
const body = productionBodyManifest() as BodyManifest;
const lesson = (): VideoLesson => JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8"));
const locale = (): VideoLocale => JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8"));
const shots = (l = lesson()) => l.chapters.flatMap((c) => c.shots);
const shot = (id: string, l = lesson()): Shot => shots(l).find((s) => s.id === id)!;

describe("quality tiers (selected before any body download, deterministic)", () => {
  const laptop: DeviceSignals = { deviceMemoryGB: 8, hardwareConcurrency: 8, webgl2: true, maxTextureSize: 16384, gpuRenderer: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)", screenShortSideCss: 900, devicePixelRatio: 1.25, coarsePointer: false, saveData: false, effectiveType: "4g" };
  const phone: DeviceSignals = { deviceMemoryGB: 4, hardwareConcurrency: 8, webgl2: true, maxTextureSize: 8192, gpuRenderer: "Adreno (TM) 642L", screenShortSideCss: 412, devicePixelRatio: 2.625, coarsePointer: true, saveData: false, effectiveType: "4g" };
  const ipad: DeviceSignals = { deviceMemoryGB: null, hardwareConcurrency: 8, webgl2: true, maxTextureSize: 16384, gpuRenderer: "Apple GPU", screenShortSideCss: 820, devicePixelRatio: 2, coarsePointer: true, saveData: null, effectiveType: null };

  it("desktop -> high, phone and tablet -> medium, constrained -> low", () => {
    expect(selectQualityTier(laptop).tier).toBe("high");
    expect(selectQualityTier(phone).tier).toBe("medium");
    expect(selectQualityTier(ipad).tier).toBe("medium");
    for (const bad of [{ webgl2: false }, { gpuRenderer: "Google SwiftShader" }, { deviceMemoryGB: 2 }, { hardwareConcurrency: 2 }, { saveData: true }, { effectiveType: "3g" }, { maxTextureSize: 2048 }] as Partial<DeviceSignals>[]) {
      expect(selectQualityTier({ ...phone, ...bad }).tier, JSON.stringify(bad)).toBe("low");
    }
  });

  it("missing signals never promote to high; the same signals always give the same tier", () => {
    expect(selectQualityTier({ ...laptop, hardwareConcurrency: null }).tier).toBe("medium");
    expect(selectQualityTier({ ...laptop, deviceMemoryGB: null }).tier).toBe("high");
    expect(selectQualityTier({ ...laptop, deviceMemoryGB: 4 }).tier).toBe("medium");
    for (let i = 0; i < 5; i++) expect(selectQualityTier(phone)).toEqual(selectQualityTier(phone));
  });

  it("URL override > saved setting > automatic; invalid values are ignored", () => {
    expect(resolveQualityTier(phone, "high", "low")).toMatchObject({ tier: "high", source: "override" });
    expect(resolveQualityTier(phone, null, "low")).toMatchObject({ tier: "low", source: "override" });
    expect(resolveQualityTier(phone, "ultra", null)).toMatchObject({ tier: "medium", source: "auto" });
    expect(QUALITY_SETTINGS.high.maxPixelRatio).toBeGreaterThan(QUALITY_SETTINGS.medium.maxPixelRatio);
    expect(QUALITY_SETTINGS.low.maxPixelRatio).toBe(1);
    for (const t of ["high", "medium", "low"] as const) expect(body.tiers[QUALITY_SETTINGS[t].bodyTier]).toBeDefined();
  });
});

describe("body delivery manifest (promoted v3)", () => {
  it("passes structural checks; files on disk match bytes + sha256", () => {
    expect(checkBodyManifest(body)).toEqual([]);
    for (const f of Object.values(body.files)) {
      const bytes = readFileSync(join(BODY_DIR, f.url));
      expect(bytes.byteLength, f.url).toBe(f.bytes);
      expect(createHash("sha256").update(bytes).digest("hex"), f.url).toBe(f.sha256);
    }
    const lib = readFileSync(join(BODY_DIR, body.materialLibrary.url));
    expect(createHash("sha256").update(lib).digest("hex")).toBe(body.materialLibrary.sha256);
  });

  it("first stage = delivery-only proxy (2 draw calls) for every tier; close-up anatomy ends at LOD0 in every tier", () => {
    expect(body.groups.length).toBeLessThanOrEqual(40);
    expect(body.structures.length).toBe(535);
    for (const tier of ["high", "medium", "low"] as const) {
      const first = body.tiers[tier].stages[0].files.map((f) => body.files[f]);
      expect(first.every((f) => f.proxy), tier).toBe(true);
      expect(first.length).toBe(2);
      expect(first.reduce((a, f) => a + f.bytes, 0)).toBeLessThan(260_000);
      const final = new Map<string, number>();
      for (const st of body.tiers[tier].stages) for (const f of st.files) for (const g of body.files[f].groups) final.set(g, body.files[f].lod);
      for (const g of body.groups.filter((x) => x.output === "skeleton" && x.closeup)) expect(final.get(g.groupId), `${tier} ${g.groupId}`).toBe(0);
    }
    // LOW keeps context structures at LOD1; HIGH/MEDIUM upgrade everything skeletal to LOD0
    expect(body.tiers.low.stages.flatMap((s) => s.files)).toContain("context_lod1");
    expect(body.tiers.low.stages.flatMap((s) => s.files)).not.toContain("context");
    expect(body.tiers.medium.stages.flatMap((s) => s.files)).toContain("context");
  });

  it("detects broken manifests (partition, tier coverage, close-up LOD, proxy stage)", () => {
    const clone = () => JSON.parse(JSON.stringify(body)) as BodyManifest;
    const a = clone();
    a.groups[0].structureIds.push(a.groups[1].structureIds[0]);
    expect(checkBodyManifest(a).some((p) => /is in groups/.test(p))).toBe(true);
    const b = clone();
    b.tiers.medium.stages[1].files = ["skin_lod1"];
    expect(checkBodyManifest(b).some((p) => /never reaches LOD0|first group stage must deliver every group/.test(p))).toBe(true);
    const c = clone();
    c.tiers.low.stages[0].files = ["skin_intro"];
    expect(checkBodyManifest(c).some((p) => /proxy stage must show the whole skeleton/.test(p))).toBe(true);
  });

  it("close-up spheres cover every close shot in the lesson (>= 1.6 x the site framing radius)", () => {
    const radius = new Map(((body as unknown as { closeupSites: { siteId: string; radiusM: number }[] }).closeupSites).map((c) => [c.siteId, c.radiusM]));
    for (const s of shots().filter((x) => x.camera.preset === "site")) {
      const r = SITE_SCALE_M * Math.max(s.camera.scale, s.camera.endScale ?? s.camera.scale) * 1.6;
      expect(radius.get(s.camera.site!), s.id).toBeGreaterThanOrEqual(r);
    }
    expect(radius.get("hinge.elbow_right")).toBeGreaterThanOrEqual(0.4);
  });
});

describe("body layer staged delivery (proxy first, groups at a shot boundary)", () => {
  const make = async (tier: "medium" | "low") => {
    const loader = bodyFileLoader();
    const layer = new BodyLayer(loader as unknown as AssetLoader, new Highlighter(), () => undefined);
    const compiled: number[] = [];
    layer.prepareHook = async (meshes) => void compiled.push(meshes.length);
    const scenes: Record<string, Awaited<ReturnType<typeof loadBodyFile>>> = {};
    for (const f of body.tiers[tier].stages[0].files) scenes[f] = await loadBodyFile(f);
    layer.bindParsed(body, tier, null, scenes);
    return { layer, loader, compiled };
  };

  it("proxy first frame supports only the plain full-body presentation; groups are compiled, then applied on request", async () => {
    const { layer, loader, compiled } = await make("medium");
    expect(layer.showingProxy).toBe(true);
    expect(layer.groupCount).toBe(2);
    expect(layer.lodOf("body.frontal_bone")).toBe(2);
    expect(layer.stageStatus("intro")).toBe("applied");
    layer.present({ visible: true, highlight: [], dimOthers: false, shell: true });
    expect(layer.presentationOf("body.femur_right")).toBe("normal");
    expect(() => layer.present({ visible: true, highlight: layer.resolve(["region:skull"]), dimOthers: true, shell: false })).toThrow(/needs the grouped representation/);
    await layer.ensureStage("groups");
    expect(loader.requested.sort()).toEqual(["body-materials.glb", "body.closeup.glb", "body.context.glb", "body.skin_lod1.glb"]);
    expect(compiled.length).toBe(1); // shader programs compiled before the stage counts as ready
    expect(layer.stageStatus("groups")).toBe("ready");
    expect(layer.showingProxy).toBe(true); // nothing swapped yet
    const applied = layer.applyPending();
    expect(applied.length).toBe(body.groups.length);
    expect(layer.showingProxy).toBe(false);
    expect(layer.lodOf("body.frontal_bone")).toBe(0);
    expect(layer.lodOf("body.fifth_metatarsal_bone_left")).toBe(0);
    layer.present({ visible: true, highlight: layer.resolve(["region:skull"]), dimOthers: true, shell: false });
    expect(layer.presentationOf("body.frontal_bone")).toBe("highlight");
    expect(layer.meshList((id) => id === "body.frontal_bone")[0].visible).toBe(true);
    await layer.ensureStage("groups");
    expect(loader.requested.length).toBe(4);
  });

  it("LOW downloads context at LOD1 only; context structures stay at LOD1", async () => {
    const { layer, loader } = await make("low");
    await layer.ensureStage("groups");
    layer.applyPending();
    expect(loader.requested.sort()).toEqual(["body-materials.glb", "body.closeup.glb", "body.context_lod1.glb", "body.skin_lod1.glb"]);
    const context = body.structures.find((s) => s.output === "skeleton" && !s.closeup)!;
    expect(layer.lodOf(context.structureId)).toBe(1);
    expect(layer.lodOf("body.humerus_right")).toBe(0);
  });

  it("presentation that would split a render group is refused (no silent approximation)", async () => {
    const { layer } = await make("medium");
    await layer.ensureStage("groups");
    layer.applyPending();
    expect(() => layer.present({ visible: true, highlight: ["body.frontal_bone"], dimOthers: true, shell: false })).toThrow(/splits render group/);
    expect(() => layer.handOver(["Scaphoid bone | Right"], true)).toThrow(/splits render group/);
  });
});

describe("lesson <-> render groups and asset needs", () => {
  it("the lesson validates against the delivery manifest; a group-splitting highlight is reported", () => {
    expect(validateVideoLesson(lesson(), locale(), joint, body).problems).toEqual([]);
    const l = lesson();
    shot("fixed.name", l).body.highlight = ["body.frontal_bone"];
    expect(validateVideoLesson(l, locale(), joint, body).problems.some((p) => /fixed.name.body.highlight: splits body render group/.test(p))).toBe(true);
  });

  it("maps shots to the assets they need: only the plain full-body title can use the proxy", () => {
    const stages = body.tiers.medium.stages;
    expect(shotAssetNeeds(shot("intro.title"), joint, stages)).toEqual({ bodyStages: [], joint: false, jointTiers: [] });
    expect(shotAssetNeeds(shot("intro.map"), joint, stages)).toEqual({ bodyStages: ["groups"], joint: false, jointTiers: [] });
    expect(shotAssetNeeds(shot("map.all"), joint, stages)).toEqual({ bodyStages: ["groups"], joint: false, jointTiers: [] });
    expect(shotAssetNeeds(shot("fixed.name"), joint, stages)).toEqual({ bodyStages: ["groups"], joint: false, jointTiers: [] });
    expect(shotAssetNeeds(shot("hinge.bones"), joint, stages)).toMatchObject({ bodyStages: ["groups"], joint: true });
    expect(shotAssetNeeds(shot("hinge.support"), joint, stages).jointTiers).toContain("detail");
    for (const s of shots()) expect(shotAssetNeeds(s, joint, stages).jointTiers, s.id).not.toContain("context");
  });
});

describe("timeline buffering (assets arrive while the film waits)", () => {
  const make = () => {
    const rt = new FakeVideoRuntime(joint);
    return { rt, tl: new VideoTimeline(lesson(), rt) };
  };
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it("seeking to a shot whose assets are missing buffers, then reconstructs it when they arrive", async () => {
    const { rt, tl } = make();
    tl.start(0);
    rt.needAssets("hinge.bones");
    rt.applied = [];
    const e = tl.entries.find((x) => x.shot.id === "hinge.bones")!;
    tl.seek(e.startMs + 1000);
    expect(tl.state).toMatchObject({ shotId: "hinge.bones", buffering: true });
    expect(rt.applied).toEqual([]);
    rt.waiting.get("hinge.bones")!.resolve();
    await flush();
    expect(tl.state.buffering).toBe(false);
    expect(rt.applied).toEqual([{ id: "hinge.bones", cut: true }]);
  });

  it("playing into a shot that is not ready holds the previous shot's last frame (clock frozen) and continues after", async () => {
    const { rt, tl } = make();
    const prev = tl.entries.find((x) => x.shot.id === "hinge.source")!;
    tl.seek(prev.endMs - 300);
    rt.needAssets("hinge.bones");
    tl.play();
    rt.run(1000);
    expect(tl.state).toMatchObject({ shotId: "hinge.source", buffering: true });
    const held = tl.state.timeMs;
    rt.run(2000);
    expect(tl.state.timeMs).toBe(held);
    expect(rt.applied.at(-1)?.id).toBe("hinge.source");
    rt.waiting.get("hinge.bones")!.resolve();
    await flush();
    expect(tl.state).toMatchObject({ shotId: "hinge.bones", buffering: false });
    rt.run(500);
    expect(tl.state.timeMs).toBeGreaterThan(held);
  });

  it("a stale wait never overrides a later seek; a failed download stops buffering with an error", async () => {
    const { rt, tl } = make();
    rt.needAssets("hinge.bones");
    tl.seek(tl.entries.find((x) => x.shot.id === "hinge.bones")!.startMs);
    tl.seekChapter(2);
    rt.applied = [];
    rt.waiting.get("hinge.bones")!.resolve();
    await flush();
    expect(rt.applied).toEqual([]);
    expect(tl.state).toMatchObject({ chapterId: "fixed", buffering: false });
    rt.needAssets("hinge.check");
    tl.play();
    tl.seek(tl.entries.find((x) => x.shot.id === "hinge.check")!.startMs);
    rt.waiting.get("hinge.check")!.reject(new Error("network down"));
    await flush();
    expect(tl.state).toMatchObject({ buffering: false, loadError: "network down", playing: false });
  });

  it("preloads the assets of shots starting within the lookahead window", () => {
    const { rt, tl } = make();
    tl.start(0);
    const first = rt.preloaded.at(-1)!;
    expect(first).toContain("intro.title");
    expect(first).toContain("hook.shoulder");
    const late = tl.entries.filter((e) => e.startMs > PRELOAD_LOOKAHEAD_MS).map((e) => e.shot.id);
    for (const id of late) expect(first).not.toContain(id);
    tl.preloadChapter(5);
    expect(rt.preloaded.at(-1)).toContain("hinge.bones");
  });
});

describe("baked environment", () => {
  it("RGBE decode is exact to the bake formula; the production variant matches its manifest", () => {
    const px = new Uint8Array([128, 64, 32, 129, 0, 0, 0, 0]);
    const half = decodeRgbeToHalfFloat(px, 2, 1);
    expect(DataUtils.fromHalfFloat(half[0])).toBeCloseTo(((128.5) / 256) * 2, 3);
    expect(DataUtils.fromHalfFloat(half[1])).toBeCloseTo(((64.5) / 256) * 2, 3);
    expect(DataUtils.fromHalfFloat(half[4])).toBe(0);
    expect(DataUtils.fromHalfFloat(half[7])).toBe(1);
    const env = JSON.parse(readFileSync(join(ROOT, "public/assets/shared/env/environment.json"), "utf8"));
    expect(env.variants.map((v: { size: number }) => v.size)).toEqual([64]);
    const v = env.variants[0];
    const bytes = readFileSync(join(ROOT, "public/assets/shared/env", v.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(v.sha256);
    const tex = cubeUvTexture(decodeRgbeToHalfFloat(new Uint8Array(bytes), v.width, v.height), v.width, v.height);
    expect(tex.mapping).toBe(CubeUVReflectionMapping);
    expect(tex.type).toBe(HalfFloatType);
    expect(v.height).toBe(256);
    expect(v.width).toBe(3 * Math.max(64, 112));
  });
});

describe("render loop hold (first frame waits for parallel shader compilation)", () => {
  it("requests while suspended are remembered and rendered once on resume", () => {
    const frames: number[] = [];
    const queued: FrameRequestCallback[] = [];
    const loop = new RenderLoop(() => frames.push(1), (cb) => queued.push(cb));
    loop.suspend();
    loop.requestRender();
    loop.requestRender();
    expect(queued.length).toBe(0);
    expect(loop.idle).toBe(false);
    loop.resume();
    expect(queued.length).toBe(1);
    queued.shift()!(16);
    expect(frames.length).toBe(1);
    expect(loop.idle).toBe(true);
  });
});

beforeAll(() => {
  expect(body.kind).toBe("body_delivery");
});
