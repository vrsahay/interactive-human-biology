// Step 13 FINAL: the anatomical review manifest - which existing capture or report backs each review item.
//   npx tsx pipeline/qa/build_review_manifest.ts  ->  qa/expert/review-manifest.json
// Read-only: it hashes and indexes evidence that already exists. It renders nothing new and changes no asset.
import { createHash, type BinaryLike } from "node:crypto";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const file = (rel: string) => {
  const p = join(ROOT, rel);
  if (!existsSync(p)) return { path: rel, present: false as const };
  const bytes = readFileSync(p);
  return { path: rel, present: true as const, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes as BinaryLike).digest("hex"), modified: statSync(p).mtime.toISOString() };
};

const FILM = "qa/visual/step12/film";
const POSES = "qa/visual/step12/reference_poses";

const fullBody = [
  { stage: "intro", shots: ["intro.title", "intro.map"], captures: [`${FILM}/01_intro_full_body.png`, `${FILM}/01b_intro_joint_map.png`], assess: ["does the opening orient the learner", "body shell + skeleton legibility"] },
  { stage: "fixed joint", shots: ["fixed.travel", "fixed.detail"], captures: [`${FILM}/02_fixed_skull.png`], assess: ["structure names", "side", "anatomical placement (frontal + right parietal, a cranial suture)", "schematic marker clarity", "wording does not overstate immobility"] },
  { stage: "pivot", shots: ["pivot.travel", "pivot.rotate"], captures: [`${FILM}/03_pivot_upper_neck.png`], assess: ["placement of the upper-neck region", "rotation arrow direction", "camera angle", "SCHEMATIC: no validated C1/C2 rig"] },
  { stage: "ball-and-socket: shoulder", shots: ["ball.travel", "ball.shoulder"], captures: [`${FILM}/04_ball_socket_shoulder.png`], assess: ["humerus + scapula placement", "side", "directional arcs are not measured ranges", "SCHEMATIC: no validated shoulder rig"] },
  { stage: "ball-and-socket: hip", shots: ["ball.hip"], captures: [`${FILM}/05_ball_socket_hip.png`], assess: ["femur + pelvis placement", "side", "HIP CLAIM PENDING EXPERT CONFIRMATION", "SCHEMATIC: no validated hip rig"] },
  { stage: "elbow (hero)", shots: ["hinge.travel", "hinge.source", "hinge.bones", "hinge.axis", "hinge.flexion", "hinge.extension", "hinge.try", "hinge.support", "hinge.return"], captures: [`${FILM}/06_hinge_elbow_source.png`, `${FILM}/06b_hinge_elbow_bones.png`, `${FILM}/06c_hinge_elbow_axis.png`, `${FILM}/06d_hinge_elbow_support.png`, `${FILM}/elbow_000.png`, `${FILM}/elbow_045.png`, `${FILM}/elbow_090.png`, `${FILM}/elbow_145.png`], assess: ["structure names", "bone relationships", "hinge-axis credibility", "flexion direction and plane", "capsule", "RCL", "UCL", "annular ligament (present but never shown)", "schematic band representation", "body -> elbow handoff", "VALIDATED procedural rig"] },
  { stage: "knee", shots: ["hinge.knee"], captures: [`${FILM}/07_hinge_knee.png`], assess: ["knee region placement", "single-plane arc", "SCHEMATIC: no validated knee rig"] },
  { stage: "recap", shots: ["recap.pullback", "recap.compare", "recap.check"], captures: [`${FILM}/08_recap_full_body.png`, `${FILM}/08b_recap_compare.png`, `${FILM}/09_check.png`], assess: ["all four categories named", "six site labels", "only the elbow is rig-animated is stated", "recap.pullback carries no note (documented exception)"] },
];

const elbowPoses = [0, 45, 90, 145].map((deg) => {
  const d = String(deg).padStart(3, "0");
  return {
    flexionDeg: deg,
    meaning: deg === 0 ? "true extension (controller zero)" : deg === 90 ? "the angle the learner is asked to reach" : deg === 145 ? "approximate teaching maximum" : "mid-range",
    captures: [`${FILM}/elbow_${d}.png`, `${POSES}/elbow_r_closeup_${d}.png`, `${POSES}/elbow_r_overview_${d}.png`, `${POSES}/elbow_r_context_${d}.png`].filter((p) => existsSync(join(ROOT, p))),
    assess: ["pose plausibility", "articular congruence", "no visible bone explosion or unexplained gap", "label placement"],
  };
});

