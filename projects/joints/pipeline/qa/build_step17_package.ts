// Step 17: build the FINAL hash-backed expert review package, for the Step-16G candidate build.
//
//   node pipeline/qa/build_step17_package.ts --candidate step16g-narration-repetition-fixed
//     -> qa/expert/step17/review-manifest.json
//     -> qa/expert/step17/expert-review-status.json   (only if it does not exist: a reviewer's decisions are never overwritten)
//     -> qa/expert/step17/strings-inventory.json
//
// READ ONLY with respect to the product: it hashes and reads, and writes only inside qa/expert/step17/. It records no
// verdicts. Every expert decision it emits is PENDING, and no automated result is allowed to stand in for one.
import { execFileSync } from "node:child_process";
import { createHash, type BinaryLike } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const OUT_DIR = join(ROOT, "qa", "expert", "step17");
const CANDIDATE_TAG = process.argv.includes("--candidate") ? process.argv[process.argv.indexOf("--candidate") + 1] : "";
if (!CANDIDATE_TAG) throw new Error("--candidate <tag> is required: the package must name exactly the build it describes");

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { version?: string; dependencies: Record<string, string>; devDependencies: Record<string, string> };
const config = JSON.parse(readFileSync(join(ROOT, "pipeline/config.json"), "utf8")) as { master: { path: string; sha256: string }; blender: { versionPin: string } };
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as Locale;
const narration = JSON.parse(readFileSync(join(ROOT, "public/assets/audio/narration/narration.json"), "utf8")) as Narration;

interface Shot { id: string; durationMs: number; a11yKey: string; narrationKey?: string; camera: Record<string, unknown>; caption: { titleKey?: string; textKey?: string; noteKey?: string }; interaction: { promptKey?: string; check?: { promptKey: string; correctKey: string; incorrectKey: string } }; overlays: { concepts: string[] } }
interface Chapter { id: string; number: string; titleKey: string; shots: Shot[] }
interface Explore { exploreId: string; chapterId: string; jointType: string; status: string; site: string; titleKey: string; instructionKey: string; explanationKey: string; statusKey: string; motion: { kind: string; groups?: string[]; limitsDeg?: Record<string, number[]> }; camera: Record<string, unknown>; task?: { promptKey: string; doneKey: string } }
interface RecallStep { stepId: string; site: string; questionKey: string; revealKey: string; answer: string }
interface Lesson { chapters: Chapter[]; explores: Explore[]; recall: { chapterId: string; shotId?: string; promptKey: string; correctKey: string; incorrectKey: string; completeKey: string; options: { optionId: string; labelKey: string }[]; steps: RecallStep[] }; curriculum: { status: string; sourceIds: string[]; figureReference: string; noteKey: string } }
interface Locale { strings: Record<string, { text: string; provenance: string; sourceId?: string }>; sources: Record<string, { description: string; verifiedAgainstTextbook: boolean }> }
interface Narration { voice: Record<string, string>; shots: Record<string, { url: string; durationMs: number; textKeys: string[]; text: string }>; cues: Record<string, { url: string; durationMs: number; textKeys: string[]; text: string }> }

const hash = (abs: string) => {
  const bytes = readFileSync(abs);
  return { bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes as BinaryLike).digest("hex"), modified: statSync(abs).mtime.toISOString() };
};
const entry = (rel: string, abs = join(ROOT, rel)) => (existsSync(abs) ? { path: rel, ...hash(abs) } : { path: rel, missing: true as const });
const dir = (rel: string, filter: (f: string) => boolean = () => true) =>
  existsSync(join(ROOT, rel)) ? readdirSync(join(ROOT, rel)).filter(filter).map((f) => entry(`${rel}/${f}`)) : [];
const git = (...args: string[]) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

// ---------------------------------------------------------------- build identity
const commit = git("rev-parse", "HEAD");
const tagCommit = git("rev-parse", `${CANDIDATE_TAG}^{commit}`);
// Product paths. The package commit may add QA tooling and review documents; it may not change any of these, and the manifest
// says so with a diff against the candidate tag rather than with a promise.
const PRODUCT_PATHS = ["src", "content", "public", "index.html", "vite.config.ts", "package.json", "package-lock.json", "blender"];
const splitLines = (out: string) => out.split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean);
const productDiff = splitLines(git("diff", "--name-only", CANDIDATE_TAG, "HEAD", "--", ...PRODUCT_PATHS));
const productDirty = splitLines(git("status", "--porcelain", "--", ...PRODUCT_PATHS));

