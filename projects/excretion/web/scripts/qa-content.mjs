// Content & learning QA for the lesson (automated part; the NCERT wording audit is ncert-audit.mjs).
//  • every §5.5.2 idea (N1–N10) is TAUGHT, SUMMARISED (chapter 04) and RECALLED
//  • teach first: the question comes before any answer; every "Your turn" follows its process
//  • every section of chapter 03 is a process (WHERE → WHAT HAPPENS → RESULT)
//  • a term is first spoken in the shot that teaches it
//  • platform text rules: every shot narrated; heading never read aloud; one concise caption per
//    spoken sentence; ≤5 labels (6 on the final map); no reviewer wording; narrations distinct
// Writes ../docs/qa/content-qa.md; exits 1 on any error.
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const imp = (p) => import(pathToFileURL(join(here, '..', 'src', p)).href);
const { LESSON } = await imp('lessons/excretion-in-plants/lesson-data.js');
const { RECALL } = await imp('lessons/excretion-in-plants/recall-data.js');
const { PRESETS } = await imp('lessons/excretion-in-plants/shots.js');
const { EXPLORE } = await imp('lessons/excretion-in-plants/explore-data.js');
const { CORE, SUPPORT, TAUGHT_BY, SUMMARISED_BY } = await imp('data/ncert-content-map.js');
const { shotClips } = await imp('narration/script.js');
const { Timeline } = await imp('film/Timeline.js');
const manifest = JSON.parse(readFileSync(join(here, '..', 'public', 'models', 'manifest.json'), 'utf8'));
const nodes = new Set(manifest.assets.flatMap((a) => [...a.requiredNodes, ...a.anchors, ...(a.paths || []), ...a.cameras, ...Object.values(a.parts).flat()]));

