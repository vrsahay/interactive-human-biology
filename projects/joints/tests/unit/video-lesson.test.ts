import { beforeAll, describe, expect, it } from "vitest";
import Ajv from "ajv";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Vector3 } from "three";
import { BodyLayer, checkBodyManifest } from "../../src/engine/body/BodyLayer";
import { AssetLoader } from "../../src/engine/assets/AssetLoader";
import { interpolateShot } from "../../src/engine/camera/framing";
import { bodyViewDirection } from "../../src/engine/camera/CameraDirector";
import { Highlighter } from "../../src/engine/rendering/Highlighter";
import { lessonSchemaSha256 as schemaSha256 } from "../../src/engine/video/videoLessonSchema";
import { samplePoseKeys } from "../../src/engine/video/poseKeys";
import { resolvePoseValue, VideoLessonValidationError, assertValidVideoLesson } from "../../src/engine/video/validateVideoLesson";
import { validateVideoLessonFull as validateVideoLesson } from "../../src/engine/video/videoLessonSchema";
import { VideoTimeline } from "../../src/engine/video/VideoTimeline";
import type { Shot, VideoLesson, VideoLocale } from "../../src/engine/video/videoTypes";
import { FakeVideoRuntime } from "../helpers/fakeVideoRuntime";
import { ROOT, loadBodyFile, productionBodyManifest, productionManifest } from "../helpers/production";

const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const lesson = (): VideoLesson => JSON.parse(read("content/lessons/hinge-elbow.json"));
const locale = (): VideoLocale => JSON.parse(read("content/locales/en/hinge-elbow.json"));
const joint = productionManifest();
const body = productionBodyManifest();
const problemsOf = (mutate: (l: VideoLesson, loc: VideoLocale) => void) => {
  const l = lesson();
  const loc = locale();
  mutate(l, loc);
  return validateVideoLesson(l, loc, joint, body).problems;
};
const shotById = (l: VideoLesson, id: string): Shot => l.chapters.flatMap((c) => c.shots).find((s) => s.id === id)!;
const SOURCE = "The elbow bends and straightens in one direction, similar to a door hinge.";