const identity = {
  candidateBuild: CANDIDATE_TAG,
  candidateCommit: tagCommit,
  candidateCommitDate: git("show", "-s", "--format=%cI", `${CANDIDATE_TAG}^{commit}`),
  candidateCommitSubject: git("show", "-s", "--format=%s", `${CANDIDATE_TAG}^{commit}`),
  packageCommit: commit,
  packageCommitDate: git("show", "-s", "--format=%cI", "HEAD"),
  branch: git("rev-parse", "--abbrev-ref", "HEAD"),
  headIsCandidateTag: commit === tagCommit,
  workingTreeClean: git("status", "--porcelain") === "",
  productUnchangedSinceCandidate: productDiff.length === 0 && productDirty.length === 0,
  productFilesChangedSinceCandidate: productDiff,
  productFilesUncommitted: productDirty,
  productPathsChecked: PRODUCT_PATHS,
  priorBaselines: {
    step13Frozen: { tag: "step13-frozen-baseline", commit: git("rev-parse", "step13-frozen-baseline^{commit}") },
    step14Conditional: { tag: "step14-conditional", commit: git("rev-parse", "step14-conditional^{commit}") },
    step15bCandidate: { tag: "step15b-learner-clarity-complete", commit: git("rev-parse", "step15b-learner-clarity-complete^{commit}") },
    step16bCandidate: { tag: "step16b-teaching-depth-complete", commit: git("rev-parse", "step16b-teaching-depth-complete^{commit}") },
    step16cCandidate: { tag: "step16c-explore-audio-complete", commit: git("rev-parse", "step16c-explore-audio-complete^{commit}") },
    step16dCandidate: { tag: "step16d-learner-polish-conditional", commit: git("rev-parse", "step16d-learner-polish-conditional^{commit}") },
    step16eCandidate: { tag: "step16e-mobile-finalization-complete", commit: git("rev-parse", "step16e-mobile-finalization-complete^{commit}") },
    step16ePackage: { tag: "step16e-review-package", commit: git("rev-parse", "step16e-review-package^{commit}"), note: "superseded: describes a build before Steps 16F and 16G" },
    step16fCandidate: { tag: "step16f-text-hierarchy-complete", commit: git("rev-parse", "step16f-text-hierarchy-complete^{commit}"), note: "superseded by 16G: had the narration word-replay fault" },
  },
  toolchain: {
    three: pkg.dependencies.three,
    preact: pkg.dependencies.preact,
    preactSignals: pkg.dependencies["@preact/signals"],
    vite: pkg.devDependencies.vite,
    typescript: pkg.devDependencies.typescript,
    vitest: pkg.devDependencies.vitest,
    playwright: pkg.devDependencies["@playwright/test"],
    node: process.version,
    blenderVersionPin: config.blender.versionPin,
    browserUnderTest: "Google Chrome 152.0.7977.83 (installed channel), headless, ANGLE D3D11",
    machine: "Lenovo 20V9, Intel Core i5-1135G7, Iris Xe, 16 GB, Windows 11 Pro",
  },
};

