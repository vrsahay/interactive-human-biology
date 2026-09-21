// Narration synthesis (build time only).
//   TTS_KEY=<google-tts-api-key> npx tsx pipeline/audio/build_narration.ts [--voice en-IN-Chirp3-HD-Aoede] [--dry-run]
//
// The API key is read from the environment and is NEVER written to a file, a manifest or the web build: a TTS key shipped
// in client JS is readable by every visitor and billable to the key's owner. Only the synthesized audio ships.
//
// Narration content rule: the spoken text is assembled ONLY from strings that already exist in the locale, so nothing
// is written here and narration introduces no claim that has not been through the same provenance and review as the
// rest of the content. Step 16B adds one more string a shot may carry - narrationKey, the spoken explanation - which is
// an ordinary locale string with a provenance class, shown on screen as a subtitle and reviewed like any caption. The
// schematic/provenance notes stay on screen and are deliberately not spoken.
//
// Step 16B also inverts the timing relationship for instructional shots. A shot marked durationFrom "speech" no longer
// compresses its voice to fit an authored length; the shot is given the length its voice needs (plus a lead-in, a tail
// and the shot's own visual floor) and content/lessons/hinge-elbow.json is written back. Transitions and learner-paced
// shots keep their authored duration and the old rate-compression path.
//
// Step 14B adds CUES: instructional lines that are not part of any shot because the learner, not the clock, decides
// when they appear - the instruction in an exploration, and each question, correction and reveal in the recall
// challenge. A cue has no shot to fit inside, so it is always spoken at the natural rate. Cues are keyed by locale key.
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..", "..");
const arg = (k: string, d: string) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const DRY = process.argv.includes("--dry-run");
const VOICE = arg("--voice", "en-IN-Chirp3-HD-Aoede");
const LANG = "en-IN";
const OUT_DIR = join(ROOT, "public", "assets", "audio", "narration");
const KEY = process.env.TTS_KEY ?? process.env.GOOGLE_TTS_API_KEY;
if (!KEY && !DRY) throw new Error("TTS_KEY (or GOOGLE_TTS_API_KEY) must be set in the environment; it is never read from a file");

/** Speech must end before the shot does, with a lead-in so it does not start on the cut. */
const LEAD_IN_MS = 350;
const TAIL_MS = 400;
const RATE_MIN = 1;
const RATE_MAX = 1.35;

interface Shot {
  id: string;
  durationMs: number;
  caption?: { titleKey?: string; textKey?: string; noteKey?: string };
  interaction: { promptKey?: string; check?: { promptKey?: string } };
  narrationKey?: string;
  durationFrom?: "authored" | "speech";
  minDurationMs?: number;
}
interface Lesson {
  localeId: string;
  chapters: { id: string; shots: Shot[] }[];
  explores?: { exploreId: string; instructionKey: string; task?: { promptKey: string; doneKey: string } }[];
  recall?: { correctKey: string; incorrectKey: string; completeKey: string; steps: { stepId: string; questionKey: string; revealKey: string }[] };
}
const lesson = JSON.parse(readFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), "utf8")) as Lesson;
const locale = JSON.parse(readFileSync(join(ROOT, "content/locales/en/hinge-elbow.json"), "utf8")) as { strings: Record<string, { text: string; provenance: string }> };

const sentence = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

/**
 * Spoken line for a shot: existing locale strings only, in reading order, de-duplicated by key.
 * A shot with its own spoken explanation says that instead of repeating its headline caption back at the learner.
 */
