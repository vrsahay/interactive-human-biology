// Renders docs/ncert-content-audit.md from src/data/ncert-audit.js and checks coverage:
// every spoken sentence, caption, heading, label, task line, recall line, Explore text and
// fixed interface text must have an audit entry. Exits 1 if anything is missing or if an
// entry is marked NEEDS REVISION.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const WEB = join(here, '..');
const imp = (p) => import(pathToFileURL(join(WEB, 'src', p)).href);
const { LESSON } = await imp('lessons/excretion-in-plants/lesson-data.js');
const { RECALL } = await imp('lessons/excretion-in-plants/recall-data.js');
const { EXPLORE, EXPLORE_INTRO, PARTS } = await imp('lessons/excretion-in-plants/explore-data.js');
const { CORE, TAUGHT_BY } = await imp('data/ncert-content-map.js');
const { splitSentences } = await imp('film/Timeline.js');
const A = await imp('data/ncert-audit.js');

const STATUS = { D: 'DIRECTLY SUPPORTED', P: 'SUPPORTED WITH MINOR PARAPHRASE', R: 'NEEDS REVISION', X: 'NOT SUPPORTED', '-': '— (no factual claim)' };
const errors = [];
const counts = { D: 0, P: 0, R: 0, X: 0, '-': 0 };
const flagged = [];
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

function cells(entry, where) {
  if (!entry) {
    errors.push(`no audit entry: ${where}`);
    return ['?', '?', '?', '?', '?', '?'];
  }
  const [kind, status, refs, note] = entry;
  if (!STATUS[status]) errors.push(`${where}: unknown status ${status}`);
  counts[status] = (counts[status] || 0) + 1;
  for (const r of refs) if (!A.REFS[r]) errors.push(`${where}: unknown ref ${r}`);
  const sources = [...new Set(refs.map((r) => A.REFS[r]?.[0]))].map((s) => ({ C10: 'Class X Ch. 5', C9C: 'Class 9 Ch. 2', C9T: 'Class 9 Ch. 3' })[s]).filter(Boolean);
  const pages = [...new Set(refs.map((r) => A.REFS[r]?.[1]))].filter(Boolean);
  const words = refs.map((r) => (A.REFS[r] ? `“${A.REFS[r][2]}”` : '')).filter(Boolean);
  if (status === 'X' || status === 'R') flagged.push({ where, status, note });
  if (status === 'R') errors.push(`${where}: still marked NEEDS REVISION`);
  return [kind, sources.join(', ') || '—', pages.join(', ') || '—', words.join(' · ') || '—', STATUS[status], note || ''];
}

const out = [];
const row = (claim, entry, where) => out.push(`| ${esc(claim)} | ${cells(entry, where).map(esc).join(' | ')} |`);
const head = '| Claim | Kind | NCERT support | Page | Supporting wording | Status | Note |\n|---|---|---|---|---|---|---|';

// ---- narration + on-screen text, chapter by chapter
for (const c of LESSON.chapters) {
  out.push(`\n### ${c.number} ${c.title}\n`);
  for (const s of c.shots) {
    const sentences = splitSentences(s.narration);
    const entries = A.NARRATION[s.id];
    if (!entries) errors.push(`no audit entries for shot ${s.id}`);
    else if (entries.length !== sentences.length) errors.push(`${s.id}: ${entries.length} audit entries for ${sentences.length} sentences`);
    out.push(`**\`${s.id}\`**${s.section ? ` · ${c.sections.find((x) => x.id === s.section)?.title}` : ''}\n`);
    out.push(head);
    sentences.forEach((sentence, i) => row(sentence, entries?.[i], `${s.id}#${i}`));
    const caps = Array.isArray(s.caption) ? s.caption : [s.caption];
    const labels = (s.view?.labels || []).map((l) => (l.sub ? `${l.text} (${l.sub})` : l.text));
    const surface = [s.heading?.eyebrow, s.heading?.title, s.heading?.text].filter(Boolean).join(' / ');
    out.push(`\nOn screen: heading “${surface}”; caption${caps.length > 1 ? 's' : ''} ${caps.map((x) => `“${x}”`).join(' ')}${labels.length ? `; labels ${labels.map((x) => `“${x}”`).join(', ')}` : ''}. ${A.SURFACE_NOTES[s.id] || 'Restates the narration above; no additional claim.'}\n`);
    if (s.interaction && s.interaction.kind !== 'recall') {
      const T = A.TASKS[s.id];
      if (!T) errors.push(`no audit entry for the task in ${s.id}`);
      out.push('| Task text | Kind | NCERT support | Page | Supporting wording | Status | Note |\n|---|---|---|---|---|---|---|');
      row(s.interaction.task, T?.task, `${s.id}.task`);
      row(s.interaction.done, T?.done, `${s.id}.done`);
      if (s.interaction.wrong) row(s.interaction.wrong, T?.wrong, `${s.id}.wrong`);
      if (s.interaction.choices) row(s.interaction.choices.map((x) => x.label).join(' · '), T?.choices, `${s.id}.choices`);
      out.push('');
    }
  }
}
const lessonTables = out.splice(0);