describe("1-2. chapter + shot loading", () => {
  it("lesson/locale pass schemas and all references; generated validator is in sync", () => {
    const schemaText = read("content/schemas/video-lesson.schema.json");
    expect(schemaSha256).toBe(createHash("sha256").update(schemaText).digest("hex"));
    expect(new Ajv({ strict: false }).compile(JSON.parse(schemaText))(lesson())).toBe(true);
    const { report } = assertValidVideoLesson(lesson(), locale(), joint, body);
    expect(report).toMatchObject({ chapters: 9, shots: 52, problems: [] });
    expect(report.durationMs).toBeGreaterThan(120_000);
  });

  it("the nine teaching beats are in order, and the four joint chapters still travel top to bottom", () => {
    const l = lesson();
    expect(l.chapters.map((c) => [c.number, c.id])).toEqual([["01", "hook"], ["02", "what_is_joint"], ["03", "fixed"], ["04", "pivot"], ["05", "ball_socket"], ["06", "hinge"], ["07", "compare"], ["08", "recall"], ["09", "body_map"]]);
    const sites = l.chapters.slice(2, 6).flatMap((c) => c.shots.map((s) => s.camera.site).filter(Boolean));
    // Step 16B: each category is taught in the same six beats, so each site repeats - the order top to bottom is what matters.
    expect([...new Set(sites)]).toEqual(["fixed.skull", "pivot.upper_neck", "ball_socket.shoulder_right", "hinge.elbow_right", "hinge.knee_right"]);
    expect(sites.filter((x) => x === "fixed.skull")).toHaveLength(6);
    expect(sites.filter((x) => x === "pivot.upper_neck")).toHaveLength(6);
    expect(sites.filter((x) => x === "ball_socket.shoulder_right")).toHaveLength(6);
    const bodyY = (site: string) => body.jointSites.find((x: { siteId: string }) => x.siteId === site).anchor[1];
    expect(bodyY("fixed.skull")).toBeGreaterThan(bodyY("pivot.upper_neck"));
    expect(bodyY("pivot.upper_neck")).toBeGreaterThan(bodyY("ball_socket.shoulder_right"));
    expect(bodyY("ball_socket.shoulder_right")).toBeGreaterThan(bodyY("hinge.elbow_right"));
    expect(bodyY("hinge.elbow_right")).toBeGreaterThan(bodyY("hinge.knee_right"));
    // opens and closes on the full body
    expect(l.chapters[0].shots[0].camera.preset).toBe("body");
    expect(l.chapters[8].shots.at(-1)!.camera.preset).toBe("body");
  });

  it("only the supplied sentence is source-backed; enrichment is draft; no invented citations", () => {
    const strings = Object.entries(locale().strings);
    const sources = strings.filter(([, s]) => s.provenance === "source-excerpt");
    expect(sources.map(([, s]) => s.text)).toEqual([SOURCE]);
    for (const [, s] of strings.filter(([, x]) => x.provenance !== "ui")) expect(s.text).not.toMatch(/NCERT says|chapter \d|page \d|\b3\.5\.\d/i);
    const hingeSource = shotById(lesson(), "hinge.source");
    expect(hingeSource.caption.textKey).toBe("source.elbow_hinge");
    const explanations = ["intro.subtitle", "intro.where", "fixed.text", "pivot.text", "ball.text.shoulder", "hinge.bones", "hinge.axis", "hinge.flexion", "hinge.extension", "hinge.range_note", "hinge.support", "hinge.bands_note", "hinge.knee", "recap.compare", "check.prompt"];
    // Step 16B: every spoken explanation is an ordinary reviewable string, and every one of them is draft
    for (const [k, v] of strings) if (k.startsWith("narr.")) expect(v.provenance, k).toBe("draft-enrichment");
    for (const k of explanations) expect(locale().strings[k].provenance, k).toBe("draft-enrichment");
    // the figure reference supplies only category names and locations
    for (const [k, s] of strings) if (s.provenance === "figure-reference") expect(k).toMatch(/title|^chapter.|label/);
    // Step 13 Phase E: the teaching range now has an external normative reference (Zwerus et al. 2019), so the note no
    // longer says "pending a cited reference". It must still present the range as approximate and must never imply that
    // every person reaches it, and the citation must state that it does not validate this model.
    const rangeNote = locale().strings["hinge.range_note"].text;
    expect(rangeNote).toMatch(/approximate/i);
    expect(rangeNote).not.toMatch(/\beveryone\b|\bexactly\b|\ball (adults|people)\b/i);
    const rom = locale().sources["elbow-rom-normative"];
    expect(rom, "the normative range reference is recorded in the locale sources").toBeTruthy();
    expect(rom.description).toMatch(/10\.1177\/1758573217728711/);
    expect(rom.description).toMatch(/does not validate/i);
    expect(rom.verifiedAgainstTextbook).toBe(false);
  });
});

