// Step 13 Phase D: classify every visible string, and attach the Phase C external verification to the curriculum claims.
//   npx tsx pipeline/qa/build_content_provenance.ts  ->  qa/expert/content_provenance.json
//
// Buckets: SOURCE (supplied curriculum excerpt or the approved figure's taxonomy), DRAFT_ENRICHMENT (written for this
// lesson, needs expert review), UI (interface text), SYSTEM (honesty/provenance notes the product shows about itself).
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const read = (p: string) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const locale = read("content/locales/en/hinge-elbow.json") as {
  provenanceLegend: Record<string, string>;
  sources: Record<string, { description: string; verifiedAgainstTextbook: boolean }>;
  strings: Record<string, { text: string; provenance: string }>;
};
const lesson = read("content/lessons/hinge-elbow.json") as { chapters: { shots: { id: string; caption?: { titleKey?: string; textKey?: string; noteKey?: string; eyebrowKey?: string }; interaction: { promptKey?: string; check?: { promptKey?: string; correctKey?: string; incorrectKey?: string } }; labels: { sites: { textKey: string }[] } }[] }[] };

// Where each key is used, so a reviewer can see the string in context.
const usage = new Map<string, string[]>();
const add = (key: string | undefined, where: string) => {
  if (!key) return;
  const list = usage.get(key) ?? [];
  list.push(where);
  usage.set(key, list);
};
for (const c of lesson.chapters)
  for (const s of c.shots) {
    add(s.caption?.titleKey, `${s.id} caption.title`);
    add(s.caption?.textKey, `${s.id} caption.text`);
    add(s.caption?.noteKey, `${s.id} caption.note`);
    add(s.caption?.eyebrowKey, `${s.id} caption.eyebrow`);
    add(s.interaction.promptKey, `${s.id} prompt`);
    add(s.interaction.check?.promptKey, `${s.id} check.prompt`);
    add(s.interaction.check?.correctKey, `${s.id} check.correct`);
    add(s.interaction.check?.incorrectKey, `${s.id} check.incorrect`);
    for (const site of s.labels.sites) add(site.textKey, `${s.id} site label`);
  }

/** Phase C: verification of the curriculum claims against official NCERT material reachable online (2026-09-18). */
const NCERT = {
  checkedOn: "2026-09-18",
  canonicalSourceStatus:
    "NOT AVAILABLE. The Class 6 Science chapter 'Body Movements' is no longer published on ncert.nic.in: the chapter page renders but its PDF (fesc108.pdf) and the whole book return HTTP 404, and the current Curiosity textbooks for Classes 6-8 contain no types-of-joints content. The repository still has no NCERT reference files.",
  sourcesConsulted: [
    { id: "S1", title: "NCERT Laboratory Manual, Science, Classes VI-VIII - Theme 3 'The world of the living', ACTIVITY 27", url: "https://ncert.nic.in/pdf/publication/sciencelaboratorymanuals/classVItoVIII/science/fhelm204.pdf", pages: "75-77 (from the running headers)", editionYear: "not confirmed", caveat: "Student activity worksheet: it poses the joint-to-body-part pairings as questions and NCERT publishes no answer key for it." },
    { id: "S2", title: "NCERT Exemplar Problems, Science, Class VI - 'Body Movement' (Unit 8), with the published answer key", url: "https://ncert.nic.in/pdf/publication/exemplarproblem/classVI/science/feep208.pdf", answerKeyUrl: "https://ncert.nic.in/pdf/publication/exemplarproblem/classVI/science/feep2an.pdf", pages: "questions 45-48, answers 121-123", editionYear: "not confirmed", note: "Uses only ball-and-socket, pivotal, hinge and fixed - the strongest support for keeping exactly four categories." },
    { id: "S3", title: "NCERT Biology, Class XI - 'Locomotion and Movement', chapter 17, section 17.4 Joints", url: "https://ncert.nic.in/textbook/pdf/kebo117.pdf", pages: "227", editionYear: "document stamped 'Reprint 2026-27'" },
    { id: "S4", title: "NCERT Exemplar Problems, Biology, Class XI - chapter 20 'Locomotion and Movement', answers in chapter 23", url: "https://ncert.nic.in/pdf/publication/exemplarproblem/classXI/biology/keep420.pdf", answerKeyUrl: "https://ncert.nic.in/pdf/publication/exemplarproblem/classXI/biology/keep423.pdf", pages: "questions 114-115, answers from 129", editionYear: "files stamped '2025-26'" },
  ],
  nonNcertCorroboration: [{ id: "N1", title: "Anatomy, Joints (Juneja, Munjal, Hubbard) - StatPearls, NCBI Bookshelf", url: "https://www.ncbi.nlm.nih.gov/books/NBK507893/", quote: "The body's only ball-and-socket joints are the hip and shoulder joints.", warning: "NOT an NCERT source. Must never be cited as NCERT." }],
  extraCategoriesInOfficialMaterial:
    "YES. S1 names 'Gliding joint' and 'Partially movable joint'; S3/S4 add gliding, saddle and the fibrous/cartilaginous/synovial classes. Only S2 (Class VI Exemplar) uses exactly the four categories this lesson teaches. Per the Step 13 brief the lesson deliberately keeps the four categories of the approved figure and does NOT add the others.",
  claims: {
    "hinge = elbow and knee": { status: "CONFIRMED (NCERT)", evidence: ["S2 answer to Q14: 'Elbow and knee are not made up of a single bone' -> '(Hinge joint)'", "S4 Q8 'Knee joint and elbow joint are examples of' -> answer key '8- d' = Hinge joint"] },
    "pivot = joint between head and neck": { status: "CONFIRMED (NCERT)", evidence: ["S2 answer to Q9.8: 'Joint where our neck joins the head.' -> 'Pivotal'", "S1: 'We can turn our head from left and right because of' ... 'pivot joint'"], note: "Class XI NCERT (S3/S4) refines this to the atlas-axis joint. The lesson uses the age-appropriate school-level wording." },
    "fixed = bones of the skull, immovable": { status: "CONFIRMED (NCERT)", evidence: ["S2 Q2 'Which of the following joints is immovable?' -> 'Upper jaw and skull'; Q9.3 -> 'Upper jaw with skull'", "S3: 'Fibrous joints do not allow any movement.' and skull bones 'fuse end-to-end' as sutures"], note: "NCERT's named example is the upper jaw with the skull; this lesson highlights the frontal and right parietal bones (a cranial suture)." },
    "ball-and-socket = shoulder": { status: "CONFIRMED (NCERT)", evidence: ["S3: 'Ball and socket joint (between humerus and pectoral girdle)'", "S4 Q7 marks 'Hinge joint: between Humerus and Pectoral girdle' as the incorrect pair"] },
    "ball-and-socket = hip": {
      status: "NOT CONFIRMED FROM ANY NCERT SOURCE",
      evidence: ["S3 exercise Q9 asks students to name the joint 'between ... femur/acetabulum' but publishes no answer", "The Class XI exemplar model answers state only that the pelvic girdle 'articulates with femur through acetabulum'"],
      corroboratedBy: "N1 (StatPearls, NOT NCERT)",
      affectedLessonStrings: ["ball.label.hip", "ball.text.hip", "recap.label.ball"],
      action: "PENDING_EXPERT. The claim is retained because it is in the project owner's approved curriculum figure and is anatomically standard, but it is NOT verifiable from NCERT material reachable online. A reviewer must either supply the NCERT citation or approve the claim on anatomical grounds.",
    },
  },
};