function narrationFor(shot: Shot): { text: string; keys: string[] } {
  const keys: string[] = [];
  const push = (k?: string) => {
    if (k && locale.strings[k] && !keys.includes(k)) keys.push(k);
  };
  if (shot.narrationKey) push(shot.narrationKey);
  else {
    push(shot.caption?.titleKey);
    push(shot.caption?.textKey);
  }
  push(shot.interaction.check?.promptKey ?? shot.interaction.promptKey);
  return { text: keys.map((k) => sentence(locale.strings[k].text)).join(" "), keys };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One clip. The service occasionally answers a burst of requests with an HTML error page rather than JSON, which used to
 * abort the build part-way through and leave the audio directory half-written; transient failures are retried with a
 * backoff and only a real API error stops the run.
 */
async function synthesize(text: string, rate: number, encoding: "LINEAR16" | "MP3"): Promise<Buffer> {
  const body = {
    input: { text },
    voice: { languageCode: LANG, name: VOICE },
    audioConfig: { audioEncoding: encoding, sampleRateHertz: 24000, speakingRate: rate },
  };
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    if (attempt) await sleep(600 * 2 ** (attempt - 1));
    const r = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${KEY}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const raw = await r.text();
    let j: { audioContent?: string; error?: { message: string } };
    try {
      j = JSON.parse(raw) as typeof j;
    } catch {
      lastError = `HTTP ${r.status}: ${raw.slice(0, 120).replace(/\s+/g, " ")}`;
      continue;
    }
    if (j.error) throw new Error(`${VOICE} ${encoding} rate ${rate}: ${j.error.message}`);
    if (!j.audioContent) {
      lastError = `HTTP ${r.status}: no audioContent`;
      continue;
    }
    return Buffer.from(j.audioContent, "base64");
  }
  throw new Error(`${VOICE} ${encoding} rate ${rate}: ${lastError}`);
}

/** Exact duration from the LINEAR16 (WAV) payload: 16-bit mono at the requested rate. */
const wavDurationMs = (wav: Buffer) => Math.round(((wav.byteLength - 44) / (24000 * 2)) * 1000);

// The lesson objects themselves, not copies: a speech-timed shot has its length written back into the lesson. The
// chapter id is carried alongside rather than assigned onto the shot - writing it onto the object put an undeclared
// property into the lesson file, which the content schema rightly rejected.
const shots = lesson.chapters.flatMap((c) => c.shots.map((s) => ({ shot: s, chapter: c.id, get id() { return s.id; } })));

// Step 16E: a clip is re-synthesised only when what it says has changed. The previous manifest records the exact text of
// every clip and the hash of its file; while both still match, the clip is kept as it is and the API is not called.
// `--all` forces a full rebuild.
interface PrevEntry { url: string; bytes: number; sha256: string; durationMs: number; speakingRate: number; shotDurationMs?: number; text: string }
const previous = ((): { shots: Record<string, PrevEntry>; cues: Record<string, PrevEntry> } => {
  try {
    return JSON.parse(readFileSync(join(OUT_DIR, "narration.json"), "utf8"));
  } catch {
    return { shots: {}, cues: {} };
  }
})();
const reusable = (prev: PrevEntry | undefined, text: string): prev is PrevEntry => {
  if (!prev || prev.text !== text || process.argv.includes("--all")) return false;
  try {
    return createHash("sha256").update(new Uint8Array(readFileSync(join(OUT_DIR, prev.url)))).digest("hex") === prev.sha256;
  } catch {
    return false;
  }
};
const synthesised: string[] = [];
const reused: string[] = [];

const entries: Record<string, unknown> = {};
const problems: string[] = [];
mkdirSync(OUT_DIR, { recursive: true });

/** Shot lengths this run wrote back, so the change is reported rather than silently applied. */
const retimed: { id: string; from: number; to: number }[] = [];