const out = {
  step: "13-final",
  document: "Anatomical review manifest - existing evidence for each review item. READ ONLY.",
  generatedAt: new Date().toISOString(),
  generator: "pipeline/qa/build_review_manifest.ts",
  productState: "FROZEN. No model, asset, rig or runtime feature was changed to produce this manifest.",
  howToUse:
    "Open qa/expert/reviewer-checklist.md and work through sections A, B and C. This manifest tells you which capture or report backs each item, with a SHA-256 so you can be sure which image you are looking at. Captures are of the frozen build.",
  validatedVsSchematic: {
    validated: { joint: "elbow (right)", basis: "procedural hinge rig fitted in Blender, runtime verified against the Blender rig at 0/45/90/145 deg to below 0.001 mm", report: "qa/reports/elbow_r.gate3.step12.json" },
    schematic: [
      { joint: "skull (fixed)", limitation: "schematic teaching representation; static marker, no motion, no rig" },
      { joint: "neck C1/C2 (pivot)", limitation: "schematic teaching representation; NO validated C1/C2 rig" },
      { joint: "shoulder (ball-and-socket)", limitation: "schematic teaching representation; NO validated shoulder rig" },
      { joint: "hip (ball-and-socket)", limitation: "schematic teaching representation; NO validated hip rig" },
      { joint: "knee (hinge)", limitation: "schematic teaching representation; NO validated knee rig" },
    ],
    reviewerQuestion: "Is the distinction between the validated elbow and the five schematic demonstrations sufficiently clear to a learner? (reviewer-checklist.md item A19)",
  },
  fullBody: fullBody.map((s) => ({ ...s, captures: s.captures.map(file) })),
  elbowPoses: elbowPoses.map((p) => ({ ...p, captures: p.captures.map(file) })),
  elbowStructuresForReview: {
    shownToTheLearner: ["Humerus", "Radius", "Ulna", "Elbow joint", "Articular capsule of elbow joint", "Radial collateral ligament (schematic band)", "Ulnar collateral ligament (schematic band)"],
    presentInTheAssetButNeverShown: ["Head of radius", "Olecranon", "Coronoid process", "Capitulum (region)", "Trochlea (region)", "Annular ligament of radius"],
    reviewerQuestion: "Should the elbow chapter name any of the unshown landmarks for the teaching goal? (item A18)",
  },
  supportingReports: [
    "qa/expert/step13_review.json",
    "qa/expert/step13_cross_layer.json",
    "qa/expert/content_provenance.json",
    "qa/elbow_r.poses.draft.json",
    "qa/reports/elbow_r.gate3.step12.json",
    "qa/reports/elbow_r.gate2.step13.json",
    "qa/reports/elbow_r.pivot_fit.json",
    "qa/reports/elbow_r.neutral_offset.json",
    "qa/reports/step12.accessibility.json",
    "qa/reports/step12.reduced_motion.json",
    "qa/reports/step13.bugsweep.json",
    "qa/reports/step12r.perf.final.json",
    "qa/reports/step12.delivery_e2e.json",
    "qa/devices.md",
  ].map(file),
  additionalCaptureSets: {
    responsiveLayouts: "qa/visual/step12/regression/<viewport>/ - 11 states at 390x844, 412x915, 768x1024, 1280x800, 1440x900",
    step13FixEvidence: "qa/visual/step13/ - the shots whose captions gained a provenance note, and the relabelled support shot",
    renderingComparison: "qa/visual/step12r/tradeoff-canvas/ - canvas-only comparison against the Step-11 build",
  },
};

writeFileSync(join(ROOT, "qa/expert/review-manifest.json"), JSON.stringify(out, null, 1));
const allCaptures = [...out.fullBody.flatMap((s) => s.captures), ...out.elbowPoses.flatMap((p) => p.captures)];
const missing = [...allCaptures, ...out.supportingReports].filter((f) => !f.present).map((f) => f.path);
console.log(`wrote qa/expert/review-manifest.json`);
console.log(`captures indexed: ${allCaptures.length}; supporting reports: ${out.supportingReports.length}`);
console.log(missing.length ? `MISSING: ${missing.join(", ")}` : "all referenced evidence present");
