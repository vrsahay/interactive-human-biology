# Narration review — `step16g-narration-repetition-fixed`

**This section matters most for this candidate.** Step 16G changed how narration plays. Please **listen to the whole
lesson**, start to finish, with the sound on. Automated measurement is recorded below so that you can weigh it; it does
not replace a human ear. Every item is **PENDING**. Record decisions in `expert-review-status.json → narration`.

---

## 1. What the learner hears

| | |
|---|---|
| Voice | Google Cloud Text-to-Speech, `en-IN-Chirp3-HD-Aoede` (Indian English, female) |
| Film clips | **52 of 52 shots speak**; every clip at the natural rate (1.0), and each fits inside its shot |
| Learner-paced cues | **24**: each exploration's instruction, task and confirmation, and every recall question, correction and reveal |
| Total audio | 1 432 KB across 76 clips, fetched a clip at a time after the lesson starts |
| Content rule | spoken text is assembled only from strings already in the lesson, each carrying a provenance class. The narration adds no claim that is not also reviewable in `strings-inventory.json` |
| Lead-in | each shot's clip begins **350 ms after the cut**, so speech never starts on a camera change |

## 2. The Step-16G fix

**The fault a learner could hear.** Narration could begin about 350 ms too early: the frame after each cut started the
clip before its lead-in had ended. The clip then ran ahead of the lesson. When the gap passed 0.3 s, the sync code pulled
the audio back 0.3 s, and the learner heard the end of a word and then the word again: *"… joints … joints"*. How often it
happened depended on how quickly the device decoded audio, so it sounded random.

**What the candidate does now:**

- Narration respects its 350 ms lead-in; it never starts before it.
- Audio is **never rewound** because it is ahead. If it gets ahead, it waits, silently, until lesson time catches up,
  and then carries on from the same word.
- If it is slightly behind, it may play at up to **1.15×** with no pitch change until it is level. No word is dropped.
- It seeks forward only after a genuine stall of more than 1.5 s, and never backwards.
- Pausing during the lead-in cannot accidentally start narration.

**Recorded evidence.** A full real-time playthrough from the Start button, logging every change to the audio position
(`qa/step16g/audit_replays.mjs`, `qa/reports/step16g.replays.{before,after}.json`):

| | Before | After (this candidate) |
|---|---|---|
| Mid-sentence replays (a word heard twice) | **3** (`hook.elbow`, `hook.question`, `fixed.try`) | **0** |
| Clips starting before their intended lead-in | **35 of 35** observed | **0 of 52** |
| Words skipped | 0 | **0** |
| Largest gap between voice and picture while speaking | — | 0.43 s on the very first clip after Start, closed by the 1.15× catch-up; every other shot ≤ 0.08 s |

`tests/unit/narration-sync.test.ts` drives the real player against a recording fake: three of its tests fail against
the old player.

## 3. Standing narration guarantees (automated, on this candidate)

| Guarantee | Evidence |
|---|---|
| At most one narration owner at a time: no double voice | `step16c-invariants` B; `step16d-polish` 7 |
| No stale audio after navigation, seeking or chapter jumps | `step16c-invariants` C, C2, E; `step16d-polish` 8 |
| No duplicate audio at an Explore handover: the film's clip is silent while the task cue speaks | `step16c-invariants` E; review captures `handover_fixed`, `handover_pivot`, `handover_ball` record owner = cue, one audible element, film clip paused |
| Narration keeps up when frames are dropped | `step16c-invariants` D |
| No accidental duplicate lines in the script; useful repetition is kept deliberately | `step16d-polish` 5, 6 |
| Every clip fits its shot at the natural rate | `narration` unit tests |

## 4. What only a listener can judge

- [ ] **N1** Clarity: every sentence is intelligible. — **PENDING**
- [ ] **N2** Pacing, for a Class 10 learner. — **PENDING**
- [ ] **N3** Naturalness of the voice and delivery. — **PENDING**
- [ ] **N4** Narration **explains** (it says what to look at, what is happening and why) rather than reading labels. — **PENDING**
- [ ] **N5** The repetition you hear is **pedagogical** (a category named, then anchored; the thesis restated at the
      end), not accidental. — **PENDING**
- [ ] **N6** No replayed words, clipped words or double voices anywhere in the full lesson, including through the
      three automatic Explore handovers and the recall challenge. — **PENDING**
- [ ] **N7** The voice stays understandable over the whole 6 min 21 s. — **PENDING**
- [ ] **N8** Headline on screen plus the spoken sentence as a subtitle helps rather than distracts. — **PENDING**

Automated tests do not replace human listening, and nothing here claims they do.

## 5. Reviewer record

| | |
|---|---|
| Status | **PENDING** |
| Reviewer (name, role) | |
| Date | |
| Device and headphones or speaker used | |
| Findings | |
| Decision | |