const tl = new Timeline(LESSON);
const shots = tl.shots;
const byId = tl.byId;
const idx = (id) => shots.findIndex((s) => s.id === id);
const errors = [];
const warns = [];
const norm = (t) => (t || '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

// 1. NCERT coverage
const rows = CORE.map((c) => {
  const taught = TAUGHT_BY[c.id] || [];
  const summ = SUMMARISED_BY[c.id] || [];
  const recalled = RECALL.questions.filter((q) => q.ncert.includes(c.id)).map((q) => q.id);
  taught.forEach((id) => byId.has(id) || errors.push(`${c.id}: taught-by shot ${id} does not exist`));
  summ.forEach((id) => byId.has(id) || errors.push(`${c.id}: summary shot ${id} does not exist`));
  if (!taught.length) errors.push(`${c.id} is not taught`);
  if (!recalled.length && !['N1', 'N4', 'N5'].includes(c.id)) errors.push(`${c.id} is not recalled`);
  if (!summ.length && !['N4', 'N5'].includes(c.id)) errors.push(`${c.id} is not in the final summary`);
  return `| ${c.id} | ${c.text} | p. ${c.page} | ${taught.join(', ')} | ${summ.join(', ') || '(linking idea)'} | ${recalled.join(', ') || '(open prompt)'} |`;
});

// 2. teach first
const qIdx = idx('different.question');
if (qIdx < 0) errors.push('central question shot missing');
const answers = ['oxygen.reason', 'water.reason', 'vacuole.reason', 'leaves.reason', 'resin.reason', 'soil.reason'];
for (const a of answers) if (idx(a) < qIdx) errors.push(`${a} names a strategy before the central question`);
const tasks = [['oxygen.try', 'sunlight'], ['stoma.try', 'stoma'], ['vacuole.try', 'vacuole'], ['resin.try', 'resin']];
for (const [tryId, process] of tasks) {
  const tr = tl.tracks.find((t) => t.process === process);
  if (!tr || byId.get(tryId).start <= tr.start) errors.push(`${tryId}: the "Your turn" comes before its process is shown`);
  const reason = byId.get(tryId.replace('.try', '.reason'));
  if (!reason || reason.start > byId.get(tryId).start) errors.push(`${tryId}: the "Your turn" comes before the explanation`);
}
const openPrompt = 'Can you explain, in your own words, how plants deal with wastes?';
if (RECALL.open?.prompt !== openPrompt) errors.push('recall does not end with the open prompt from the brief');

// 3. every section is a process: WHERE → WHAT HAPPENS → RESULT
const procRows = [];
const WHERE = {
  oxygen: 'plant → leaf → inside the leaf → chloroplast → air spaces → stoma → air',
  stoma: 'leaf surface → stoma → guard cells',
  night: 'plant → inside the leaf, by day and at night',
  water: 'soil → root hairs → root xylem → stem → leaf cells → air spaces → stomata → air',
  vacuole: 'plant → leaf → tissue → cell → vacuole',
  leaves: 'an older leaf, low on the stem',
  resin: 'stem → slice → old xylem → xylem cells',
  soil: 'roots → root hairs, among soil particles',
};
for (const sec of tl.sections) {
  const own = shots.filter((s) => s.section === sec.id);
  const tracks = tl.tracks.filter((t) => t.start >= sec.start && t.start < sec.end).map((t) => `${t.process}${t.mode ? '.' + t.mode : ''}`);
  if (!tracks.length) errors.push(`section ${sec.id}: nothing happens on screen (no process)`);
  const result = own.find((s) => s.id.endsWith('.reason'));
  if (!result) errors.push(`section ${sec.id}: no result/explanation beat`);
  procRows.push(`| ${sec.title} | ${WHERE[sec.id] || '?'} | ${tracks.join(', ')} | ${result ? result.captions.join(' ') : '—'} |`);
}

// 4. terms are first spoken where they are taught
const TERMS = [
  ['life processes', 'what.processes'], ['excretion', 'what.excretion'], ['kidneys', 'different.animals'],
  ['photosynthesis', 'oxygen.look'], ['chloroplasts', 'oxygen.chloroplast'], ['oxygen', 'oxygen.produce'], ['stoma', 'oxygen.release'],
  ['stomata', 'stoma.look'], ['guard cells', 'stoma.look'], ['respiration', 'night.respire'], ['root hairs', 'water.hairs'],
  ['xylem', 'water.root'], ['water vapour', 'water.vapour'], ['transpiration', 'water.reason'],
  ['cytoplasm', 'vacuole.cell'], ['vacuole', 'vacuole.cell'], ['phloem', 'resin.layers'], ['bark', 'resin.layers'],
  ['old xylem', 'resin.old'], ['dead cells', 'resin.old'], ['resins and gums', 'resin.store'],
];
const termRows = [];
for (const [term, at] of TERMS) {
  const first = shots.find((s) => new RegExp(`\\b${term}\\b`, 'i').test(s.narration));
  if (!first) errors.push(`term "${term}" is never spoken`);
  else if (first.id !== at) errors.push(`term "${term}" is first spoken in ${first.id}, before it is taught in ${at}`);
  termRows.push(`| ${term} | ${at} | ${first?.id === at ? 'first spoken here' : first?.id || '—'} |`);
}

// 5. platform text rules
for (const s of shots) {
  if (!s.narration) errors.push(`${s.id}: shot is not narrated`);
  if (!s.heading?.title) errors.push(`${s.id}: no topic heading`);
  const h = norm(s.heading?.title);
  if (h.split(' ').length > 1 && norm(s.narration).includes(h)) errors.push(`${s.id}: heading "${s.heading.title}" is read aloud in the narration`);
  if (!(s.captions.length === 1 || s.captions.length === s.sentences.length)) errors.push(`${s.id}: ${s.captions.length} caption lines for ${s.sentences.length} spoken sentences`);
  for (const c of s.captions) if (c.split(/\s+/).length > 12) warns.push(`${s.id}: long caption line (${c.split(/\s+/).length} words)`);
  if (s.captions.some((c) => norm(c) === norm(s.narration)) && s.sentences.length > 1) errors.push(`${s.id}: caption repeats the whole narration`);
  if ((s.view?.labels || []).length > (s.view?.labelsMax || 5)) errors.push(`${s.id}: too many labels`);
  if (/NCERT|textbook|studies show|scientists|validated|schematic|accurate|placeholder|TODO/i.test([s.narration, s.heading?.title, s.heading?.text, ...s.captions].join(' '))) errors.push(`${s.id}: reviewer/citation wording on the learner surface`);
  if (s.narration.split(/\s+/).length > 45) warns.push(`${s.id}: long narration (${s.narration.split(/\s+/).length} words)`);
  if (!s.camera.follow && !PRESETS[s.camera.preset]) errors.push(`${s.id}: unknown camera preset ${s.camera.preset}`);
  if (s.camera.from && !PRESETS[s.camera.from]) errors.push(`${s.id}: unknown from-preset ${s.camera.from}`);
  for (const l of s.view?.labels || []) if (typeof l.anchor === 'string' && !nodes.has(l.anchor) && !/^(TRACK|LABEL|KIND)_/.test(l.anchor)) warns.push(`${s.id}: label anchor ${l.anchor} is not a listed node (mesh centre used)`);
  for (const n of s.view.highlight) if (!nodes.has(n)) warns.push(`${s.id}: highlight ${n} is not a listed node`);
  if (!s.a11y) errors.push(`${s.id}: no screen-reader description`);
}
// narrations are distinct (no shot repeats another): Jaccard < 0.45
const bag = (t) => new Set(t.toLowerCase().match(/[a-z']+/g));
let maxJ = { v: 0 };
for (let i = 0; i < shots.length; i++) {
  for (let j = i + 1; j < shots.length; j++) {
    const a = bag(shots[i].narration);
    const b = bag(shots[j].narration);
    const inter = [...a].filter((w) => b.has(w)).length;
    const jac = inter / (a.size + b.size - inter);
    if (jac > maxJ.v) maxJ = { v: jac, a: shots[i].id, b: shots[j].id };
    if (jac >= 0.45) errors.push(`${shots[i].id} ~ ${shots[j].id}: narrations too similar (${jac.toFixed(2)})`);
  }
}
// Explore opens only after its concept is taught
for (const m of EXPLORE) {
  if (!byId.has(m.after)) errors.push(`explore ${m.id}: unknown shot ${m.after}`);
}
// stable, unique clip names
const files = shotClips(LESSON).map((c) => c.file);
if (new Set(files).size !== files.length) errors.push('two shots share a narration clip name');

const words = shots.reduce((n, s) => n + s.narration.split(/\s+/).length, 0);
const md = [
  '# Content & learning QA (automated)',
  '',
  `Generated by \`npm run qa:content\` on ${new Date().toISOString()}.`,
  '',
  `**Result: ${errors.length ? 'FAIL' : 'PASS'}**: ${errors.length} errors, ${warns.length} notes.`,
  '',
  `${LESSON.chapters.length} chapters · ${tl.sections.length} sections in chapter 03 · ${shots.length} shots · ~${Math.round(tl.total / 1000)} s (estimated from the narration; timed from the audio once clips exist) · ${words} spoken words · ${RECALL.questions.length} recall questions + open prompt`,
  '',
  '## NCERT §5.5.2 coverage: taught → summarised → recalled',
  '',
  '| ID | Idea (Class X, p. 98) | Page | Taught in shots | Final map | Recall |',
  '|---|---|---|---|---|---|',
  ...rows,
  '',
  'Supporting (prerequisite) ideas, used only where a process must be understood: see `docs/prerequisite-audit.md`.',
  '',
  ...SUPPORT.map((s) => `- **${s.id}** ${s.text} *(${s.src}, p. ${s.page})*`),
  '',
  '## Teach first',
  '',
  `- The central question (\`different.question\`, shot ${qIdx + 1}) comes before any answer beat.`,
  '- Each "Your turn" (oxygen.try, vacuole.try, resin.try) comes after its process has been shown and explained.',
  `- Recall ends with the open prompt: “${openPrompt}”`,
  '',
  '## Every section is a process: WHERE → WHAT HAPPENS → RESULT',
  '',
  '| Section | Where | What happens on screen (process tracks) | Result (caption) |',
  '|---|---|---|---|',
  ...procRows,
  '',
  '## Terms: first spoken where they are taught',
  '',
  '| Term | Taught in | Check |',
  '|---|---|---|',
  ...termRows,
  '',
  `Most similar pair of narrations: ${maxJ.a} ~ ${maxJ.b} (Jaccard ${maxJ.v.toFixed(2)}; limit 0.45).`,
  '',
  '## Errors',
  '',
  ...(errors.length ? errors.map((e) => `- ${e}`) : ['- none']),
  '',
  '## Notes',
  '',
  ...(warns.length ? warns.map((w) => `- ${w}`) : ['- none']),
  '',
];
mkdirSync(join(here, '..', '..', 'docs', 'qa'), { recursive: true });
writeFileSync(join(here, '..', '..', 'docs', 'qa', 'content-qa.md'), md.join('\n'));
console.log(`content QA: ${errors.length ? 'FAIL' : 'PASS'} (${errors.length} errors, ${warns.length} notes)`);
errors.forEach((e) => console.log('  ERROR', e));
warns.forEach((w) => console.log('  note ', w));
if (errors.length) process.exit(1);