// ---------------------------------------------------------------- integrity
const masterEntry = { path: "<owner desktop>/Human_Body_Master.blend", pinnedInConfig: config.master.sha256, ...hash(config.master.path) };
const integrity = {
  note: "Nothing in this list was modified to produce this record. Hashes identify exactly what the expert is reviewing.",
  master: masterEntry,
  masterMatchesPin: masterEntry.sha256 === config.master.sha256,
  blenderWorkingAndCheckpoints: ["blender/Joints_Working.blend", "blender/Joints_Working.v001.blend", "blender/Joints_Working.v002.blend", "blender/Joints_Working.v003.blend", "blender/Joints_Working.v004.blend"].map((f) => entry(f)),
  validatedElbowAssets: ["public/assets/joints/elbow_r/elbow_r.core.glb", "public/assets/joints/elbow_r/elbow_r.detail.glb", "public/assets/joints/elbow_r/elbow_r.context.glb", "public/assets/joints/elbow_r/joint-manifest.json"].map((f) => entry(f)),
  bodyAssetsV2: dir("public/assets/body/v2"),
  bodyAssetsV3_inProduction: dir("public/assets/body/v3"),
  bodyAssetsStep11: ["public/assets/body/body.skeleton.glb", "public/assets/body/body.skin.glb", "public/assets/body/body-manifest.json"].map((f) => entry(f)),
  sharedAssets: ["public/assets/shared/body-materials.glb", "public/assets/shared/env/environment.json", "public/assets/shared/env/room_env_cubeuv_64.rgbe"].map((f) => entry(f)),
  lessonContent: ["content/lessons/hinge-elbow.json", "content/locales/en/hinge-elbow.json", "content/schemas/video-lesson.schema.json", "content/schemas/locale.schema.json"].map((f) => entry(f)),
  narrationAudio: dir("public/assets/audio/narration"),
  productionWebBuild: existsSync(join(ROOT, "dist"))
    ? ["index.html", ...readdirSync(join(ROOT, "dist", "app")).map((f) => `app/${f}`)].filter((f) => !f.endsWith(".map")).map((f) => entry(`dist/${f}`))
    : [],
  reviewCaptures: dir("qa/visual/step17_review", (f) => f.endsWith(".png") || f === "captures.json"),
  packageFiles: dir("qa/expert/step17", (f) => f !== "review-manifest.json"),
  reviewCapturesNote: "qa/visual/ is git-ignored by repository policy because every capture set is reproducible from its own script. These captures are reproduced by qa/expert/step17/capture_review_set.mjs (tracked, and hashed in packageFiles) against the built dist of this candidate; the SHA-256 of each one is recorded above, so a reviewer who regenerates them can verify they are looking at the same images. To send the package to an off-machine reviewer, ship qa/visual/step17_review/ alongside it.",
};

// ---------------------------------------------------------------- learner-facing strings, split by provenance
const used = new Map<string, { key: string; text: string; provenance: string; sourceId?: string; where: string[] }>();
const note = (key: string | undefined, where: string) => {
  if (!key) return;
  const s = locale.strings[key];
  if (!s) throw new Error(`content references a missing locale key: ${key} (${where})`);
  const e = used.get(key) ?? { key, text: s.text, provenance: s.provenance, sourceId: s.sourceId, where: [] };
  e.where.push(where);
  used.set(key, e);
};
for (const c of lesson.chapters) {
  note(c.titleKey, `chapter ${c.number} ${c.id} title`);
  for (const s of c.shots) {
    note(s.caption.titleKey, `${s.id} caption title`);
    note(s.caption.textKey, `${s.id} caption text`);
    note(s.caption.noteKey, `${s.id} caption note`);
    note(s.narrationKey, `${s.id} spoken line (subtitle)`);
    note(s.interaction.promptKey, `${s.id} prompt`);
    if (s.interaction.check) {
      note(s.interaction.check.promptKey, `${s.id} check prompt`);
      note(s.interaction.check.correctKey, `${s.id} check correct`);
      note(s.interaction.check.incorrectKey, `${s.id} check incorrect`);
    }
  }
}
for (const e of lesson.explores) {
  note(e.titleKey, `${e.exploreId} title`);
  note(e.instructionKey, `${e.exploreId} instruction`);
  note(e.explanationKey, `${e.exploreId} explanation`);
  note(e.statusKey, `${e.exploreId} status`);
  note(e.task?.promptKey, `${e.exploreId} task`);
  note(e.task?.doneKey, `${e.exploreId} task done`);
}
note(lesson.recall.promptKey, "recall prompt");
note(lesson.recall.correctKey, "recall correct");
note(lesson.recall.incorrectKey, "recall incorrect");
note(lesson.recall.completeKey, "recall complete");
for (const o of lesson.recall.options) note(o.labelKey, `recall option ${o.optionId}`);
for (const st of lesson.recall.steps) {
  note(st.questionKey, `recall step ${st.stepId} question`);
  note(st.revealKey, `recall step ${st.stepId} reveal`);
}

