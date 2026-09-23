#!/usr/bin/env node
// Narration synthesis: Google Cloud Text-to-Speech, at build time only.
//
//   node pipeline/narration/build-narration.mjs [--dry-run] [--all] [--only id,id]
//   (from web/: npm run narration)
//
// Voice and settings are the ones the Types of Joints lesson uses, so both lessons sound
// like the same platform (joints-platform/pipeline/audio/build_narration.ts):
//   language en-IN · voice en-IN-Chirp3-HD-Aoede · speaking rate 1.0 (natural) · no pitch
//   change (Chirp 3 HD voices take none) · MP3, 24 kHz mono. Lead-in 350 ms.
//
// What it does
//   1. reads every spoken line from the lesson data (web/src/narration/script.js):
//      one clip per shot, plus learner-paced cues (task feedback, recall, Explore)
//   2. keeps a clip when its text, voice and rate are unchanged and the file on disk still
//      matches its recorded hash; only new or changed lines are sent to the API (--all forces)
//   3. for each new line: LINEAR16 first (exact length + where each sentence starts, for the
//      captions), then the MP3 that ships
//   4. writes web/public/audio/excretion/*.mp3 with stable names (03c_vacuole_store.mp3,
//      cue_recall_water_question.mp3) and narration.json; removes clips no line uses any more
//
// The key. TTS_KEY (or GOOGLE_TTS_API_KEY) is read from the environment, or from the
// project's own .env file, which is git-ignored. It is sent in a request header, never
// in a URL, and is never printed, logged, or written to the manifest, the audio, the web
// build or any other file. Nothing here runs in the browser.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseWav, durationMs, sentenceStarts } from './wav.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const WEB = join(ROOT, 'web');
const OUT = join(WEB, 'public', 'audio', 'excretion');
const imp = (p) => import(pathToFileURL(join(WEB, 'src', p)).href);

const argv = process.argv.slice(2);
const flag = (k) => argv.includes(k);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const DRY = flag('--dry-run');
const ALL = flag('--all');
const ONLY = opt('--only', '') ? new Set(opt('--only', '').split(',')) : null;

// ---- the platform voice (same as Types of Joints)
const VOICE = { languageCode: 'en-IN', name: opt('--voice', 'en-IN-Chirp3-HD-Aoede') };
const AUDIO = { sampleRateHertz: 24000, speakingRate: 1.0 };
const LEAD_IN_MS = 350;

// ---- the script, from the lesson data
const { LESSON } = await imp('lessons/excretion-in-plants/lesson-data.js');
const { RECALL } = await imp('lessons/excretion-in-plants/recall-data.js');
const { EXPLORE, EXPLORE_INTRO } = await imp('lessons/excretion-in-plants/explore-data.js');
const { shotClips, cueLines } = await imp('narration/script.js');
const { splitSentences } = await imp('film/Timeline.js');

const shots = shotClips(LESSON);
const cues = cueLines({ lesson: LESSON, recall: RECALL, explore: { intro: EXPLORE_INTRO, models: EXPLORE } });

// ---- the key: environment first, then the project's git-ignored .env
function readKey() {
  const fromEnv = process.env.TTS_KEY || process.env.GOOGLE_TTS_API_KEY;
  if (fromEnv) return { key: fromEnv.trim(), from: 'environment' };
  const envFile = join(ROOT, '.env');
  if (existsSync(envFile)) {
    for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?(TTS_KEY|GOOGLE_TTS_API_KEY)\s*=\s*(.*)\s*$/);
      if (m && m[2]) return { key: m[2].replace(/^["']|["']$/g, '').trim(), from: '.env' };
    }
  }
  return { key: '', from: null };
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function synthesize(key, text, encoding) {
  const body = JSON.stringify({ input: { text }, voice: VOICE, audioConfig: { audioEncoding: encoding, ...AUDIO } });
  let last = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await sleep(600 * 2 ** (attempt - 1));
    let r;
    try {
      r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body,
      });
    } catch (e) {
      last = `network: ${e.message}`;
      continue;
    }
    const raw = await r.text();
    let j;
    try {
      j = JSON.parse(raw);
    } catch {
      last = `HTTP ${r.status} (not JSON)`;
      continue;
    }
    if (j.error) {
      // a real API error (bad key, quota, voice) stops the run; its message never contains the key
      if (r.status >= 500 || r.status === 429) {
        last = `HTTP ${r.status}: ${j.error.message}`;
        continue;
      }
      throw new Error(`Google TTS ${r.status}: ${j.error.message}`);
    }
    if (!j.audioContent) {
      last = `HTTP ${r.status}: no audio`;
      continue;
    }
    return Buffer.from(j.audioContent, 'base64');
  }
  throw new Error(`Google TTS failed after retries: ${last}`);
}

