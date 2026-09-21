# Navigation — audio, caption and visual at every transition

Every transition the brief lists, checked for the four things that can go wrong: the wrong audio, a stale clip, two
clips, or a caption and a picture that disagree with the clip.

The rule under all of it: **the lesson timeline is the source of truth.** Nothing — animation, caption or narration —
advances on its own; each resolves from lesson time.

---

## 1. Seeking

`tests/e2e/step16c-invariants.spec.ts` §C. After each seek the test reads three independent things and requires them to
name the same shot: the timeline's `shotId`, the caption element's `data-shot`, and the narration element's `src`.

| Case | Seek to | Shot | Caption | Clip | Owners |
|---|---|---|---|---|---|
| inside the same shot | 59 000 ms | `fixed.bones` | `fixed.bones` | `fixed.bones.mp3` | 0 |
| into another shot | 115 100 ms | `pivot.rotate` | `pivot.rotate` | `pivot.rotate.mp3` | 0 |
| across chapters | 208 900 ms | `hinge.axis` | `hinge.axis` | `hinge.axis.mp3` | 0 |
| exactly on a chapter boundary | 302 500 ms | `compare.pullback` | `compare.pullback` | `compare.pullback.mp3` | 0 |
| one millisecond before that boundary | 302 499 ms | `hinge.knee` | `hinge.knee` | `hinge.knee.mp3` | 0 |
| the end of the lesson | 385 300 ms | `map.all` | *(the end card replaces the caption)* | `map.all.mp3` | 0 |

`owners: 0` is correct here — the film is paused after a seek, so nothing is speaking. What matters is that the element
is pointed at the right clip and that it is never pointed at the previous shot's.

**Forward and backward seeks** both work by the same path: `seeks` increments, the key changes, `sync()` takes the
"new position" branch, re-points `src` if the shot changed, and re-positions from `localMs − leadInMs`. If the lesson
is already past the end of the clip, the element stays silent rather than talking over the next cut.

## 2. Chapter navigation

§C2. Each jump is performed from a different chapter, so the test covers leaving as well as arriving.

| Jump | Lands on | Shot | Clip | Owners |
|---|---|---|---|---|
| 03 → 05 | chapter 4 | `ball.travel` | `ball.travel.mp3` | 0 |
| 05 → 04 | chapter 3 | `pivot.travel` | `pivot.travel.mp3` | 0 |
| 06 → 01 | chapter 0 | `intro.title` | `intro.title.mp3` | 0 |
| 01 → 09 | chapter 8 | `map.intro` | `map.intro.mp3` | 0 |

No stale clip in any of them: the old clip is stopped by the `src` change, and the lead-in timer is cleared on every
key change so a pending start cannot fire after the jump.

## 3. Pause and resume

- **Pause**: `running` becomes false, the clip is paused where it is, and the lesson clock is held at the same instant,
  so the two stay together.
- **Resume**: `sync()` re-positions from lesson time before playing, so a pause of any length cannot leave the clip
  behind.
- **Learner holds the joint** (`hinge.try`) and **held for a check** (`hinge.check`) are the same case: `running` is
  false, the clock is held, narration waits.

## 4. Explore → Return

Covered by §E and §B.

| | |
|---|---|
| Entering | the film pauses, so its clip stops; then `playCue()` takes ownership. Inside the panel: `paused: true`, `owner: "cue"`, `owners: 1`. |
| The task cue | replaces the instruction cue rather than joining it — `playCue()` always stops the previous cue. |
| The confirmation | replaces the task cue when the goal is met. |
| Returning | `stopCue()` stops the cue, releases ownership and clears the shot key; the next `sync()` re-positions the film's clip from lesson time. Measured outside the panel: `cuePlaying: false`, `owner: "none"`, `owners: 1` maximum. |
| The handover | now fires only once the handover shot has finished speaking, so the film is not cut off mid-sentence (see `narration-sync-review.md` §2). |

## 5. Recall → next chapter

- Each question, correction and reveal is a cue; each replaces the last.
- **The completion line is no longer cut off.** It used to be started and then stopped in the same call stack. The
  panel now closes without silencing it, the film seeks on to the body map, and the body map's own narration waits
  because the cue still owns the floor.

## 6. Replay and completion

- **Replay** seeks to 0 and plays; ownership is released and the first clip is re-positioned from lesson time. The
  completion card's *Replay* also re-arms the exploration handovers and the recall so the lesson is genuinely fresh.
- **End of lesson**: the last clip finishes and nothing restarts it. The end card replaces the caption, so the caption
  check is skipped there by design — the test asserts `ended: true` and the correct clip instead.

## 7. Measured summary

Across the ten navigation cases above:

| | |
|---|---|
| Clip belongs to the current shot | **10 of 10** |
| Caption belongs to the current shot | **9 of 9** where a caption is on screen |
| Stale clips | **0** |
| More than one owner at any point | **0** |
| Console errors | **0** |