const spokenKeys = new Set<string>();
for (const c of Object.values(narration.shots)) for (const k of c.textKeys) spokenKeys.add(k);
for (const c of Object.values(narration.cues)) for (const k of c.textKeys) spokenKeys.add(k);

const inventory = [...used.values()].map((e) => ({ ...e, spoken: spokenKeys.has(e.key) }));
const byProvenance = (p: string) => inventory.filter((e) => e.provenance === p).sort((a, b) => a.key.localeCompare(b.key));
const stringsInventory = {
  decisionRule: "Each B (draft enrichment) entry carries expertDecision PENDING. Only the named reviewer may set it, to one of decisionOptions. No classification may be changed automatically, and no draft line may become source-backed without a declared, checked source.",
  document: "Every learner-facing string the candidate build can show, split by provenance. A: source-backed. B: draft enrichment (needs expert review). C: interface-only. Nothing here is classified as NCERT content unless it carries a declared sourceId.",
  build: CANDIDATE_TAG,
  generatedAt: new Date().toISOString(),
  declaredSources: locale.sources,
  curriculumBlock: lesson.curriculum,
  counts: {
    A_sourceBacked: byProvenance("source-excerpt").length,
    figureReference: byProvenance("figure-reference").length,
    B_draftEnrichment: byProvenance("draft-enrichment").length,
    C_interfaceOnly: byProvenance("ui").length,
    total: inventory.length,
  },
  A_sourceBacked: byProvenance("source-excerpt"),
  figureReference: byProvenance("figure-reference"),
  B_draftEnrichment: byProvenance("draft-enrichment").map((e) => ({ ...e, expertDecision: "PENDING", decisionOptions: ["acceptable", "needs revision", "unsupported", "needs removal"], expertNote: null })),
  unreferencedInLocale: Object.entries(locale.strings).filter(([k]) => !used.has(k) && !k.startsWith("ui.") && !k.startsWith("a11y.")).map(([key, v]) => ({ key, text: v.text, provenance: v.provenance, note: "not referenced by the lesson; never shown to a learner" })).filter((e) => e.provenance === "draft-enrichment"),
  C_interfaceOnly: byProvenance("ui"),
};

// ---------------------------------------------------------------- narration coverage (mechanical facts only)
const allShots = lesson.chapters.flatMap((c) => c.shots);
const narrationCoverage = {
  voice: narration.voice,
  shotClips: Object.keys(narration.shots).length,
  shotsTotal: allShots.length,
  silentShots: allShots.filter((s) => !narration.shots[s.id]).map((s) => s.id),
  silentShotsHaveNoCaption: allShots.filter((s) => !narration.shots[s.id]).every((s) => !s.caption.textKey && !s.caption.titleKey),
  cueClips: Object.keys(narration.cues).length,
  clipsLongerThanTheirShot: Object.entries(narration.shots)
    .map(([id, c]) => ({ id, clipMs: c.durationMs, shotMs: allShots.find((s) => s.id === id)?.durationMs ?? 0 }))
    .filter((r) => r.clipMs > r.shotMs),
  everySpokenKeyIsOnScreen: [...spokenKeys].every((k) => used.has(k)),
  spokenKeysNotOnScreen: [...spokenKeys].filter((k) => !used.has(k)),
  captionKeysNotSpoken: inventory.filter((e) => !e.spoken && (e.where.some((w) => w.endsWith("caption text")) || e.where.some((w) => w.endsWith("caption title")))).map((e) => e.key),
};

// ---------------------------------------------------------------- what the expert is looking at
const chapters = lesson.chapters.map((c) => ({
  number: c.number,
  id: c.id,
  title: locale.strings[c.titleKey].text,
  durationMs: c.shots.reduce((a, s) => a + s.durationMs, 0),
  shots: c.shots.map((s) => ({
    id: s.id,
    durationMs: s.durationMs,
    camera: s.camera,
    caption: [s.caption.titleKey, s.caption.textKey].filter(Boolean).map((k) => locale.strings[k!].text).join(" / "),
    note: s.caption.noteKey ? locale.strings[s.caption.noteKey].text : null,
    schematicIndicators: s.overlays.concepts,
    narration: narration.shots[s.id]?.text ?? null,
    screenReader: locale.strings[s.a11yKey].text,
    capture: `qa/visual/step17_review/${c.number}_${c.id}__${s.id}.png`,
  })),
}));

