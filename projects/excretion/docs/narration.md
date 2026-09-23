# Narration: Google Cloud Text-to-Speech

Final narration is pre-rendered Google Cloud TTS. **No browser or device voice is ever used.** Without clips, the lesson plays silently with captions and never falls back to a device voice.

## Same voice as Types of Joints

Settings were read from `joints-platform/pipeline/audio/build_narration.ts` and reused:

| Setting | Types of Joints | Excretion in Plants |
|---|---|---|
| Provider | Google Cloud Text-to-Speech, `v1/text:synthesize` | same |
| Language | `en-IN` | same |
| Voice | `en-IN-Chirp3-HD-Aoede` (female, Indian English) | same |
| Speaking rate | 1.0 (natural; 1.0–1.35 only to squeeze authored shots) | 1.0 (every shot takes the length its voice needs) |
| Pitch | not set (Chirp 3 HD voices take no pitch) | same |
| Output | MP3, 24 kHz mono (`sampleRateHertz: 24000`) | same |
| Measuring | LINEAR16 render for the exact length, then MP3 | same, and the LINEAR16 also gives the sentence starts (for captions) |
| Lead-in | 350 ms after the cut | same |
| Cache | reuse a clip while its text is unchanged and its file hash matches | same, plus voice and rate must match |
| Orphans | clips no line uses are deleted | same |

## Pipeline: `pipeline/narration/build-narration.mjs` (build time only)

```bash
cd web
npm run narration:plan      # dry run: what would be synthesised (no key needed)
npm run narration           # synthesise new or changed lines (needs TTS_KEY)
node ../pipeline/narration/build-narration.mjs --all      # force a full rebuild
node ../pipeline/narration/build-narration.mjs --script   # write docs/narration-script.md
```

1. **Reads the script from the lesson data** through `web/src/narration/script.js`, the same module the runtime uses: 56 shot clips (one per shot) plus 28 cues (task confirmations, recall questions and reveals, the open prompt, the model answer, Explore lines).
2. **Caches.** A clip is kept when its text, voice and rate are unchanged and the file on disk matches its recorded SHA-256. Only new or changed lines are sent to the API.
3. **Stable filenames** in `web/public/audio/excretion/`:
   - `01_what_alive.mp3` … `03c_vacuole_store.mp3` (chapter number, section letter, shot id);
   - `cue_recall_water_question.mp3` …
4. **Manifest** `web/public/audio/excretion/narration.json` records, per clip: url, bytes, sha256, durationMs, leadInMs, sentenceStartsMs, voice, speakingRate and text.
5. **Browser-compatible format:** MP3, as Types of Joints uses. The brief’s `.wav` example would ship about 20 MB instead of about 2 MB.

Current script: 1,341 words, 7,188 characters, 84 lines. The full text is in `docs/narration-script.md`.

## The key

- Read only by the pipeline, from the environment `TTS_KEY` (or `GOOGLE_TTS_API_KEY`, as Joints accepts), or from the project’s own **git-ignored** `.env` (`TTS_KEY=…`; see `.env.example`).
- Sent in the `x-goog-api-key` request header, never in a URL. Never printed or logged, and never written to the manifest, the audio, lesson data, HTML, the web build or git.
- The browser only downloads MP3 files and `narration.json`, with no key and no API call. `npm run qa:secrets` scans source, build, GLBs, manifest and docs for key patterns (and for the live key value, compared in memory).

**Status:** generated on 2026-09-22 with the key supplied by the user. The key was passed through the environment for that run only; it is not stored in the project (no `.env` was written, because this folder syncs to OneDrive).

- **Output:** 84 clips (56 shots + 28 cues), 1.77 MB MP3, 5:06 of speech.
- **Sentence starts:** detected in every shot clip.
- **Length:** the lesson re-timed from the estimated 8:04 to **6:44**.
- **Verification:** `qa:secrets` compared the live key against 119 files; the key appears nowhere in the project.

To regenerate after editing the lesson (only changed lines are sent):

```bash
cd web
TTS_KEY=... npm run narration
```

Or put `TTS_KEY=...` in `Excretion in Plants - Class 10/.env` and run `npm run narration`. The lesson picks up the clips automatically; shots re-time to the real voice lengths.

## Sync and ownership (runtime: `web/src/narration/NarrationPlayer.js`)

The same discipline as the Types of Joints player, re-implemented:

- **The film owns the clock.** Audio follows it; the film never waits for audio. Each clip fits inside its shot.
- **One audible owner:** `film`, `cue` or `none`. A cue silences the film first. When the cue ends, the film re-positions from lesson time. QA counter `maxAudible` must stay ≤ 1.
- **Re-positioning only when the film jumps.** The key is shot id plus seek count, so seek, scrub, chapter jump, restart and resume-after-a-cue re-position; nothing else does.
- **No repeated first words.** A clip never starts before its 350 ms lead-in (a timer checks its key before playing), and never rewinds inside a shot. If audio runs ahead it holds silently until the film catches up. QA counter `rewinds` must stay 0.
- **Behind by a little:** speak at 1.15× (pitch kept) until level. **Behind by a real stall** (over 1.5 s): move forward. Corrections are at least 700 ms apart.
- **No replay on every tick:** `play()` is only called on a paused element, and a finished clip is never revived.
- **No stale listeners:** at most one pending metadata listener; the lead-in timer is cleared on every jump.
- **Cues:** every seek stops them. Leaving Explore or Recall stops them. A task’s confirmation plays in full before the film moves on.
- **Autoplay:** the Start button is the gesture, and a silent sound unlocks both elements inside it.
- **Hidden page:** the film pauses.
- **Captions** change at the measured sentence starts (`sentenceStartsMs`).

Automated check: `app.qa.audioTest()` (dev server, `?qa=1`). With `&qa-audio=fixture` it uses a generated tone set laid out exactly like the real clips (`npm run qa:audio-fixture`, dev only, never shipped), so sync can be tested before the Google clips exist. Results are in the QA report.
