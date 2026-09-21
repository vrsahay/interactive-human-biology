// Step 13 FINAL: reviewer sheet for every learner-facing educational string.
//   npx tsx pipeline/qa/build_curriculum_review.ts  ->  qa/expert/curriculum-review.md
// Read-only. Generated from content_provenance.json so the text, provenance and badge always match the frozen build.
// Reviewer decisions are NEVER pre-filled.
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const prov = JSON.parse(readFileSync(join(ROOT, "qa/expert/content_provenance.json"), "utf8")) as {
  counts: Record<string, number>;
  localeSources: Record<string, { description: string; verifiedAgainstTextbook: boolean }>;
  curriculumVerification: {
    checkedOn: string;
    canonicalSourceStatus: string;
    sourcesConsulted: { id: string; title: string; url: string; pages?: string; editionYear: string }[];
    extraCategoriesInOfficialMaterial: string;
    claims: Record<string, { status: string; evidence: string[]; note?: string; corroboratedBy?: string; action?: string }>;
  };
  strings: {
    key: string;
    bucket: string;
    repoProvenance: string;
    text: string;
    shownAt: string[];
    curriculumClaim: string | null;
    externalVerification: string | null;
  }[];
};

const BADGE: Record<string, string> = {
  "source-excerpt": "no badge (source excerpt, shown as the chapter's quoted sentence)",
  "figure-reference": "no badge (category name / body location from the approved figure)",
  "draft-enrichment": "**DRAFT** badge rendered next to the text",
  ui: "no badge",
};
const educational = prov.strings.filter((s) => s.bucket !== "UI");
const bySection: Record<string, typeof educational> = {
  "Source excerpt (the only source-backed sentence)": educational.filter((s) => s.repoProvenance === "source-excerpt"),
  "Figure reference (joint category names and body locations)": educational.filter((s) => s.repoProvenance === "figure-reference"),
  "Draft enrichment (written for this lesson — needs approval)": educational.filter((s) => s.repoProvenance === "draft-enrichment" && s.bucket !== "SYSTEM"),
  "System honesty notes (statements the product makes about its own fidelity)": educational.filter((s) => s.bucket === "SYSTEM"),
};

const L: string[] = [];
L.push("# Curriculum review — reviewer sheet");
L.push("");
L.push("**Status: PENDING EXPERT REVIEW.** No decision below has been filled in. The product is frozen; this sheet changes");
L.push("nothing by itself.");
L.push("");
L.push("Every learner-facing educational string in the lesson is listed. Interface-only strings are excluded");
L.push(`(${prov.counts.UI} of them). Counts: ${Object.entries(prov.counts).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
L.push("");
L.push("Allowed decisions: **PASS**, **PASS_WITH_NOTE**, **REQUEST_FIX**, **NOT_APPLICABLE**.");
L.push("");
L.push("## Ground rules for this review");
L.push("");
L.push("- Exactly one sentence is source-backed. Everything else stays **DRAFT ENRICHMENT** unless you document an");
L.push("  authoritative source for it.");
L.push("- Do not add NCERT quotations, chapter numbers or page numbers that are not verified from the document itself.");
L.push("- A provenance badge is not removed for visual polish. If you approve wording, it stays draft until a source is recorded.");
L.push("");
L.push("## Curriculum source position");
L.push("");
L.push(`Checked ${prov.curriculumVerification.checkedOn}.`);
L.push("");
L.push(`**Canonical source: ${prov.curriculumVerification.canonicalSourceStatus}**`);
L.push("");
L.push("Official NCERT material that was reachable and used as evidence:");
L.push("");
for (const s of prov.curriculumVerification.sourcesConsulted) L.push(`- **${s.id}** — ${s.title}. ${s.url}${s.pages ? ` (pp. ${s.pages})` : ""}. Edition year: ${s.editionYear}.`);
L.push("");
L.push("| Claim used by the lesson | External verification |");
L.push("|---|---|");
for (const [claim, v] of Object.entries(prov.curriculumVerification.claims)) L.push(`| ${claim} | **${v.status}** |`);
L.push("");
L.push(`Extra categories in official material: ${prov.curriculumVerification.extraCategoriesInOfficialMaterial}`);
L.push("");

for (const [section, rows] of Object.entries(bySection)) {
  L.push(`## ${section}`);
  L.push("");
  if (!rows.length) {
    L.push("_None._");
    L.push("");
    continue;
  }
  for (const r of rows) {
    L.push(`### \`${r.key}\``);
    L.push("");
    L.push(`> ${r.text}`);
    L.push("");
    L.push(`- **Text source:** ${r.repoProvenance === "source-excerpt" ? "supplied verbatim in the project brief" : r.repoProvenance === "figure-reference" ? "the project owner's approved NCERT 'Types of joints' figure (category name / body location only)" : "written for this lesson during the build"}`);
    L.push(`- **Provenance:** ${r.bucket} (repo class: ${r.repoProvenance})`);
    L.push(`- **Current badge:** ${BADGE[r.repoProvenance] ?? "no badge"}`);
    L.push(`- **Shown at:** ${r.shownAt.length ? r.shownAt.join(", ") : "not attached to a shot"}`);
    if (r.curriculumClaim) L.push(`- **Curriculum claim:** ${r.curriculumClaim} — external verification: **${r.externalVerification}**`);
    L.push("- **Reviewer:**");
    L.push("- **Comments:**");
    L.push("- **Decision:** PENDING");
    L.push("");
  }
}

L.push("## Recorded sources in the locale");
L.push("");
for (const [id, s] of Object.entries(prov.localeSources)) {
  L.push(`### \`${id}\``);
  L.push("");
  L.push(s.description);
  L.push("");
  L.push(`- Verified against the NCERT textbook: **${s.verifiedAgainstTextbook ? "yes" : "no"}**`);
  L.push("- **Reviewer:**");
  L.push("- **Comments:**");
  L.push("- **Decision:** PENDING");
  L.push("");
}

writeFileSync(join(ROOT, "qa/expert/curriculum-review.md"), L.join("\n") + "\n");
console.log(`wrote qa/expert/curriculum-review.md — ${educational.length} educational strings, ${prov.counts.UI} UI strings excluded`);
for (const [section, rows] of Object.entries(bySection)) console.log(`  ${section}: ${rows.length}`);