const explores = lesson.explores.map((e) => ({
  exploreId: e.exploreId,
  chapterId: e.chapterId,
  jointType: e.jointType,
  status: e.status,
  statusShownOnScreen: locale.strings[e.statusKey].text,
  site: e.site,
  motionKind: e.motion.kind,
  groupsMoved: e.motion.groups?.length ?? 0,
  limitsDeg: e.motion.limitsDeg ?? null,
  title: locale.strings[e.titleKey].text,
  instruction: locale.strings[e.instructionKey].text,
  explanation: locale.strings[e.explanationKey].text,
  task: e.task ? locale.strings[e.task.promptKey].text : null,
  narratedInstruction: !!narration.cues[e.instructionKey],
  captures: ["", "w390_", "w412_"].flatMap((p) => ["1_before", "2_task", "3_mid", "4_done"].map((st) => `qa/visual/step17_review/${p}explore_${e.exploreId.split(".")[1]}_${st}.png`)),
}));

const recall = {
  chapterId: lesson.recall.chapterId,
  opensOnShot: lesson.recall.shotId ?? null,
  options: lesson.recall.options.map((o) => locale.strings[o.labelKey].text),
  steps: lesson.recall.steps.map((s, i) => ({
    stepId: s.stepId,
    site: s.site,
    question: locale.strings[s.questionKey].text,
    answer: s.answer,
    reveal: locale.strings[s.revealKey].text,
    questionNamesTheCategory: /\bfixed\b|\bpivot\b|ball[- ]and[- ]socket|\bhinge\b/i.test(locale.strings[s.questionKey].text),
    narrated: !!narration.cues[s.questionKey] && !!narration.cues[s.revealKey],
    captures: [`qa/visual/step17_review/recall_${i + 1}_question.png`, `qa/visual/step17_review/recall_${i + 1}_answered.png`],
  })),
};

// ---------------------------------------------------------------- automated evidence carried forward (never a verdict)
const reports = [
  "qa/reports/step14b.lesson.json",
  "qa/reports/step14.accessibility.json",
  "qa/reports/step14.explore.json",
  "qa/reports/step14.recall.json",
  "qa/reports/step14.responsive.json",
  "qa/reports/step14.perf.explore.json",
  "qa/reports/step12.accessibility.json",
  "qa/reports/step12.reduced_motion.json",
  "qa/reports/step12.visual_regression.json",
  "qa/reports/step12.playwright.json",
  "qa/reports/step12r.perf.final.json",
  "qa/reports/step12r.perf.b.step14.2.json",
  "qa/reports/step12r.perf.b.step14b.2.json",
  "qa/reports/elbow_r.gate3.step12.json",
  "qa/reports/elbow_r.step12_reference_poses.json",
  "qa/elbow_r.poses.draft.json",
  // Steps 16B-16E
  "qa/reports/step16b.teaching.json",
  "qa/reports/step16c.invariants.json",
  "qa/reports/step16d.polish.json",
  "qa/reports/step16d.visual_set.json",
  "qa/reports/step16d.narrow_framing.json",
  "qa/reports/step16e.mobile.json",
  "qa/reports/step16e.mobile_overlap.before.json",
  "qa/reports/step16e.mobile_overlap.after.json",
  "qa/reports/step16e.explore_states.json",
  "qa/reports/step16e.payload.json",
  "qa/reports/step16f.hierarchy.after.json",
  "qa/reports/step16f.hierarchy_e2e.json",
  "qa/reports/step16g.replays.before.json",
  "qa/reports/step16g.replays.after.json",
  "qa/reports/step17.mobile.json",
  "qa/reports/step17.hierarchy_e2e.json",
  "qa/reports/elbow_r.gate3.step17.json",
  "qa/reports/elbow_r.step17_reference_poses.json",
  "qa/elbow_r.poses.draft.json",
  "qa/reports/elbow_r.gate3.step16e.json",
  "qa/reports/elbow_r.step16e_reference_poses.json",
].map((f) => entry(f));

