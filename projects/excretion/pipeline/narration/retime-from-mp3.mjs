// Re-time the narration manifest from the MP3 files that actually ship (no TTS call, no key).
//
// Why (found in the V2.4 release watch): build-narration.mjs asks Google TTS for each line twice,
// LINEAR16 (to measure the clip length and the sentence starts) and MP3 (the file that ships).
// Chirp3-HD voices do not give identical takes, so for many lines the shipped MP3 is up to ±1.8 s
// longer or shorter than the WAV that was measured: shots were sized to the wrong length (three
// lines were cut at the shot change) and captions could change before or after the voice did.
//
// This decodes every shipped MP3 in a local headless Chrome (Web Audio) and applies the SAME
// algorithm as wav.mjs (durationMs, sentenceStarts) to the real audio, then rewrites durationMs and
// sentenceStartsMs in narration.json. The audio files and the text are untouched.
//
//   node pipeline/narration/retime-from-mp3.mjs            report only
//   node pipeline/narration/retime-from-mp3.mjs --write    update web/public/audio/excretion/narration.json
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sentenceStarts } from './wav.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = join(ROOT, 'web', 'public', 'audio', 'excretion');
const MANIFEST = join(DIR, 'narration.json');
const WRITE = process.argv.includes('--write');
const { splitSentences } = await import(pathToFileURL(join(ROOT, 'web', 'src', 'film', 'Timeline.js')).href);

const CHROMES = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chrome = CHROMES.find((p) => existsSync(p));
if (!chrome) { console.error('No Chrome/Edge found (set CHROME=/path/to/chrome).'); process.exit(2); }

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'retime-'));
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
let page;
for (let i = 0; i < 80 && !page; i++) { try { page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page'); } catch {} if (!page) await sleep(250); }
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
ws.addEventListener('message', (m) => { const x = JSON.parse(m.data); if (x.id && pending.has(x.id)) { pending.get(x.id)(x); pending.delete(x.id); } });
const evaluate = (expression) => new Promise((res, rej) => { const i = ++id; pending.set(i, (x) => (x.result?.exceptionDetails || x.error ? rej(new Error(JSON.stringify(x.result?.exceptionDetails || x.error).slice(0, 300))) : res(x.result.result.value))); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } })); });

// decode in the page, return 16-bit PCM (so wav.mjs sees exactly what it sees for a WAV)
async function decode(file) {
  const b64 = readFileSync(join(DIR, file)).toString('base64');
  const r = await evaluate(`(async () => { const bin = atob(${JSON.stringify(b64)}); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const buf = await new OfflineAudioContext(1, 1, 24000).decodeAudioData(u8.buffer); const d = buf.getChannelData(0); const out = new Array(d.length);
    for (let i = 0; i < d.length; i++) out[i] = Math.max(-32768, Math.min(32767, Math.round(d[i] * 32767)));
    return { sampleRate: buf.sampleRate, samples: out }; })()`);
  return { sampleRate: r.sampleRate, samples: Int16Array.from(r.samples) };
}

/**
 * Sentence starts guided by the text: the same pauses as wav.mjs (quiet runs ≥ 120 ms inside the
 * speech), but each sentence break takes the pause nearest to where the text says it should fall
 * (its share of the characters), preferring longer pauses. The longest-pause rule alone can pick a
 * comma pause over the break after a very short sentence ("Let's find out. We will follow…").
 */
function sentenceStartsGuided({ samples, sampleRate }, sents) {
  if (sents.length <= 1) return [0];
  const frame = Math.round(sampleRate / 100);
  const rms = [];
  for (let i = 0; i + frame <= samples.length; i += frame) { let s = 0; for (let k = i; k < i + frame; k++) s += samples[k] * samples[k]; rms.push(Math.sqrt(s / frame)); }
  const sorted = [...rms].sort((a, b) => a - b);
  const quiet = (sorted[Math.floor(sorted.length * 0.9)] || 1) * 0.06;
  const first = rms.findIndex((v) => v > quiet);
  let last = rms.length - 1;
  while (last > 0 && rms[last] <= quiet) last--;
  const runs = [];
  let start = -1;
  for (let i = first; i <= last; i++) {
    if (rms[i] <= quiet) { if (start < 0) start = i; } else if (start >= 0) { if (i - start >= 12) runs.push({ start, end: i, len: i - start }); start = -1; }
  }
  if (runs.length < sents.length - 1) return null;
  const total = sents.reduce((a, s) => a + s.length, 0);
  const speech = (last - first) * 10;
  const out = [0];
  let acc = 0;
  let from = 0;
  for (let b = 0; b < sents.length - 1; b++) {
    acc += sents[b].length;
    const est = first * 10 + (acc / total) * speech;
    let best = -1;
    let bc = Infinity;
    for (let j = from; j <= runs.length - (sents.length - 1 - b); j++) {
      const cost = Math.abs(runs[j].end * 10 - est) - 4 * runs[j].len * 10;   // near the estimate, and long
      if (cost < bc) { bc = cost; best = j; }
    }
    out.push(Math.max(0, runs[best].end * 10 - 40));
    from = best + 1;
  }
  return out;
}

const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const report = [];
for (const kind of ['shots', 'cues']) {
  for (const [key, e] of Object.entries(m[kind] || {})) {
    const pcm = await decode(e.url);
    const dur = Math.round((pcm.samples.length / pcm.sampleRate) * 1000);
    const row = { kind, key, before: e.durationMs, after: dur };
    if (kind === 'shots') {
      const sents = splitSentences(e.text);
      const starts = sentenceStartsGuided(pcm, sents) || sentenceStarts(pcm, sents.length);
      row.startsBefore = e.sentenceStartsMs; row.startsAfter = starts;
      if (WRITE) { if (starts) e.sentenceStartsMs = starts; else delete e.sentenceStartsMs; }
    }
    if (WRITE) { e.durationMs = dur; e.timingFrom = 'mp3'; }
    report.push(row);
  }
}
ws.close();
proc.kill();
await sleep(500);
try { rmSync(profile, { recursive: true, force: true }); } catch {}

const moved = report.filter((r) => Math.abs(r.after - r.before) > 150);
console.log(`${report.length} clips decoded; ${moved.length} differ from the manifest by more than 150 ms`);
for (const r of moved.sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before)).slice(0, 12)) console.log(`  ${r.key.padEnd(24)} ${r.before} → ${r.after} ms`);
if (WRITE) {
  m.retimedFromMp3At = new Date().toISOString();
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2) + '\n');
  console.log(`written: ${MANIFEST}`);
} else console.log('(report only; add --write to update the manifest)');
writeFileSync(join(ROOT, 'docs', 'qa', 'narration-retime.json'), JSON.stringify(report, null, 1));
