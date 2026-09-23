// QA fixture: a stand-in narration set made of tones, laid out exactly like the real one
// (one clip per shot, one per cue, sentences separated by pauses). It lets the narration
// sync and ownership rules be tested end to end before, or without, the Google TTS clips.
// Output: web/.qa-audio (git-ignored), served by the dev server at /__qa/audio/.
// Use:    npm run qa:audio-fixture   then open  /?qa=1&qa-audio=fixture
// These tones are never shipped and never used as narration.
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', '.qa-audio');
const imp = (p) => import(pathToFileURL(join(here, '..', 'src', p)).href);
const { writeWav, parseWav, sentenceStarts, durationMs } = await import(pathToFileURL(join(here, '..', '..', 'pipeline', 'narration', 'wav.mjs')).href);
const { LESSON } = await imp('lessons/excretion-in-plants/lesson-data.js');
const { RECALL } = await imp('lessons/excretion-in-plants/recall-data.js');
const { EXPLORE, EXPLORE_INTRO } = await imp('lessons/excretion-in-plants/explore-data.js');
const { shotClips, cueLines } = await imp('narration/script.js');
const { splitSentences } = await imp('film/Timeline.js');

const RATE = 24000;
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

/** One tone burst per sentence (length from its words), 420 ms of silence between. */
function render(text, freq) {
  const sentences = splitSentences(text);
  const parts = [];
  for (const [i, s] of sentences.entries()) {
    const ms = Math.round((s.split(/\s+/).length / 2.45) * 1000);
    const n = Math.round((ms / 1000) * RATE);
    const burst = new Int16Array(n);
    for (let k = 0; k < n; k++) {
      const t = k / RATE;
      const env = Math.min(1, k / 600, (n - k) / 600) * (0.55 + 0.45 * Math.sin(2 * Math.PI * 3.2 * t) ** 2);
      burst[k] = Math.round(6500 * env * Math.sin(2 * Math.PI * freq * t));
    }
    parts.push(burst);
    if (i < sentences.length - 1) parts.push(new Int16Array(Math.round(0.42 * RATE)));
  }
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Int16Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return { wav: writeWav(out, RATE), sentences };
}

const manifest = { schema: 'excretion.narration/1', provider: 'QA fixture (tones, not narration)', voice: { name: 'qa-fixture' }, timing: { leadInMs: 350 }, shots: {}, cues: {} };
let miss = 0;
shotClips(LESSON).forEach((s, i) => {
  const { wav, sentences } = render(s.text, 180 + (i % 12) * 20);
  const file = s.file.replace(/\.mp3$/, '.wav');
  writeFileSync(join(OUT, file), wav);
  const parsed = parseWav(wav);
  const starts = sentenceStarts(parsed, sentences.length);
  if (!starts) miss++;
  manifest.shots[s.id] = { url: file, durationMs: durationMs(parsed), leadInMs: 350, ...(starts ? { sentenceStartsMs: starts } : {}), text: s.text };
});
for (const c of cueLines({ lesson: LESSON, recall: RECALL, explore: { intro: EXPLORE_INTRO, models: EXPLORE } })) {
  const { wav } = render(c.text, 520);
  const file = c.file.replace(/\.mp3$/, '.wav');
  writeFileSync(join(OUT, file), wav);
  manifest.cues[c.key] = { url: file, durationMs: durationMs(parseWav(wav)), leadInMs: 0, text: c.text };
}
writeFileSync(join(OUT, 'narration.json'), JSON.stringify(manifest, null, 1));
console.log(`qa audio fixture: ${Object.keys(manifest.shots).length} shot clips, ${Object.keys(manifest.cues).length} cues → web/.qa-audio (${miss} clips without detected sentence pauses)`);