describe("validation rejects broken references (no silent fallbacks)", () => {
  it("unknown body site / body ref / joint anchor / band / text key", () => {
    expect(problemsOf((l) => (shotById(l, "fixed.name").camera.site = "fixed.jaw"))).toContain("shot fixed.name: camera site fixed.jaw is not a body joint site");
    expect(problemsOf((l) => shotById(l, "pivot.travel").body.highlight.push("region:tail"))).toContain("shot pivot.travel.body.highlight: unknown body region region:tail");
    expect(problemsOf((l) => shotById(l, "hinge.bones").labels.anchors.push("elbow_r.anchor.kneecap"))).toContain("shot hinge.bones.labels: unknown anchorId elbow_r.anchor.kneecap");
    expect(problemsOf((l) => shotById(l, "hinge.support").overlays.bands.push("elbow_r.band.patellar"))).toContain("shot hinge.support: unknown bandId elbow_r.band.patellar");
    expect(problemsOf((_l, loc) => delete (loc.strings as Record<string, unknown>)["hinge.flexion"])).toContain("shot hinge.flexion: missing text key hinge.flexion");
  });

  it("poses outside controller limits, unordered keys, and non-seekable first keys", () => {
    expect(problemsOf((l) => (shotById(l, "hinge.extension").joint.poseKeys[2].pose.flexion = 160))).toContain("shot hinge.extension.poseKeys[2]: flexion=160 outside controller limits 0..145");
    expect(problemsOf((l) => (shotById(l, "hinge.flexion").joint.poseKeys[2].atMs = 100))).toContain("shot hinge.flexion.poseKeys[2]: keys must be in time order");
    expect(problemsOf((l) => (shotById(l, "hinge.flexion").joint.poseKeys[0].atMs = 300))).toContain("shot hinge.flexion: first pose key must be at 0 ms (seekable state)");
  });

  it("context rules: no static anatomy while posed, no skin shell with the joint asset, handover required", () => {
    expect(problemsOf((l) => (shotById(l, "hinge.support").joint.poseKeys.push({ atMs: 5000, pose: { flexion: 60 }, ease: "easeInOutCubic" }))).some((p) => /static anatomy/.test(p))).toBe(true);
    expect(problemsOf((l) => (shotById(l, "hinge.bones").body.shell = true))).toContain("shot hinge.bones: skin shell cannot be shown with the posed joint asset");
    expect(problemsOf((l) => (shotById(l, "hinge.bones").joint.handOver = false))).toContain("shot hinge.bones: joint asset shown over the body without handOver (duplicate anatomy)");
    expect(problemsOf((l) => (shotById(l, "fixed.name").overlays.arc = true))).toContain("shot fixed.name: joint motion overlays need the joint asset visible");
  });

  // Step 13 Phase B item 11 / Phase F: the skull, pivot, ball-and-socket and knee indicators are schematic, so a learner
  // must never see one without being told. The elbow is the only joint driven by a validated rig.
  // Step 13 established that a learner must never see a schematic indicator without being told what it is. Step 15B
  // changed WHERE that is said, not whether: the persistent on-stage status covers every shot that shows indicators
  // (FilmShell renders it from overlays.concepts, and tests/e2e/step15b-clarity.spec.ts checks it on the real build),
  // so the reviewer-language note no longer sits under every caption. This test holds the content side of that:
  // indicators are still declared per shot, and no repeated technical disclaimer has crept back into the captions.
  it("content honesty: indicators are declared per shot, and no technical disclaimer repeats in the captions", () => {
    const l = lesson();
    const loc = locale();
    const shots = l.chapters.flatMap((c) => c.shots);
    const withConcepts = shots.filter((s) => s.overlays.concepts.length > 0);
    expect(withConcepts.length, "the lesson still declares which shots show schematic indicators").toBeGreaterThan(10);

    // the persistent status string exists and says what the marks are, in words a Class 10 learner has
    const status = loc.strings["ui.teaching_view"];
    expect(status, "the persistent teaching status must exist").toBeTruthy();
    expect(status.text.toLowerCase()).toContain("movement");
    expect(status.text.split(/s+/).length, "the persistent status stays short").toBeLessThanOrEqual(14);

    // the two reviewer-language notes are retained for the sources dialog and the expert package...
    for (const k of ["note.schematic_indicator", "note.recap_schematic"]) expect(loc.strings[k], k).toBeTruthy();
    // ...and are no longer attached to any caption
    const repeated = shots.filter((s) => s.caption.noteKey === "note.schematic_indicator" || s.caption.noteKey === "note.recap_schematic");
    expect(repeated.map((s) => s.id), "reviewer-language disclaimers must not sit under captions").toEqual([]);

    // the notes that remain are one-off clarifications about something specific on screen, not repeated boilerplate
    const notes = shots.filter((s) => s.caption.noteKey).map((s) => s.caption.noteKey!);
    expect(new Set(notes).size, "every remaining note is used once").toBe(notes.length);
  });

  it("assertValidVideoLesson throws with every problem", () => {
    const l = lesson();
    shotById(l, "hinge.bones").labels.anchors.push("x.anchor.y");
    shotById(l, "hinge.try").joint.poseKeys[1].pose.flexion = -5;
    expect(() => assertValidVideoLesson(l, locale(), joint, body)).toThrow(VideoLessonValidationError);
  });
});

