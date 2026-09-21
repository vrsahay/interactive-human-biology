// One-off: derive pipeline/qa/build_step17_package.ts from the Step-16E builder (which stays untouched).
import { readFileSync, writeFileSync } from "node:fs";
let s = readFileSync("pipeline/qa/build_step16e_package.ts", "utf8");
const rep = (a, b, all = false) => {
  if (!s.includes(a)) throw new Error("builder template changed; missing: " + a.slice(0, 80));
  s = all ? s.split(a).join(b) : s.replace(a, b);
};

rep("// Step 16E: build the hash-backed expert review package for the Step-16E candidate build.", "// Step 17: build the FINAL hash-backed expert review package, for the Step-16G candidate build.");
rep("//   node pipeline/qa/build_step16e_package.ts --candidate <tag>", "//   node pipeline/qa/build_step17_package.ts --candidate step16g-narration-repetition-fixed");
rep("qa/expert/step16e/", "qa/expert/step17/", true);
rep('const OUT_DIR = join(ROOT, "qa", "expert", "step16e");', 'const OUT_DIR = join(ROOT, "qa", "expert", "step17");');
rep('dir("qa/visual/step16e_review"', 'dir("qa/visual/step17_review"');
rep('packageFiles: dir("qa/expert/step16e", (f) => f !== "review-manifest.json"),', 'packageFiles: dir("qa/expert/step17", (f) => f !== "review-manifest.json"),');
rep("ship qa/visual/step16e_review/ alongside it.", "ship qa/visual/step17_review/ alongside it.");
rep("    capture: `qa/visual/step16e_review/", "    capture: `qa/visual/step17_review/");
rep(
  '  captures: ["", "phone390_", "phone412_"].flatMap((p) => [`qa/visual/step16e_review/${p}explore_${e.exploreId.split(".")[1]}_open.png`, `qa/visual/step16e_review/${p}explore_${e.exploreId.split(".")[1]}_moved.png`]),',
  '  captures: ["", "w390_", "w412_"].flatMap((p) => ["1_before", "2_task", "3_mid", "4_done"].map((st) => `qa/visual/step17_review/${p}explore_${e.exploreId.split(".")[1]}_${st}.png`)),',
);
rep("    captures: [`qa/visual/step16e_review/recall_", "    captures: [`qa/visual/step17_review/recall_");
rep("`qa/visual/step16e_review/recall_${i + 1}_answered.png`]", "`qa/visual/step17_review/recall_${i + 1}_answered.png`]");
rep("howToUse: \"Open reviewer-checklist.md and work through it with the captures in qa/visual/step16e_review/.", "howToUse: \"Open reviewer-checklist.md and work through it with the captures in qa/visual/step17_review/.");

// prior baselines: every earlier candidate and package, so the reviewer can see this is the latest
rep(
  '    step16dCandidate: { tag: "step16d-learner-polish-conditional", commit: git("rev-parse", "step16d-learner-polish-conditional^{commit}") },',
  '    step16dCandidate: { tag: "step16d-learner-polish-conditional", commit: git("rev-parse", "step16d-learner-polish-conditional^{commit}") },\n    step16eCandidate: { tag: "step16e-mobile-finalization-complete", commit: git("rev-parse", "step16e-mobile-finalization-complete^{commit}") },\n    step16ePackage: { tag: "step16e-review-package", commit: git("rev-parse", "step16e-review-package^{commit}"), note: "superseded: describes a build before Steps 16F and 16G" },\n    step16fCandidate: { tag: "step16f-text-hierarchy-complete", commit: git("rev-parse", "step16f-text-hierarchy-complete^{commit}"), note: "superseded by 16G: had the narration word-replay fault" },',
);

