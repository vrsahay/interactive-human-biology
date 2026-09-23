// Content freeze (the academic gate before narration).
//
//   node scripts/content-freeze.mjs            print the current hashes and whether they match the freeze
//   node scripts/content-freeze.mjs --freeze   record a freeze in ../docs/content-freeze.json, ONLY if
//                                              qa:content and qa:audit pass and the accuracy audit has no open P0
//   node scripts/content-freeze.mjs --check    exit 1 unless the lesson still matches the recorded freeze
//
// spoken   every narration clip and cue line (what Google TTS will read)
// surface  everything else the learner sees: captions, headings, labels, tasks, Explore, Recall, a11y
// The TTS pipeline refuses to synthesise when the spoken hash does not match the freeze.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROOT = join(here, '..', '..');
const imp = (p) => import(pathToFileURL(join(here, '..', 'src', p)).href);
const { LESSON } = await imp('lessons/excretion-in-plants/lesson-data.js');
const { RECALL } = await imp('lessons/excretion-in-plants/recall-data.js');
const { EXPLORE, EXPLORE_INTRO, PARTS } = await imp('lessons/excretion-in-plants/explore-data.js');
const { shotClips, cueLines } = await imp('narration/script.js');

export function contentHashes() {
  const spoken = [
    ...shotClips(LESSON).map((s) => `shot ${s.id}: ${s.text}`),
    ...cueLines({ lesson: LESSON, recall: RECALL, explore: { intro: EXPLORE_INTRO, models: EXPLORE } }).map((c) => `cue ${c.key}: ${c.text}`),
  ];
  const surface = [];
  for (const c of LESSON.chapters) {
    surface.push(`chapter ${c.id}: ${c.title}`, ...(c.sections || []).map((s) => `section ${s.id}: ${s.title}`));
    for (const s of c.shots) {
      surface.push(`${s.id} caption: ${[].concat(s.caption || []).join(' | ')}`,
        `${s.id} heading: ${s.heading?.eyebrow || ''} / ${s.heading?.title || ''} / ${s.heading?.text || ''}`,
        `${s.id} labels: ${(s.view?.labels || []).map((l) => `${l.text}${l.sub ? ` (${l.sub})` : ''}`).join(' | ')}`,
        `${s.id} a11y: ${s.a11y || ''}`);
      if (s.interaction) surface.push(`${s.id} task: ${JSON.stringify(s.interaction)}`);
    }
  }
  surface.push(...EXPLORE.map((m) => `explore ${m.id}: ${m.title} / ${m.about}`));
  surface.push(...Object.entries(PARTS).map(([k, p]) => `part ${k}: ${p.title} / ${p.what} / ${p.learned}`));
  surface.push(`recall: ${JSON.stringify(RECALL)}`);
  const h = (lines) => createHash('sha256').update(lines.join('\n')).digest('hex');
  return { spoken: h(spoken), surface: h(surface), spokenLines: spoken.length, surfaceLines: surface.length };
}

const freezePath = join(ROOT, 'docs', 'content-freeze.json');
const now = contentHashes();
const frozen = existsSync(freezePath) ? JSON.parse(readFileSync(freezePath, 'utf8')) : null;
const argv = process.argv.slice(2);

if (argv.includes('--freeze')) {
  // the gate: automated audits must pass, and the biological accuracy audit must list no open P0
  for (const script of ['qa-content.mjs', 'ncert-audit.mjs']) {
    try {
      execFileSync(process.execPath, [join(here, script)], { stdio: 'pipe' });
    } catch {
      console.error(`freeze refused: ${script} fails`);
      process.exit(1);
    }
  }
  const bio = join(ROOT, 'docs', 'biological-accuracy-audit.md');
  if (!existsSync(bio)) {
    console.error('freeze refused: docs/biological-accuracy-audit.md is missing');
    process.exit(1);
  }
  const open = readFileSync(bio, 'utf8').split('\n').filter((l) => /\|\s*P0\s*\|/.test(l) && /\|\s*OPEN\s*\|/i.test(l));
  if (open.length) {
    console.error(`freeze refused: ${open.length} open P0 issue(s) in biological-accuracy-audit.md`);
    process.exit(1);
  }
  const rec = { frozenAt: new Date().toISOString(), lessonVersion: LESSON.version, ...now,
    note: 'Content frozen for V2 narration. Change any learner-facing text and the TTS pipeline refuses to run until the audits are redone and the freeze is recorded again.' };
  writeFileSync(freezePath, JSON.stringify(rec, null, 2) + '\n');
  console.log(`frozen: spoken ${now.spoken.slice(0, 12)}… (${now.spokenLines} lines) · surface ${now.surface.slice(0, 12)}… (${now.surfaceLines} lines)`);
  process.exit(0);
}

const match = frozen && frozen.spoken === now.spoken && frozen.surface === now.surface;
console.log(`content: spoken ${now.spoken.slice(0, 12)}… (${now.spokenLines}) · surface ${now.surface.slice(0, 12)}… (${now.surfaceLines}) · ${frozen ? (match ? 'MATCHES the freeze of ' + frozen.frozenAt : 'DOES NOT match the freeze of ' + frozen.frozenAt) : 'not frozen'}`);
if (argv.includes('--check') && !match) process.exit(1);
