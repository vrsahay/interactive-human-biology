# Narration repeating words — root cause and fix (Step 16G)

**Reported:** "there is repetition of words in narration like — joints joints — and many more."

## 1. It was not the script

Every narration clip's text was scanned:

| Check | Repeats found |
|---|---|
| The same word twice in a row, inside any of the 76 clips | **0** |
| The last word of one shot's clip equal to the first word of the next | **0** |

The repetition was in **playback**: the audio being moved backwards while it was speaking.

## 2. Measured

`qa/step16g/audit_replays.mjs` plays the whole lesson in real time from the Start button, as a learner does. It hooks
every assignment to an audio element's `currentTime`, recording where it jumped from, where to, and the call stack.

| | Before | After |
|---|---|---|
| Backward jumps while speaking (heard as repeated words) | **3**: `hook.elbow` 0.92 → 0.62 s, `hook.question` 0.89 → 0.59 s, `fixed.try` 0.89 → 0.59 s | **0** |
| Forward skips while speaking (heard as a clipped word) | 0 | **0** |
| Clips that started speaking before their lead-in had ended | **35 of 35** observed | **0 of 52** |
| Worst gap between clip and film while speaking | — | 0.43 s on the lesson's first clip, closed by speaking at 1.15×; every other shot ≤ 0.08 s |

Every backward jump was 0.30 s: exactly the drift tolerance. That is the word or two just spoken.

## 3. Cause

`NarrationPlayer.sync()`:

1. When a shot starts, the clip is set to 0 and a timer is armed to start it after the 350 ms lead-in, so speech never
   begins on the cut.
2. The very next frame, about 16 ms later, calls `sync()` again with the same shot key. That path did not know about
   the lead-in: it saw a paused element and **played it immediately**. The timer never mattered.
3. So every clip started up to 0.33 s before the film expected it, and ran ahead by that much.
4. When the gap crossed the 0.3 s tolerance, the drift corrector **rewound** the clip 0.3 s to match the film. The
   learner heard the last word or two again: "… joints … joints".

Whether a shot crossed the tolerance depended on how long the browser took to begin playing the clip. That is why the
repeats sounded random, and why they would differ between devices.

A third fault turned up in the same code: a lead-in timer armed before a pause still fired, so a paused film could
start speaking.

## 4. Fix (`src/engine/video/NarrationPlayer.ts`)

| Rule | How |
|---|---|
| A clip never starts before its lead-in ends | the per-frame path stays silent while lesson time is inside the lead-in; the timer, re-armed from lesson time if needed, starts the clip |
| A paused film never starts a clip | pausing clears the lead-in timer |
| **Speech is never rewound** | a clip that gets ahead of the film for any reason pauses, silent, until the film catches up, then carries on from the same word. The corrector no longer seeks backwards at all |
| A small lag drops no words | a clip up to 1.5 s behind (e.g. the first clip decoding late) speaks at 1.15×, pitch preserved, until level |
| Only a real stall skips | more than 1.5 s behind: skip forward to the film, never back |

No clip, text, timing, shot length or lesson content changed.

## 5. Guarded by tests

`tests/unit/narration-sync.test.ts` drives the real player against a fake audio element that records every position
it is given:

| Test | Old player | Fixed player |
|---|---|---|
| a clip does not start before its lead-in ends, although `sync()` runs every frame | **fails** | passes |
| a clip that runs ahead of the film is held, never rewound | **fails** | passes |
| pausing the film during the lead-in does not let the clip start | **fails** | passes |
| a clip a little behind speaks slightly faster until level, with no seek | — (new behaviour) | passes |
| a clip far behind (a real stall) skips forward, never back | passes | passes |

The end-to-end narration, ownership and sync suites (`narration`, `step16c-invariants` B, C, D, E, and
`step16d-polish` 7, 8) are re-run in the full regression.

## 6. What was not tested

A human listening on a real phone or tablet. This audit is headless desktop Chrome with real audio decoding and real
time; the fix removes the mechanism itself, which is why it should hold on slower devices too, but that has not been
heard on one.