const BUCKET: Record<string, string> = { "source-excerpt": "SOURCE", "figure-reference": "SOURCE", "draft-enrichment": "DRAFT_ENRICHMENT", ui: "UI" };
// Notes the product shows about its own honesty (schematic markers, fitted axis, schematic bands) are SYSTEM, not lesson content.
const SYSTEM_KEYS = new Set(["note.schematic_indicator", "note.recap_schematic", "hinge.axis_note", "hinge.bands_note", "lesson.curriculum_note"]);
const CLAIM_OF: Record<string, string> = {
  "hinge.label.elbow": "hinge = elbow and knee",
  "hinge.label.knee": "hinge = elbow and knee",
  "hinge.knee": "hinge = elbow and knee",
  "pivot.label": "pivot = joint between head and neck",
  "pivot.text": "pivot = joint between head and neck",
  "fixed.label": "fixed = bones of the skull, immovable",
  "fixed.text": "fixed = bones of the skull, immovable",
  "ball.label.shoulder": "ball-and-socket = shoulder",
  "ball.text.shoulder": "ball-and-socket = shoulder",
  "ball.label.hip": "ball-and-socket = hip",
  "ball.text.hip": "ball-and-socket = hip",
};

const rows = Object.entries(locale.strings).map(([key, s]) => {
  const bucket = SYSTEM_KEYS.has(key) ? "SYSTEM" : (BUCKET[s.provenance] ?? "UNCLASSIFIED");
  const claim = CLAIM_OF[key];
  return {
    key,
    bucket,
    repoProvenance: s.provenance,
    text: s.text,
    shownAt: usage.get(key) ?? (s.provenance === "ui" ? ["player / dialogs / accessibility text"] : []),
    curriculumClaim: claim ?? null,
    externalVerification: claim ? (NCERT.claims as Record<string, { status: string }>)[claim].status : null,
    needsExpertReview: bucket === "DRAFT_ENRICHMENT" || (claim ? (NCERT.claims as Record<string, { status: string }>)[claim].status.startsWith("NOT CONFIRMED") : false),
  };
});

const counts = rows.reduce<Record<string, number>>((a, r) => ({ ...a, [r.bucket]: (a[r.bucket] ?? 0) + 1 }), {});
const out = {
  step: "13",
  phase: "D (source / draft provenance audit) with Phase C curriculum verification",
  generatedAt: new Date().toISOString(),
  generator: "pipeline/qa/build_content_provenance.ts",
  rules: {
    SOURCE: "The one sentence supplied in the project brief, plus the joint-category names and body locations of the approved NCERT figure. Nothing else may be labelled source-backed.",
    DRAFT_ENRICHMENT: "Written for this lesson. Not curriculum wording. Requires subject-expert review before release.",
    UI: "Interface text or accessibility description. Not educational content.",
    SYSTEM: "Statements the product makes about its own fidelity (schematic indicators, fitted axis, schematic bands, curriculum status).",
    unchanged: "Provenance badges are never removed for visual polish, and an inferred explanation is never labelled NCERT.",
  },
  legend: locale.provenanceLegend,
  localeSources: locale.sources,
  counts,
  onlySourceBackedSentence: rows.filter((r) => r.repoProvenance === "source-excerpt").map((r) => r.text),
  curriculumVerification: NCERT,
  strings: rows,
};

mkdirSync(join(ROOT, "qa", "expert"), { recursive: true });
writeFileSync(join(ROOT, "qa", "expert", "content_provenance.json"), JSON.stringify(out, null, 1));
console.log("counts", JSON.stringify(counts));
console.log("source-backed sentences:", out.onlySourceBackedSentence.length);
console.log("needs expert review:", rows.filter((r) => r.needsExpertReview).length);
console.log("unclassified:", rows.filter((r) => r.bucket === "UNCLASSIFIED").map((r) => r.key));