describe("7. pose keys (time-parameterized, seekable)", () => {
  const keys = shotById(lesson(), "hinge.flexion").joint.poseKeys;
  const resolve = (v: number | "sourcePose" | "neutral", dof: string) => resolvePoseValue(v, dof, joint);
  it("holds, eases between keys, and reaches exact key values", () => {
    expect(samplePoseKeys(keys, 0, resolve).flexion).toBe(0);
    expect(samplePoseKeys(keys, 1400, resolve).flexion).toBe(0);
    const mid = samplePoseKeys(keys, 2600, resolve).flexion;
    expect(mid).toBeGreaterThan(10);
    expect(mid).toBeLessThan(35);
    expect(samplePoseKeys(keys, 3800, resolve).flexion).toBe(45);
    expect(samplePoseKeys(keys, 5000, resolve).flexion).toBe(45);
    expect(samplePoseKeys(keys, 7800, resolve).flexion).toBe(90);
    expect(samplePoseKeys(keys, 9500, resolve).flexion).toBe(90);
  });
  it("reduced motion samples keyframes only; tokens resolve through the manifest", () => {
    expect(samplePoseKeys(keys, 2600, resolve, true).flexion).toBe(0);
    expect(samplePoseKeys(keys, 6000, resolve, true).flexion).toBe(45);
    expect(resolve("sourcePose", "flexion")).toBe(13.62510376997268);
    expect(resolve("neutral", "flexion")).toBe(0);
  });
});

describe("8. camera transition math", () => {
  it("interpolateShot orbits about the target and is exact at the ends", () => {
    const a = { target: new Vector3(0, 1, 0), position: new Vector3(0, 1, 2), minDistance: 0, maxDistance: 0 };
    const b = { target: new Vector3(0, 1.5, 0), position: new Vector3(1, 1.5, 0), minDistance: 0, maxDistance: 0 };
    expect(interpolateShot(a, b, 0).position.distanceTo(a.position)).toBeLessThan(1e-9);
    expect(interpolateShot(a, b, 1).position.distanceTo(b.position)).toBeLessThan(1e-9);
    const mid = interpolateShot(a, b, 0.5);
    expect(mid.position.distanceTo(mid.target)).toBeCloseTo(1.5, 6);
    const frame = { up: new Vector3(0, 1, 0), right: new Vector3(-1, 0, 0), anterior: new Vector3(0, 0, 1) };
    expect(bodyViewDirection(frame, "front").z).toBeGreaterThan(0.9);
    expect(bodyViewDirection(frame, "right").x).toBeLessThan(-0.9);
  });
});