const supportingDocuments = [
  "qa/step14/lesson-flow-final.md",
  "qa/step14/explore-matrix.md",
  "qa/step14/teaching-methodology-review.md",
  "qa/step16/step16-status.json",
  "qa/step16/teaching-comparison.md",
  "qa/step16b/step16b-status.json",
  "qa/step16c/step16c-status.json",
  "qa/step16d/narration-audit.md",
  "qa/step16d/content-change-log.md",
  "qa/step16d/learner-ui-audit.md",
  "qa/step16d/step16d-status.json",
  ...readdirSync(join(ROOT, "qa/step16e")).filter((f) => f.endsWith(".md") || f.endsWith(".json")).map((f) => `qa/step16e/${f}`),
  ...readdirSync(join(ROOT, "qa/step16f")).filter((f) => f.endsWith(".md") || f.endsWith(".json")).map((f) => `qa/step16f/${f}`),
  "qa/step16g/narration-repetition-fix.md",
  "docs/adr/step17-final-expert-review-baseline.md",
  "qa/expert/frozen-build.json",
].map((f) => entry(f));

mkdirSync(OUT_DIR, { recursive: true });

const manifest = {
  step: "17",
  final: true,
  document: `Expert review manifest for the ${CANDIDATE_TAG} candidate build. These hashes identify exactly what is being reviewed. Nothing in this file is an expert decision; every decision lives in expert-review-status.json and starts PENDING.`,
  generatedAt: new Date().toISOString(),
  generator: "pipeline/qa/build_step17_package.ts",
  candidate: identity,
  supersedes: {
    package: "qa/expert/step16e/ (Step 16E), which superseded qa/expert/step15b/, qa/expert/step15/ and qa/expert/ (Step 13). All are retained unchanged.",
    reason: "Steps 16F and 16G changed what a learner sees and hears after the Step-16E package: the topic heading moved to the top left without a card (16F), and narration no longer starts before its lead-in or rewinds itself, which had made a learner hear words twice (16G). Before that, Steps 16A-16E: all four categories now follow one teaching shape with a reason and a task (16B); Explore drags no longer orbit the camera and the narration no longer re-seeks itself (16C); DRAFT badges, the per-caption reviewer disclaimer and the Sources control left the teaching surface while every provenance record stayed underneath (16D); on a phone the exploration no longer covers the joint it asks the learner to move, and one unsourced comparative line was rewritten (16E). Earlier packages describe builds that are no longer the candidate; each is retained unchanged as the record of what it described.",
  },
  validatedVsSchematic: {
    validatedProceduralRig: ["elbow_r (right elbow, hinge) - single DOF flexion, fitted axis, 0-145 deg approximate teaching range"],
    teachingSimulations: ["fixed (skull suture)", "pivot (head on C1/C2)", "ball_and_socket (right shoulder)"],
    notValidatedProceduralRigs: ["skull", "C1/C2", "shoulder", "hip", "knee"],
    enforcement: "checkExploreConfigs() refuses a group-driven exploration that declares itself a validated rig; the status is on screen for as long as an exploration is open; every schematic indicator carries a note.",
  },
  lesson: { chapters: chapters.length, shots: allShots.length, durationMs: allShots.reduce((a, s) => a + s.durationMs, 0), structure: chapters },
  explores,
  recall,
  narrationCoverage,
  strings: { file: "qa/expert/step17/strings-inventory.json", counts: stringsInventory.counts },
  automatedEvidence: JSON.parse(readFileSync(join(OUT_DIR, "automated-evidence.json"), "utf8")),
  integrity,
  supportingReports: reports,
  supportingDocuments,
  howToUse: "Open reviewer-checklist.md and work through it with the captures in qa/visual/step17_review/. Record every decision in expert-review-status.json. A passing automated test is evidence, not approval: no item may be moved off PENDING because a test passed.",
};

