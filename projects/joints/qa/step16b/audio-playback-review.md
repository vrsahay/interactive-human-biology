# Audio playback review — the lesson starts on the learner's gesture

## 1. The risk the audit raised

The film began playing the moment the page loaded, with narration on. Audio played in the desktop Browser pane — that
was verified directly: `new Audio(...).play()` resolved with `navigator.userActivation.hasBeenActive === false`. But
that pane permits autoplay. **On a stock Chrome or Safari profile, with the default autoplay policy, audible media is
blocked until the page has a user gesture.** A learner would have watched the whole lesson in silence, and nothing on
screen would have told them anything was missing.

The reference lesson avoids this with a landing card whose *Start lesson* button both sets the expectation and provides
the gesture. The audit ranked verifying this third of ten.

## 2. What shipped

A landing card over the first frame:

```
9 PARTS · ABOUT 6 MINUTES
Types of Joints
How the shape of a join decides the movement.
[ Start lesson ]
Narrated. Turn your sound on.
```

- It is the **only** way the lesson starts. Nothing plays behind it.
- `Start lesson` is a real click handler: in the same call stack it clears the narration player's blocked flag, enables
  the player and starts the timeline. A browser grants audio permission inside a gesture, so the permission and the
  playback happen together.
- `?autoplay=0` keeps the previous behaviour — no card, film paused, driven by the test harness. Every existing e2e
  test uses that route, so the card changed no existing test's meaning.

The narration player already handled refusal properly and still does: a refused `play()` sets `blocked`, the narration
button becomes an affordance, and the first interaction anywhere in the film retries. The landing card means that path
should now never be reached on a first visit.

## 3. What was tested

`tests/e2e/step16b-teaching.spec.ts` §5, on the default route with **no** autoplay override:

| Check | Result |
|---|---|
| The landing card is shown, with its button | pass |
| The film is not playing before the gesture | pass (`state().playing === false`) |
| **No audio before the gesture** | pass (`narration().paused === true`) |
| The card goes away on click | pass |
| The film is playing after the gesture | pass |
| **Audio is running after the gesture** | pass (`narration().paused === false`) |
| The autoplay block is clear | pass (`narration().blocked === false`) |
| The clip playing is the one the film is on | pass (`shot === "intro.title"`) |
| The spoken line is on screen as a subtitle | pass |

Also re-run and passing: the whole `narration` suite — the clip is positioned by the film clock, a finished clip is not
revived, the narration toggle is a real toggle, and narration is silent while the film is paused or held for the
learner.

## 4. What this does **not** claim

- **It is not a claim of universal browser compatibility.** It was tested in Chrome 152 on this machine. Safari,
  Firefox and mobile browsers have their own autoplay rules and have not been tested. What is now true is that the
  lesson does not *depend* on autoplay: it starts from a gesture, which is the condition every one of those policies
  is satisfied by.
- No real Android device, no real iPad. Step 12 remains **FAIL**.

## 5. Narration coverage after this step

| | Before | After |
|---|---|---|
| Shot clips | 40 | **52** |
| Cue clips (learner-paced) | 16 | **24** |
| Shots with no narration | 0 | **0** |
| Clips that overrun their shot | 0 | **0** |
| Orphaned clips left in the build | 3 | **0** (the build now removes them) |
| Voice | `en-IN-Chirp3-HD-Aoede` | unchanged |
| Total audio | 765 KB | **1493 KB** |

The eight new cues are the four exploration tasks and their four confirmations.

**Key handling is unchanged and still enforced:** the API key is supplied only through the `TTS_KEY` environment
variable at build time, is never written to a file, a manifest or the web build, and a unit test greps the shipped
manifest for an `AIza…` pattern.

The build script gained two things while it was open: a retry with backoff, because the service intermittently answers
a burst with an HTML error page and used to abort the run half-written; and removal of clips the manifest no longer
references.