describe("timeline (fake runtime)", () => {
  const make = (reduced = false) => {
    const rt = new FakeVideoRuntime(joint);
    rt.reduced = reduced;
    const tl = new VideoTimeline(lesson(), rt);
    return { rt, tl };
  };

  it("3. sequences shots with travel transitions and ends at the last shot", () => {
    const { rt, tl } = make();
    tl.start(0);
    expect(rt.applied[0]).toEqual({ id: "intro.title", cut: true });
    tl.play();
    rt.run(8100);
    expect(rt.applied[1]).toEqual({ id: "hook.shoulder", cut: false });
    expect(tl.state).toMatchObject({ chapterId: "hook", shotId: "hook.shoulder", playing: true });
    rt.run(tl.durationMs);
    // the guided check now sits inside the hinge chapter and holds there until it is answered or skipped
    expect(tl.state).toMatchObject({ shotId: "hinge.check", holdingForCheck: true, ended: false });
    tl.continuePastCheck();
    rt.run(tl.durationMs);
    expect(tl.state).toMatchObject({ shotId: "map.all", ended: true, playing: false });
    expect(rt.applied.map((a) => a.id)).toEqual(tl.entries.map((e) => e.shot.id));
  });

  it("4-5. seeking a chapter reconstructs its state directly (no replay of earlier shots)", () => {
    const { rt, tl } = make();
    tl.start(0);
    rt.applied = [];
    tl.seekChapter(5);
    expect(rt.applied).toEqual([{ id: "hinge.travel", cut: true }]);
    expect(tl.state).toMatchObject({ chapterId: "hinge", shotId: "hinge.travel", localMs: 0 });
    const e = tl.entries.find((x) => x.shot.id === "hinge.flexion")!;
    rt.applied = [];
    tl.seek(e.startMs + 3800);
    expect(rt.applied).toEqual([{ id: "hinge.flexion", cut: true }]);
    expect(rt.pose.flexion).toBe(45);
    tl.seek(e.startMs + 7800);
    expect(rt.pose.flexion).toBe(90);
    const ext = tl.entries.find((x) => x.shot.id === "hinge.extension")!;
    tl.seek(ext.startMs + 3200);
    expect(rt.pose.flexion).toBe(145);
    expect(tl.state.seeks).toBe(5); // start + chapter seek + 3 seeks
  });

  it("6. seeking away mid-shot cancels that shot: its pose track no longer drives the joint", () => {
    const { rt, tl } = make();
    const e = tl.entries.find((x) => x.shot.id === "hinge.flexion")!;
    tl.seek(e.startMs + 2000);
    tl.play();
    rt.run(1000);
    const before = rt.pose.flexion;
    expect(before).toBeGreaterThan(0);
    tl.seekChapter(2);
    const poses = rt.poses.length;
    rt.run(3000);
    expect(tl.state.chapterId).toBe("fixed");
    expect(rt.poses.length).toBe(poses); // fixed chapter shots have no joint pose track
  });

  it("11-12. reduced motion: boundaries cut, poses step between keyframes", () => {
    const { rt, tl } = make(true);
    tl.start(0);
    tl.play();
    rt.run(8100);
    expect(rt.applied[1]).toEqual({ id: "hook.shoulder", cut: true });
    const e = tl.entries.find((x) => x.shot.id === "hinge.flexion")!;
    tl.seek(e.startMs + 2600);
    expect(rt.pose.flexion).toBe(0);
  });

  it("13-14. interactive pause on learner input, resume after idle with a blend", () => {
    const { rt, tl } = make();
    const e = tl.entries.find((x) => x.shot.id === "hinge.try")!;
    tl.seek(e.startMs + 1000);
    tl.play();
    rt.setDragging(true);
    rt.learnerInput("flexion", 110);
    expect(tl.state.learner).toBe("active");
    const t0 = tl.state.timeMs;
    rt.run(4000);
    expect(tl.state.timeMs).toBe(t0); // film clock held while dragging
    expect(rt.pose.flexion).toBe(110);
    rt.setDragging(false);
    rt.run(2600); // idle >= resumeAfterIdleMs (2500)
    expect(tl.state.learner).not.toBe("active");
    rt.run(800);
    expect(tl.state.learner).toBe("none");
    expect(tl.state.timeMs).toBeGreaterThan(t0);
    expect(Math.abs(rt.pose.flexion - 110)).toBeGreaterThan(5); // blended back onto the film track
  });

  it("learner input is ignored on passive shots; orbiting enters explore (paused) and resume returns to the film", () => {
    const { rt, tl } = make();
    tl.seekChapter(2);
    tl.play();
    rt.learnerInput("flexion", 50);
    expect(tl.state.learner).toBe("none");
    rt.orbit();
    expect(tl.state).toMatchObject({ explore: true, playing: false });
    expect(rt.explore).toBe(true);
    tl.resume();
    expect(tl.state).toMatchObject({ explore: false, playing: true });
    expect(rt.applied.at(-1)).toEqual({ id: "fixed.travel", cut: true });
  });

  it("15. pose check: bending to about 90 deg (content tolerance) releases the hold and the film goes on", () => {
    const { rt, tl } = make();
    const e = tl.entries.find((x) => x.shot.id === "hinge.check")!;
    tl.seek(e.startMs + 5000);
    tl.play();
    expect(tl.state.check.status).toBe("pending");
    rt.learnerInput("flexion", 70, "slider");
    expect(tl.answerCheck()).toMatchObject({ correct: false, error: 20 });
    rt.learnerInput("flexion", 93, "slider");
    expect(rt.pose.flexion).toBe(93); // the learner's own pose drives the joint while the check is held
    expect(tl.answerCheck()).toMatchObject({ correct: true });
    // The check now sits inside the hinge chapter rather than ending the lesson, so a correct answer holds for a moment
    // with the confirmation on screen instead of snapping into the next shot.
    expect(tl.state).toMatchObject({ check: { status: "correct" }, holdingForCheck: true, ended: false, shotId: "hinge.check" });
    tl.continuePastCheck();
    rt.run(100);
    expect(tl.state.shotId).not.toBe("hinge.check");
    expect(tl.state.ended).toBe(false);
  });

  it("16. reset returns to the start, paused, with interactive state cleared", () => {
    const { rt, tl } = make();
    tl.seekChapter(5);
    tl.play();
    tl.setExplore(true);
    tl.reset();
    expect(tl.state).toMatchObject({ timeMs: 0, playing: false, explore: false, learner: "none", chapterId: "hook" });
    expect(rt.applied.at(-1)).toEqual({ id: "intro.title", cut: true });
  });
});