// ---- previous manifest: what can be kept
const manifestPath = join(OUT, 'narration.json');
const previous = (() => {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return { shots: {}, cues: {} };
  }
})();
const keep = (prev, text) => {
  if (!prev || ALL || prev.text !== text || prev.voice !== VOICE.name || prev.speakingRate !== AUDIO.speakingRate) return false;
  try {
    return sha(readFileSync(join(OUT, prev.url))) === prev.sha256;
  } catch {
    return false;
  }
};

const plan = [
  ...shots.map((s) => ({ kind: 'shot', id: s.id, file: s.file, text: s.text, prev: previous.shots?.[s.id] })),
  ...cues.map((c) => ({ kind: 'cue', id: c.key, file: c.file, text: c.text, prev: previous.cues?.[c.key] })),
];
const todo = plan.filter((p) => !keep(p.prev, p.text) && (!ONLY || ONLY.has(p.id)));
const chars = todo.reduce((n, p) => n + p.text.length, 0);
const words = plan.reduce((n, p) => n + p.text.split(/\s+/).length, 0);
const keptCount = plan.filter((p) => keep(p.prev, p.text)).length;
const skippedCount = plan.length - todo.length - keptCount;

if (flag('--script')) {
  // a readable script for review (no key needed): every clip, its file and its words
  const allChars = plan.reduce((n, p) => n + p.text.length, 0);
  const md = [
    '# Narration script',
    '',
    `Every spoken line of the lesson and its clip in \`web/public/audio/excretion/\`. Generated from the lesson data by \`node pipeline/narration/build-narration.mjs --script\`.`,
    '',
    `Voice ${VOICE.name} (${VOICE.languageCode}) · MP3 ${AUDIO.sampleRateHertz / 1000} kHz · speaking rate ${AUDIO.speakingRate} · ${shots.length} shot clips + ${cues.length} cues · ${words} words · ${allChars} characters.`,
    '',
    '## Shot clips (played on the film clock)',
    '',
    '| Clip | Shot | Spoken text |',
    '|---|---|---|',
    ...shots.map((x) => `| \`${x.file}\` | ${x.id} | ${x.text} |`),
    '',
    '## Cues (learner-paced lines)',
    '',
    '| Clip | Key | Spoken text |',
    '|---|---|---|',
    ...cues.map((c) => `| \`${c.file}\` | ${c.key} | ${c.text} |`),
    '',
  ];
  mkdirSync(join(ROOT, 'docs'), { recursive: true });
  writeFileSync(join(ROOT, 'docs', 'narration-script.md'), md.join('\n'));
  console.log('wrote docs/narration-script.md');
  process.exit(0);
}

console.log(`narration: ${shots.length} shot clips + ${cues.length} cues, ${words} words · voice ${VOICE.name} (${VOICE.languageCode}), MP3 ${AUDIO.sampleRateHertz / 1000} kHz, rate ${AUDIO.speakingRate}`);
console.log(`to synthesise: ${todo.length} (${chars} characters) · unchanged and kept: ${keptCount}${skippedCount ? ` · not selected by --only: ${skippedCount}` : ''}`);
if (DRY) {
  for (const p of todo) console.log(`  ${p.kind.padEnd(4)} ${p.file.padEnd(40)} ${p.text.slice(0, 70)}${p.text.length > 70 ? '…' : ''}`);
  process.exit(0);
}

// ---- the academic gate: narration only for frozen, audited content (docs/content-freeze.json)
if (todo.length && !flag('--allow-unfrozen')) {
  const freezeFile = join(ROOT, 'docs', 'content-freeze.json');
  const frozen = existsSync(freezeFile) ? JSON.parse(readFileSync(freezeFile, 'utf8')) : null;
  const spoken = createHash('sha256').update([
    ...shots.map((s) => `shot ${s.id}: ${s.text}`),
    ...cues.map((c) => `cue ${c.key}: ${c.text}`),
  ].join('\n')).digest('hex');
  if (!frozen || frozen.spoken !== spoken) {
    console.error('\nThe spoken content is not frozen (or changed since the freeze). Run the audits and');
    console.error('  cd web && node scripts/content-freeze.mjs --freeze');
    console.error('before synthesising the final narration.');
    process.exit(3);
  }
  console.log(`content freeze: OK (${frozen.frozenAt})`);
}

const { key, from } = readKey();
if (!key && todo.length) {
  console.error('\nTTS_KEY is not set. Set it in this shell, or put a line  TTS_KEY=…  in the project .env file');
  console.error('(.env is git-ignored). The key is only ever read here and never written anywhere.');
  process.exit(2);
}
if (key) console.log(`key: found (${from}); not shown`);