// supporting evidence
rep('  "qa/reports/step16e.payload.json",', '  "qa/reports/step16e.payload.json",\n  "qa/reports/step16f.hierarchy.after.json",\n  "qa/reports/step16f.hierarchy_e2e.json",\n  "qa/reports/step16g.replays.before.json",\n  "qa/reports/step16g.replays.after.json",\n  "qa/reports/step17.mobile.json",\n  "qa/reports/step17.hierarchy_e2e.json",\n  "qa/reports/elbow_r.gate3.step17.json",\n  "qa/reports/elbow_r.step17_reference_poses.json",\n  "qa/elbow_r.poses.draft.json",');
rep('  "qa/expert/frozen-build.json",\n].map((f) => entry(f));', '  ...readdirSync(join(ROOT, "qa/step16f")).filter((f) => f.endsWith(".md") || f.endsWith(".json")).map((f) => `qa/step16f/${f}`),\n  "qa/step16g/narration-repetition-fix.md",\n  "docs/adr/step17-final-expert-review-baseline.md",\n  "qa/expert/frozen-build.json",\n].map((f) => entry(f));');

// identity of the package itself
rep('  step: "16E",', '  step: "17",\n  final: true,');
rep('  generator: "pipeline/qa/build_step16e_package.ts",', '  generator: "pipeline/qa/build_step17_package.ts",');
rep(
  '    package: "qa/expert/step15b/ (Step 15B), which superseded qa/expert/step15/ (Step 15A) and qa/expert/ (Step 13)",',
  '    package: "qa/expert/step16e/ (Step 16E), which superseded qa/expert/step15b/, qa/expert/step15/ and qa/expert/ (Step 13). All are retained unchanged.",',
);
rep(
  'reason: "Steps 16A-16E changed what a learner reads, hears and sees:',
  'reason: "Steps 16F and 16G changed what a learner sees and hears after the Step-16E package: the topic heading moved to the top left without a card (16F), and narration no longer starts before its lead-in or rewinds itself, which had made a learner hear words twice (16G). Before that, Steps 16A-16E:',
);

// strings inventory: a decision per draft line, never pre-filled
rep(
  "  B_draftEnrichment: byProvenance(\"draft-enrichment\"),",
  "  B_draftEnrichment: byProvenance(\"draft-enrichment\").map((e) => ({ ...e, expertDecision: \"PENDING\", decisionOptions: [\"acceptable\", \"needs revision\", \"unsupported\", \"needs removal\"], expertNote: null })),\n  unreferencedInLocale: Object.entries(locale.strings).filter(([k]) => !used.has(k) && !k.startsWith(\"ui.\") && !k.startsWith(\"a11y.\")).map(([key, v]) => ({ key, text: v.text, provenance: v.provenance, note: \"not referenced by the lesson; never shown to a learner\" })).filter((e) => e.provenance === \"draft-enrichment\"),",
);
rep(
  'document: "Every learner-facing string the candidate build can show, split by provenance.',
  'decisionRule: "Each B (draft enrichment) entry carries expertDecision PENDING. Only the named reviewer may set it, to one of decisionOptions. No classification may be changed automatically, and no draft line may become source-backed without a declared, checked source.",\n  document: "Every learner-facing string the candidate build can show, split by provenance.',
);

// automated evidence recorded for this exact candidate (written by the test run, hashed as a package file)
rep("  integrity,\n  supportingReports: reports,", "  automatedEvidence: JSON.parse(readFileSync(join(OUT_DIR, \"automated-evidence.json\"), \"utf8\")),\n  integrity,\n  supportingReports: reports,");

// the status file: exactly the fields the brief specifies, all PENDING, plus reviewer bookkeeping
const i0 = s.indexOf("        build: CANDIDATE_TAG,");
const i1 = s.indexOf("        publicReleaseReady: false,");
if (i0 < 0 || i1 < 0) throw new Error("status template not found");
s = s.slice(0, i0) + `        build: CANDIDATE_TAG,
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
        document: \`Expert decisions for the \${CANDIDATE_TAG} candidate build - the final review package. Every item starts PENDING and may only be changed by the named human reviewer who made the decision. No automated test result may move an item off PENDING.\`,
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
` + s.slice(i1);
rep('          "no real phone or tablet test: every narrow-layout result is viewport emulation in one desktop browser",', '          "no real phone or tablet test: every narrow-layout result is viewport emulation in one desktop browser",\n          "no real TalkBack test",\n          "formal Gate 3 (elbow landmarks) pending expert approval",');
writeFileSync("pipeline/qa/build_step17_package.ts", s);
console.log("wrote pipeline/qa/build_step17_package.ts");