describe("9. body layer presentation (production body delivery, medium tier)", () => {
  let layer: BodyLayer;
  let h: Highlighter;
  beforeAll(async () => {
    h = new Highlighter();
    layer = new BodyLayer(new AssetLoader(), h, () => undefined);
    expect(checkBodyManifest(body)).toEqual([]);
    layer.bindParsed(body, "medium", null, { intro: await loadBodyFile("intro"), skin_intro: await loadBodyFile("skin_intro") });
    // the grouped representation (what every presentation beyond the plain title needs)
    const scenes: Record<string, unknown> = { materials: await loadBodyFile("materials") };
    for (const id of body.tiers.medium.stages[1].files) scenes[id] = await loadBodyFile(id);
    (layer as unknown as { assets: unknown }).assets = { loadFile: async (url: string) => ({ gltf: { scene: scenes[url.includes("body-materials") ? "materials" : Object.entries(body.files).find(([, x]) => (x as { url: string }).url === url.split("/").pop())![0]] } }) };
    await layer.ensureStage("groups");
    layer.applyPending();
  });

  it("binds every render group; highlight / dim / hide / shell are state-based and act on whole groups", () => {
    expect(layer.structureIds()).toHaveLength(body.structures.length);
    expect(layer.groupCount).toBe(body.groups.length);
    expect(layer.showingProxy).toBe(false);
    const skull = layer.resolve(["region:skull"]);
    layer.present({ visible: true, highlight: skull, dimOthers: true, shell: false });
    expect(layer.presentationOf("body.frontal_bone")).toBe("highlight");
    expect(layer.presentationOf("body.femur_right")).toBe("dimmed");
    expect(layer.presentationOf(body.structures.find((s: { output: string }) => s.output === "skin").structureId)).toBe("off");
    layer.present({ visible: true, highlight: [], dimOthers: false, shell: true });
    expect(layer.presentationOf("body.femur_right")).toBe("normal");
    expect(layer.shellVisible).toBe(true);
    expect(() => layer.resolve(["body.wing"])).toThrow(/unknown body structure ref/);
    expect(h.cloneCount).toBeLessThanOrEqual(12);
  });

  it("hands shared source objects over to the joint asset and back", () => {
    const shared = joint.structures.filter((s) => s.tier === "core").map((s) => s.source.object);
    const ids = layer.handOver(shared, true);
    expect(ids).toContain("body.humerus_right");
    expect(ids).toContain("body.radius_right");
    expect(layer.presentationOf("body.humerus_right")).toBe("handedOver");
    expect(layer.visibleStructureIds()).not.toContain("body.ulna_right");
    layer.handOver(shared, false);
    expect(layer.visibleStructureIds()).toContain("body.ulna_right");
  });
});