mkdirSync(OUT, { recursive: true });
const out = { shots: {}, cues: {} };
for (const p of plan) if (keep(p.prev, p.text) || (ONLY && !ONLY.has(p.id) && p.prev)) out[p.kind === 'shot' ? 'shots' : 'cues'][p.id] = p.prev;

let done = 0;
const problems = [];
for (const p of todo) {
  const sentences = splitSentences(p.text);
  const wav = parseWav(await synthesize(key, p.text, 'LINEAR16'));
  const ms = durationMs(wav);
  const starts = p.kind === 'shot' ? sentenceStarts(wav, sentences.length) : [0];
  if (p.kind === 'shot' && !starts) problems.push(`${p.id}: sentence pauses not found; captions will use an estimate`);
  const mp3 = await synthesize(key, p.text, 'MP3');
  writeFileSync(join(OUT, p.file), mp3);
  const entry = {
    url: p.file,
    bytes: mp3.byteLength,
    sha256: sha(mp3),
    durationMs: ms,
    leadInMs: p.kind === 'shot' ? LEAD_IN_MS : 0,
    ...(p.kind === 'shot' && starts ? { sentenceStartsMs: starts } : {}),
    voice: VOICE.name,
    speakingRate: AUDIO.speakingRate,
    text: p.text,
  };
  out[p.kind === 'shot' ? 'shots' : 'cues'][p.id] = entry;
  done++;
  console.log(`  ${String(done).padStart(3)}/${todo.length} ${p.file.padEnd(40)} ${String(ms).padStart(6)} ms  ${Math.round(mp3.byteLength / 1024)} KB`);
  await sleep(120);
}

const manifest = {
  schema: 'excretion.narration/1',
  lessonId: LESSON.id,
  generatedAt: new Date().toISOString(),
  generator: 'pipeline/narration/build-narration.mjs',
  provider: 'Google Cloud Text-to-Speech',
  voice: { name: VOICE.name, languageCode: VOICE.languageCode, gender: 'FEMALE', accent: 'Indian English' },
  audioConfig: { audioEncoding: 'MP3', ...AUDIO },
  platformReference: 'Same voice and settings as the Types of Joints lesson (joints-platform, pipeline/audio/build_narration.ts).',
  keyHandling: 'The API key was read from the environment or the git-ignored .env at build time. It is not in this file, the audio or the web build.',
  timing: { leadInMs: LEAD_IN_MS },
  shots: Object.fromEntries(shots.map((s) => [s.id, out.shots[s.id]]).filter(([, v]) => v)),
  cues: Object.fromEntries(cues.map((c) => [c.key, out.cues[c.key]]).filter(([, v]) => v)),
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

// a clip no line uses any more would ship for ever, unreachable
const used = new Set([...Object.values(manifest.shots), ...Object.values(manifest.cues)].map((e) => e.url));
const orphans = readdirSync(OUT).filter((f) => f.endsWith('.mp3') && !used.has(f));
orphans.forEach((f) => rmSync(join(OUT, f)));

const missing = plan.filter((p) => !(p.kind === 'shot' ? manifest.shots[p.id] : manifest.cues[p.id])).map((p) => p.id);
const total = [...Object.values(manifest.shots), ...Object.values(manifest.cues)].reduce((n, e) => n + e.bytes, 0);
console.log(`\nwrote ${Object.keys(manifest.shots).length} shot clips + ${Object.keys(manifest.cues).length} cues (${Math.round(total / 1024)} KB) to web/public/audio/excretion`);
console.log(`synthesised ${done}, kept ${keptCount}${skippedCount ? `, not selected ${skippedCount}` : ''}${orphans.length ? `, removed ${orphans.length} unused` : ''}`);
if (missing.length) console.log(`MISSING: ${missing.join(', ')}`);
if (problems.length) console.log(`notes:\n  ${problems.join('\n  ')}`);

// V2.4 release fix: the WAV used above for timing and the shipped MP3 are two separate TTS takes, and
// Chirp3-HD takes differ (up to ±1.8 s). The timing must come from the MP3 that ships.
if (done > 0) {
  const { spawnSync } = await import('node:child_process');
  const r = spawnSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), 'retime-from-mp3.mjs'), '--write'], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('\nWARNING: could not re-time from the MP3s. durationMs / sentenceStartsMs come from a different TTS take;');
    console.error('run  node pipeline/narration/retime-from-mp3.mjs --write  (needs Chrome or Edge) before building.');
    process.exitCode = 4;
  }
}