for (const entry of shots) {
  const shot = entry.shot;
  const { text, keys } = narrationFor(shot);
  if (!text) {
    console.log(`${shot.id.padEnd(17)} (silent - no caption or prompt)`);
    continue;
  }
  const speechTimed = shot.durationFrom === "speech";
  const budget = shot.durationMs - LEAD_IN_MS - TAIL_MS;
  if (DRY) {
    console.log(`${shot.id.padEnd(17)} ${speechTimed ? "speech-timed" : `budget ${String(budget).padStart(5)} ms`}  keys ${keys.join(" + ")}`);
    continue;
  }
  const prev = previous.shots[shot.id];
  // an authored shot's clip was fitted to that shot's length, so it is only reusable while the length is unchanged
  if (reusable(prev, text) && (speechTimed || prev.shotDurationMs === shot.durationMs)) {
    if (speechTimed) {
      const want = Math.max(shot.minDurationMs ?? 0, LEAD_IN_MS + prev.durationMs + TAIL_MS);
      const next = Math.ceil(want / 100) * 100;
      if (next !== shot.durationMs) {
        retimed.push({ id: shot.id, from: shot.durationMs, to: next });
        shot.durationMs = next;
      }
    }
    const finalBudget = shot.durationMs - LEAD_IN_MS - TAIL_MS;
    const fits = prev.durationMs <= finalBudget;
    if (!fits) problems.push(`${shot.id}: ${prev.durationMs} ms of speech does not fit the ${finalBudget} ms budget`);
    entries[shot.id] = { ...prev, leadInMs: LEAD_IN_MS, shotDurationMs: shot.durationMs, budgetMs: finalBudget, fits, textKeys: keys, text };
    reused.push(shot.id);
    continue;
  }
  synthesised.push(shot.id);
  // Start at the natural rate. A speech-timed shot keeps that rate and takes the length it needs; an authored one only
  // speeds up if the measured audio does not fit.
  let rate = RATE_MIN;
  let wav = await synthesize(text, rate, "LINEAR16");
  let ms = wavDurationMs(wav);
  if (speechTimed) {
    const want = Math.max(shot.minDurationMs ?? 0, LEAD_IN_MS + ms + TAIL_MS);
    // round up to a tenth of a second: shot lengths stay readable, and a re-run with identical audio is a no-op
    const next = Math.ceil(want / 100) * 100;
    if (next !== shot.durationMs) {
      retimed.push({ id: shot.id, from: shot.durationMs, to: next });
      shot.durationMs = next;
    }
  } else {
    while (ms > budget && rate < RATE_MAX) {
      rate = Math.min(RATE_MAX, +(rate * Math.min(1.35, ms / budget)).toFixed(3));
      wav = await synthesize(text, rate, "LINEAR16");
      ms = wavDurationMs(wav);
    }
  }
  const mp3 = await synthesize(text, rate, "MP3");
  const file = `${shot.id}.mp3`;
  writeFileSync(join(OUT_DIR, file), mp3);
  const finalBudget = shot.durationMs - LEAD_IN_MS - TAIL_MS;
  const fits = ms <= finalBudget;
  if (!fits) problems.push(`${shot.id}: ${ms} ms of speech at rate ${rate} does not fit the ${finalBudget} ms budget (overflow ${ms - finalBudget} ms)`);
  entries[shot.id] = {
    url: file,
    bytes: mp3.byteLength,
    sha256: createHash("sha256").update(new Uint8Array(mp3)).digest("hex"),
    durationMs: ms,
    speakingRate: rate,
    leadInMs: LEAD_IN_MS,
    shotDurationMs: shot.durationMs,
    budgetMs: finalBudget,
    fits,
    textKeys: keys,
    text,
  };
  console.log(`${shot.id.padEnd(17)} ${String(ms).padStart(5)} ms  rate ${rate.toFixed(2)}  ${Math.round(mp3.byteLength / 1024)} KB  ${fits ? "ok" : "OVERFLOW"}`);
}

// ------------------------------------------------------------------ cues
/** Learner-paced instructional lines: spoken when the learner reaches them, not when the clock does. */
const cueSpecs: { id: string; keys: string[] }[] = [];
for (const e of lesson.explores ?? []) {
  cueSpecs.push({ id: e.instructionKey, keys: [e.instructionKey] });
  // Step 16B: the task is what the learner is asked to do, and the confirmation is spoken when they have done it
  if (e.task) {
    // Step 16D: the task cue speaks the task and nothing else. It used to append the drag instruction, which for the
    // fixed joint was the same sentence twice and elsewhere repeated a line the panel already has on screen.
    cueSpecs.push({ id: e.task.promptKey, keys: [e.task.promptKey] });
    cueSpecs.push({ id: e.task.doneKey, keys: [e.task.doneKey] });
  }
}
if (lesson.recall) {
  for (const st of lesson.recall.steps) {
    cueSpecs.push({ id: st.questionKey, keys: [st.questionKey] });
    // the reveal is spoken the way the learner meets it: the confirmation, then the reason
    cueSpecs.push({ id: st.revealKey, keys: [lesson.recall.correctKey, st.revealKey] });
  }
  cueSpecs.push({ id: lesson.recall.incorrectKey, keys: [lesson.recall.incorrectKey] });
  cueSpecs.push({ id: lesson.recall.completeKey, keys: [lesson.recall.completeKey] });
}

