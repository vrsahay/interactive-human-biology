// Pre-render the teacher's voice (platform standard, same voice as "Types of Joints").
//
//   TTS_KEY=<google-tts-api-key> node scripts/build-narration.mjs [--voice en-IN-Chirp3-HD-Aoede] [--dry-run]
//
// The key is read from the environment only. It is never written to a file, a
// manifest or the web build (a key in client JS is readable and billable by anyone).
// Output: public/narration/<shot>.mp3 + public/narration/narration.json
//   { voice, generated, clips: { shotId: { url, durationMs, text } }, cues: { text: { url, durationMs } } }
// The runtime then times every shot from its real clip (Timeline) and plays the
// clips in sync with the film clock instead of the device voice.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'public', 'narration');
const arg = (name, d) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : d;
};
const VOICE = arg('--voice', 'en-IN-Chirp3-HD-Aoede');
const DRY = process.argv.includes('--dry-run');
const KEY = process.env.TTS_KEY ?? process.env.GOOGLE_TTS_API_KEY;
if (!KEY && !DRY) {
  console.error('Set TTS_KEY (or GOOGLE_TTS_API_KEY) in the environment. It is never read from a file.');
  process.exit(1);
}

const imp = (p) => import(pathToFileURL(join(here, '..', 'src', p)).href);
const { LESSON } = await imp('lessons/excretion-in-plants/lesson-data.js');
const { RECALL } = await imp('lessons/excretion-in-plants/recall-data.js');

// ---------------------------------------------------------------- texts
const clips = LESSON.chapters.flatMap((c) => c.shots.map((s) => ({ id: s.id, text: s.narration })));
const cueTexts = new Set();
for (const c of LESSON.chapters) for (const s of c.shots) if (s.interaction?.done) cueTexts.add(s.interaction.done);
for (const c of LESSON.chapters) for (const s of c.shots) if (s.interaction?.wrong) cueTexts.add(s.interaction.wrong);
for (const q of RECALL.questions) {
  cueTexts.add(q.q);
  cueTexts.add(`${RECALL.correct} ${q.reveal}`);
}
[RECALL.incorrect, RECALL.complete].forEach((t) => cueTexts.add(t));

// ---------------------------------------------------------- mp3 duration
function mp3DurationMs(buf) {
  let i = 0;
  if (buf.toString('latin1', 0, 3) === 'ID3') {
    const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
    i = 10 + size;
  }
  const BR = {
    1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
  };
  const SR = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
  let samples = 0;
  let rate = 24000;
  while (i + 4 <= buf.length) {
    if (buf[i] !== 0xff || (buf[i + 1] & 0xe0) !== 0xe0) {
      i++;
      continue;
    }
    const ver = (buf[i + 1] >> 3) & 3; // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
    const layer = (buf[i + 1] >> 1) & 3; // 1 = Layer III
    const bri = (buf[i + 2] >> 4) & 15;
    const sri = (buf[i + 2] >> 2) & 3;
    const pad = (buf[i + 2] >> 1) & 1;
    if (ver === 1 || layer !== 1 || bri === 0 || bri === 15 || sri === 3) {
      i++;
      continue;
    }
    const kbps = BR[ver === 3 ? 1 : 2][bri];
    rate = SR[ver][sri];
    const spf = ver === 3 ? 1152 : 576;
    const len = Math.floor(((spf / 8) * kbps * 1000) / rate) + pad;
    if (len < 4) break;
    samples += spf;
    i += len;
  }
  return Math.round((samples / rate) * 1000);
}

async function synth(text) {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'en-IN', name: VOICE }, audioConfig: { audioEncoding: 'MP3' } }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { audioContent } = await res.json();
  return Buffer.from(audioContent, 'base64');
}

const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48).replace(/-$/, '');

if (DRY) {
  const words = clips.reduce((n, c) => n + c.text.split(/\s+/).length, 0);
  console.log(`${clips.length} shot clips, ${cueTexts.size} cues, ${words} words, voice ${VOICE}`);
  clips.slice(0, 5).forEach((c) => console.log(`  ${c.id}: ${c.text}`));
  process.exit(0);
}

mkdirSync(out, { recursive: true });
const manifest = { voice: VOICE, generated: new Date().toISOString(), clips: {}, cues: {} };
for (const c of clips) {
  const mp3 = await synth(c.text);
  const file = `${c.id}.mp3`;
  writeFileSync(join(out, file), mp3);
  manifest.clips[c.id] = { url: `narration/${file}`, durationMs: mp3DurationMs(mp3), text: c.text };
  console.log(`  ${c.id}  ${manifest.clips[c.id].durationMs} ms`);
}
let k = 0;
for (const t of cueTexts) {
  const mp3 = await synth(t);
  const file = `cue-${String(++k).padStart(2, '0')}-${slug(t)}.mp3`;
  writeFileSync(join(out, file), mp3);
  manifest.cues[t] = { url: `narration/${file}`, durationMs: mp3DurationMs(mp3) };
}
writeFileSync(join(out, 'narration.json'), JSON.stringify(manifest, null, 2));
console.log(`wrote ${clips.length} clips + ${cueTexts.size} cues → public/narration/narration.json`);