// ---- recall
out.push(head);
for (const qn of RECALL.questions) {
  const R = A.RECALL_AUDIT[qn.id];
  if (!R) errors.push(`no audit entry for recall ${qn.id}`);
  row(`Q: ${qn.q}`, ['question', '-', [], ''], `recall.${qn.id}.q`);
  row(`Answer: ${qn.options[qn.answer]}`, R?.answer, `recall.${qn.id}.answer`);
  row(`Other options: ${qn.options.filter((_, k) => k !== qn.answer).join(' · ')}`, ['distractor', '-', [], 'Offered as wrong answers; never presented as true.'], `recall.${qn.id}.options`);
  row(`Reveal: ${qn.reveal}`, R?.reveal, `recall.${qn.id}.reveal`);
}
for (const k of ['intro', 'correct', 'incorrect', 'complete']) row(RECALL[k], A.RECALL_AUDIT._lines[k], `recall.${k}`);
row(RECALL.open.prompt, A.RECALL_AUDIT._open.prompt, 'recall.open.prompt');
row(RECALL.open.hint, A.RECALL_AUDIT._open.hint, 'recall.open.hint');
splitSentences(RECALL.open.model).forEach((sentence, i) => row(`Model answer: ${sentence}`, i === 0 ? A.RECALL_AUDIT._open.model : ['summary', A.RECALL_AUDIT._open.model[1], A.RECALL_AUDIT._open.model[2], ''], `recall.open.model#${i}`));
RECALL.open.checklist.forEach((c, i) => row(`Checklist: ${c}`, A.RECALL_AUDIT._open.checklist[i], `recall.open.check#${i}`));
const recallTable = out.splice(0);

// ---- explore
out.push(head);
row(EXPLORE_INTRO, A.EXPLORE_AUDIT.intro, 'explore.intro');
for (const m of EXPLORE) {
  const e = A.EXPLORE_AUDIT[m.id];
  if (!e) errors.push(`no audit entry for explore ${m.id}`);
  const sentences = splitSentences(m.about);
  if (e && e.length !== sentences.length) errors.push(`explore ${m.id}: ${e.length} entries for ${sentences.length} sentences`);
  sentences.forEach((sentence, i) => row(`${m.title}: ${sentence}`, e?.[i], `explore.${m.id}#${i}`));
}
const exploreTable = out.splice(0);
out.push(head);
for (const [id, p] of Object.entries(PARTS)) {
  const e = A.PARTS_AUDIT[id];
  if (!e) errors.push(`no audit entry for part ${id}`);
  row(`${p.title}: ${p.what}`, e?.what, `part.${id}.what`);
  if (p.learned) row(`${p.title} (from the lesson): ${p.learned}`, e?.learned, `part.${id}.learned`);
}
const partsTable = out.splice(0);

// ---- interface text (verified against the source so the audit cannot drift)
out.push('| Where | Text | Kind | NCERT support | Page | Supporting wording | Status | Note |\n|---|---|---|---|---|---|---|---|');
for (const u of A.UI_AUDIT) {
  const src = readFileSync(join(WEB, u.file), 'utf8');
  if (!src.includes(u.text.replace(/’/g, '’'))) errors.push(`UI text not found in ${u.file}: ${u.text}`);
  out.push(`| ${esc(u.where)} | ${esc(u.text)} | ${cells(u.e, u.where).map(esc).join(' | ')} |`);
}
const uiTable = out.splice(0);
const titles = [
  ...LESSON.chapters.map((c) => `${c.number} “${c.title}”`),
  ...LESSON.chapters.flatMap((c) => (c.sections || []).map((s) => `“${s.title}”`)),
].join(' · ');

