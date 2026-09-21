// Step 14 helper: validate the explore configs against the production manifests (read-only).
import { readFileSync } from "node:fs";
const lesson = JSON.parse(readFileSync("content/lessons/hinge-elbow.json", "utf8"));
const body = JSON.parse(readFileSync("public/assets/body/v3/body-delivery.json", "utf8"));
const locale = JSON.parse(readFileSync("content/locales/en/hinge-elbow.json", "utf8"));
const joint = JSON.parse(readFileSync("public/assets/joints/elbow_r/joint-manifest.json", "utf8"));
const groupIds = new Set(body.groups.map((g) => g.groupId));
const structureIds = new Set(body.structures.map((s) => s.structureId));
const siteIds = new Set(body.jointSites.map((s) => s.siteId));
const textKeys = new Set(Object.keys(locale.strings));
const chapterIds = new Set(lesson.chapters.map((c) => c.id));
const dofIds = new Set(joint.dofs.map((d) => d.id));
const problems = [];
for (const e of lesson.explores ?? []) {
  const at = `explore ${e.exploreId}`;
  if (!chapterIds.has(e.chapterId)) problems.push(`${at}: unknown chapter ${e.chapterId}`);
  if (!siteIds.has(e.site)) problems.push(`${at}: unknown site ${e.site}`);
  for (const id of [...e.highlight, ...e.context]) if (!structureIds.has(id)) problems.push(`${at}: unknown structure ${id}`);
  for (const l of e.siteLabels) { if (!siteIds.has(l.siteId)) problems.push(`${at}: unknown site label ${l.siteId}`); if (!textKeys.has(l.textKey)) problems.push(`${at}: missing key ${l.textKey}`); }
  for (const k of [e.titleKey, e.instructionKey, e.explanationKey, e.statusKey]) if (!textKeys.has(k)) problems.push(`${at}: missing key ${k}`);
  for (const g of e.motion.groups) if (!groupIds.has(g)) problems.push(`${at}: unknown group ${g}`);
  if (e.motion.kind === "dof" && !dofIds.has(e.motion.dofId)) problems.push(`${at}: unknown dof ${e.motion.dofId}`);
  if (e.motion.kind !== "dof" && e.status !== "teaching-simulation") problems.push(`${at}: group displacement must be a teaching simulation`);
  if (e.motion.kind === "dof" && e.status !== "validated-rig") problems.push(`${at}: rig-driven explore must be validated-rig`);
}
console.log(`explores: ${lesson.explores?.length ?? 0} | problems: ${problems.length}`);
for (const p of problems) console.log("  -", p);