writeFileSync(join(OUT_DIR, "strings-inventory.json"), JSON.stringify(stringsInventory, null, 1));

const statusPath = join(OUT_DIR, "expert-review-status.json");
if (existsSync(statusPath)) {
  console.log("expert-review-status.json already exists - left untouched (a reviewer's decisions are never overwritten)");
} else {
  writeFileSync(
    statusPath,
    JSON.stringify(
      {
        build: CANDIDATE_TAG,
        commit: tagCommit.slice(0, 7),
        expertReview: "PENDING",
        anatomy: "PENDING",
        curriculum: "PENDING",
        teachingMethodology: "PENDING",
        narration: "PENDING",
        camera: "PENDING",
        explore: "PENDING",
        landmarks: "PENDING",
        "145DegreeRange": "PENDING",
        accessibilityHuman: "PENDING",
        mobileHuman: "PENDING",
        hipClassification: "PENDING",
        assetLicence: "PENDING",
        taxonomy: "PENDING",
        draftEnrichmentStrings: "PENDING",
        fullCommit: tagCommit,
        document: `Expert decisions for the ${CANDIDATE_TAG} candidate build - the final review package. Every item starts PENDING and may only be changed by the named human reviewer who made the decision. No automated test result may move an item off PENDING.`,
        createdAt: new Date().toISOString(),
        reviewers: { curriculum: null, anatomy: null, accessibility: null, licensing: null },
        decisions: [],
        historicalStatus: {
          step12: "FAIL",
          nvda: "NOT TESTED",
          voiceOver: "NOT TESTED",
          talkBack: "NOT TESTED",
          realAndroid: "NOT TESTED",
          realIpad: "NOT TESTED",
          assetLicence: "RELEASE BLOCKER",
          gate3: "PENDING EXPERT LANDMARK APPROVAL",
          hipClassification: "PENDING EXPERT CONFIRMATION",
        },
        publicReleaseReady: false,
        publicReleaseBlockers: [
          "asset licence provenance unknown (RELEASE BLOCKER)",
          "no expert sign-off of any kind",
          "Step 12 performance: two emulated phone x4 misses, no real Android or iPad measurement",
          "no real NVDA or VoiceOver test",
          "no real phone or tablet test: every narrow-layout result is viewport emulation in one desktop browser",
          "no real TalkBack test",
          "formal Gate 3 (elbow landmarks) pending expert approval",
          "hip ball-and-socket classification unconfirmed",
        ],
      },
      null,
      1,
    ),
  );
  console.log("wrote expert-review-status.json (all PENDING)");
}

// Hashed last (Step 17): the inventory and the status file written above are package files too, so their hashes are
// taken after they exist, and the manifest is written only once everything it describes is on disk.
integrity.packageFiles = dir("qa/expert/step17", (f) => f !== "review-manifest.json");
writeFileSync(join(OUT_DIR, "review-manifest.json"), JSON.stringify(manifest, null, 1));

const counts = stringsInventory.counts;
console.log(`review-manifest.json: ${chapters.length} chapters, ${allShots.length} shots, ${explores.length} explorations, ${recall.steps.length} recall steps`);
console.log(`strings-inventory.json: A source-backed ${counts.A_sourceBacked}, figure-reference ${counts.figureReference}, B draft ${counts.B_draftEnrichment}, C interface ${counts.C_interfaceOnly}`);
console.log(`integrity: master ${manifest.integrity.masterMatchesPin ? "matches its pin" : "DOES NOT MATCH ITS PIN"}, ${integrity.reviewCaptures.length} review captures`);
console.log(`narration: ${narrationCoverage.shotClips}/${narrationCoverage.shotsTotal} shots spoken, ${narrationCoverage.cueClips} cues, ${narrationCoverage.clipsLongerThanTheirShot.length} overruns, silent: ${narrationCoverage.silentShots.join(", ") || "none"}`);
console.log(identity.productUnchangedSinceCandidate
  ? `product unchanged since ${CANDIDATE_TAG} (${PRODUCT_PATHS.join(", ")})`
  : `PRODUCT CHANGED SINCE ${CANDIDATE_TAG}: ${[...productDiff, ...productDirty].join(", ")}`);