const cues: Record<string, unknown> = {};
for (const cue of cueSpecs) {
  const missing = cue.keys.filter((k) => !locale.strings[k]);
  if (missing.length) {
    problems.push(`cue ${cue.id}: missing locale strings ${missing.join(", ")}`);
    continue;
  }
  const text = cue.keys.map((k) => sentence(locale.strings[k].text)).join(" ");
  if (DRY) {
    console.log(`cue ${cue.id.padEnd(26)} ${text}`);
    continue;
  }
  const prevCue = previous.cues[cue.id];
  if (reusable(prevCue, text)) {
    cues[cue.id] = { ...prevCue, textKeys: cue.keys, text };
    reused.push(`cue.${cue.id}`);
    continue;
  }
  synthesised.push(`cue.${cue.id}`);
  const wav = await synthesize(text, RATE_MIN, "LINEAR16");
  const ms = wavDurationMs(wav);
  const mp3 = await synthesize(text, RATE_MIN, "MP3");
  const file = `cue.${cue.id}.mp3`;
  writeFileSync(join(OUT_DIR, file), mp3);
  cues[cue.id] = {
    url: file,
    bytes: mp3.byteLength,
    sha256: createHash("sha256").update(new Uint8Array(mp3)).digest("hex"),
    durationMs: ms,
    speakingRate: RATE_MIN,
    leadInMs: 0,
    textKeys: cue.keys,
    text,
  };
  console.log(`cue ${cue.id.padEnd(26)} ${String(ms).padStart(5)} ms  ${Math.round(mp3.byteLength / 1024)} KB`);
}

if (DRY) process.exit(0);

const manifest = {
  schema: "joints.narration/1",
  lessonId: "hinge-elbow",
  localeId: lesson.localeId,
  generatedAt: new Date().toISOString(),
  generator: "pipeline/audio/build_narration.ts",
  voice: { name: VOICE, languageCode: LANG, gender: "FEMALE", accent: "Indian English", provider: "Google Cloud Text-to-Speech" },
  encoding: "MP3 24 kHz mono",
  contentRule: "Spoken text is assembled only from existing locale strings (the shot's narrationKey, or its caption title and text, plus the interaction prompt). Every one of those strings carries a provenance class and is shown on screen - the narrationKey as a subtitle - so narration adds no claim that has not been reviewed with the rest of the content. Provenance notes are not spoken.",
  timingRule: "Shots marked durationFrom \"speech\" take the length of their measured clip plus the lead-in, the tail and the shot's own visual floor; content/lessons/hinge-elbow.json is written back. Transitions and learner-paced shots keep their authored duration and are rate-compressed to fit if needed.",
  keyHandling: "The API key was supplied through the environment at build time and is not part of this manifest, the audio files or the web build.",
  timing: { leadInMs: LEAD_IN_MS, tailMs: TAIL_MS, rateRange: [RATE_MIN, RATE_MAX] },
  shots: entries,
  cues,
};
writeFileSync(join(OUT_DIR, "narration.json"), JSON.stringify(manifest, null, 1));

// Speech-timed shots take the length their voice needs: write the lesson back so the picture is cut to the voice.
if (retimed.length) {
  writeFileSync(join(ROOT, "content/lessons/hinge-elbow.json"), `${JSON.stringify(lesson, null, 1)}
`);
  console.log(`
retimed ${retimed.length} speech-timed shots:`);
  for (const r of retimed) console.log(`  ${r.id.padEnd(17)} ${r.from} -> ${r.to} ms`);
}

// A clip whose shot or cue no longer exists would otherwise sit in the build for ever, shipped and unreachable.
const referenced = new Set([...Object.values(entries), ...Object.values(cues)].map((e) => (e as { url: string }).url));
const orphans = readdirSync(OUT_DIR).filter((f) => f.endsWith(".mp3") && !referenced.has(f));
for (const f of orphans) rmSync(join(OUT_DIR, f));
if (orphans.length) console.log(`removed ${orphans.length} orphaned clips: ${orphans.join(", ")}`);

const total = [...Object.values(entries), ...Object.values(cues)].reduce((a, e) => a + (e as { bytes: number }).bytes, 0);
console.log(`\nwrote ${Object.keys(entries).length} shot clips + ${Object.keys(cues).length} cue clips + narration.json to public/assets/audio/narration (${Math.round(total / 1024)} KB total)`);
console.log(`synthesised ${synthesised.length}: ${synthesised.join(", ") || "none"}\nreused ${reused.length} unchanged clips`);
console.log(problems.length ? `PROBLEMS:\n  ${problems.join("\n  ")}` : "every clip fits its shot");