// ---- coverage of §5.5.2
const coverage = CORE.map((c) => `| ${c.id} | ${c.text} | ${c.page} | ${(TAUGHT_BY[c.id] || []).map((x) => `\`${x}\``).join(', ')} |`);

const total = Object.values(counts).reduce((a, b) => a + b, 0);
const claims = total - counts['-'];
const md = [
  '# NCERT content audit',
  '',
  `Generated by \`npm run qa:audit\` (web/scripts/ncert-audit.mjs) on ${new Date().toISOString().slice(0, 10)} from the audit data in \`web/src/data/ncert-audit.js\`. The script fails if any learner-facing string has no audit entry, or if any entry is still marked NEEDS REVISION.`,
  '',
  '## Sources (supplied NCERT pages, in `ncert/`)',
  '',
  '| Key | Book | File | Pages used |',
  '|---|---|---|---|',
  '| Class X Ch. 5 | NCERT *Science*, Class X, Chapter 5 “Life Processes”, reprint 2026-27. **§5.5.2 Excretion in Plants is on p. 98.** | `ncert/class10_ch05_life_processes_jesc105.pdf` | 80–82, 88–89, 94–96, 98, 99 |',
  '| Class 9 Ch. 2 | NCERT *Exploration*, Grade 9, Chapter 2 “Cell: The Building Block of Life” | `ncert/class09_ch02_cell_iesc102.pdf` | 13, 14, 18, 19 |',
  '| Class 9 Ch. 3 | NCERT *Exploration*, Grade 9, Chapter 3 “Tissues in Action” | `ncert/class09_ch03_tissues_iesc103.pdf` | 29, 32–34 |',
  '',
  'Page numbers are the printed page numbers. “Supporting wording” gives a short phrase from the page (not the full sentence) so the claim can be checked against the book.',
  '',
  '## Result',
  '',
  `${total} learner-facing lines audited; ${claims} of them make a factual claim.`,
  '',
  '| Status | Count |',
  '|---|---|',
  ...Object.entries(STATUS).map(([k, v]) => `| ${v} | ${counts[k] || 0} |`),
  '',
  errors.length ? `**Audit check: FAIL** (${errors.length}):\n\n${errors.map((e) => `- ${e}`).join('\n')}` : '**Audit check: PASS.** Every learner-facing line has an entry; nothing is marked NEEDS REVISION.',
  '',
  '### Not supported by the NCERT text (kept deliberately, flagged for a teacher)',
  '',
  ...(flagged.filter((f) => f.status === 'X').map((f) => `- \`${f.where}\`: ${f.note}`)),
  '',
  '### Inferences (supported, but by combining statements)',
  '',
  '- “A plant has no single / no special excretory organ” (the brief’s central question): Class X contrasts the specialised organs of complex animals (p. 96) with the *completely different strategies* of plants (p. 98); it does not use the words “no excretory organ”.',
  '- “Old xylem is made mostly of dead cells”: Class X p. 98 (many tissues consist of dead cells) + Class 9 p. 33 (xylem is mostly non-living).',
  '- “They are kept, not removed”: follows from “stored”.',
  '',
  '### Revised during this audit',
  '',
  '| Where | Before | After | Why |',
  '|---|---|---|---|',
  '| `leaves.lose` | “Plants can do something animals cannot.” | “Plants have another useful ability.” | NCERT makes no such comparison (and animals also shed parts). |',
  '| `resin.layers` | “Next comes phloem… Inside that is xylem…” (an order of layers) | “Inside are phloem… and xylem…” | The text names the tissues but does not state their order. |',
  '| `whole.xylem` | “Deep in the stem, old xylem holds resins and gums.” | “In the stem, old xylem holds resins and gums.” | Position of old xylem not stated in the text (the model still shows it inside). |',
  '| Explore: stem | “bark on the outside, then phloem…, then xylem…” | “bark on the outside; inside it, phloem… and xylem…” | Same as `resin.layers`. |',
  '| Explore: branch, pith | “Branches carry the leaves.” · “The soft centre of this stem.” | “A branch of the main stem.” · “The centre of this stem.” | Not in the supplied pages; parts are now named, not explained. |',
  '| (earlier drafts) | “sticky substances called resins and gums”; “the leaf changes colour”; “the oldest xylem lies near the centre” | removed | Not in the text. |',
  '',
  '## §5.5.2 coverage (the ten ideas in the brief)',
  '',
  '| ID | Idea | Page | Taught in |',
  '|---|---|---|---|',
  ...coverage,
  '',
  '## Lesson narration and on-screen text',
  '',
  'One row per spoken sentence. Under each shot, its heading, caption lines and labels are listed; they restate the narration unless noted.',
  ...lessonTables,
  '',
  '## Recall',
  '',
  ...recallTable,
  '',
  '## Explore',
  '',
  ...exploreTable,
  '',
  '### Explore: parts',
  '',
  ...partsTable,
  '',
  '## Fixed interface text',
  '',
  ...uiTable,
  '',
  `Chapter and section titles (no factual claims): ${titles}.`,
  '',
];
mkdirSync(join(WEB, '..', 'docs'), { recursive: true });
writeFileSync(join(WEB, '..', 'docs', 'ncert-content-audit.md'), md.join('\n'));
console.log(`NCERT audit: ${errors.length ? 'FAIL' : 'PASS'} · ${total} lines · ${Object.entries(counts).map(([k, v]) => `${k}:${v}`).join(' ')}`);
errors.forEach((e) => console.log('  ERROR', e));
if (errors.length) process.exit(1);
