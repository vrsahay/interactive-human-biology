# Step 16A — reference audit

Read-only comparison. Nothing in the product was changed: this branch (`step16a-reference-audit`, from
`step15b-learner-clarity` @ `b8ca17e`) adds only `qa/step16/`.

---

## 1. What was run, and how

### Our product

| | |
|---|---|
| Build | `dist/` produced at 2026-09-18 19:16:58, `sha256(dist/index.html) = 0b916e76b2c0b418…` |
| Commit | `b8ca17e` — *Step 15B: expert review package for the clarity-pass candidate* |
| Command | `node pipeline/tools/serve_static.mjs dist 4195` |
| URL | `http://localhost:4195/` |
| Browser | Chromium (desktop Browser pane), WebGL2 / ANGLE D3D11 |
| Entry | **No landing screen.** The film begins playing the moment the page loads. |
| Duration | 4:40 (279.6 s), 9 chapters, 40 shots |

Verified the server was serving the build on disk by hashing both sides before watching.

### The reference

| | |
|---|---|
| URL | `https://respiratory-system-lesson.vercel.app/` |
| Title | *The Journey of a Breath* — "3D LESSON · 13 SCENES · ABOUT 3 MIN" |
| Shipping shape | One HTML document, one ~130 KB inline script, one 12.6 MB GLB |
| Entry | Loading card → landing card with **Start lesson** / **Explore the model** |
| Duration | 2:48 (168.4 s), 13 scenes, no chapters |
| Narration | Google Cloud TTS, `en-IN-Chirp3-HD-Aoede` — **the same voice our build uses** |

Both were driven as a learner: clicked through, watched end to end, screenshotted every scene,
used Explore, used search, used the controls. The reference's own data (`window.lesson.timeline.sections`)
was read afterwards to put exact numbers on what had already been watched.

---

## 2. What the reference actually is

A single continuous **journey**. One breath of air enters the nostrils in scene 2 and is still travelling in
scene 10. The camera follows it. There is no chapter menu, no quiz, no manipulation of the model, and no
"explore this part" during the lesson — the lesson is 2 minutes 48 seconds of continuous guided observation,
then an end card offering **Replay** or **Explore the model**.

### The 13 scenes

| # | id | Title | Dur | Spoken sentences |
|---|---|---|---|---|
| 1 | `intro` | Human Respiratory System | 13.9 s | 2 |
| 2 | `nose` | Nostrils | 10.5 s | 2 |
| 3 | `nasalCavity` | Nasal Cavity | 11.7 s | 2 |
| 4 | `pharynx` | Pharynx | 9.1 s | 2 |
| 5 | `larynx` | Larynx | 10.9 s | 2 |
| 6 | `trachea` | Trachea | 10.9 s | 2 |
| 7 | `bronchi` | Bronchi | 10.3 s | 2 |
| 8 | `bronchioles` | Bronchioles | 10.1 s | 2 |
| 9 | `lungs` | Breathing In | 12.0 s | 2 |
| 10 | `alveoli` | Alveoli | 15.0 s | 3 |
| 11 | `gasExchange` | Gas Exchange | 17.8 s | 3 |
| 12 | `exhalation` | Breathing Out | 16.8 s | 3 |
| 13 | `summary` | The Journey of a Breath | 19.3 s | 4 |

**Scene length is derived from the narration, not authored.** Each section carries `speechMs` (measured
length of its synthesised audio), an optional `minMs` floor and a `leadMs`; `dur` is the larger of the two
plus a tail. Example: `gasExchange` has `speechMs: 15768`, `minMs: 17000`, `dur: 17768`. The picture is cut
to the voice. Our shots are the reverse — `durationMs` is authored and narration is built to fit it.

---

## 3. Measured comparison of the two scripts

| | Reference | Ours |
|---|---|---|
| Running time | 168.4 s | 279.6 s |
| Beats (scene / shot) | 13 | 40 |
| Mean beat length | **13.0 s** | **7.0 s** |
| Spoken words | 427 | 356 |
| Spoken words per second | **2.54** | **1.27** |
| Spoken sentences | 31 | 42 |
| Spoken words per beat | **32.8** | **8.9** |
| Scene/shot changes per minute | **4.6** | **8.6** |
| On-screen text layers | 2 (fixed caption + rolling subtitle) | 1 (caption **is** the narration) |

Two facts follow from this table and almost everything else in this audit follows from those two:

1. **The reference talks twice as much per second as we do.**
2. **It changes what you are looking at half as often.**

---

## 4. Verified facts about the reference (evidence, not impression)

- **Two independent text layers.** Top-left: scene number (`RESPIRATORY SYSTEM · 04 / 13`), scene title, a
  one-line caption, and a thin progress underline. Bottom-centre: a live subtitle of the sentence currently
  being spoken. The caption is a *summary*; the subtitle is the *script*. They are different text.
- **Controls are explicitly hidden during teaching.** The control bar carries `class="controls hidden"`.
  Observed absent through scenes 1–8 and present at the end card.
- **Glosses are attached to exactly the words a Class-10 learner would not know.** The script contains
  exactly five: `conchae → "curved shelves of bone"`, `pharynx → "throat"`, `larynx → "voice box"`,
  `trachea → "windpipe"`, `alveoli → "air sacs"`. *Ribs*, *lungs*, *diaphragm*, *bronchi*, *blood capillaries*
  carry none — they need none. The rule is visible in the data: **gloss the unfamiliar term, in the label,
  at the moment it appears.**
- **Every scene pushes in.** Each `shot` has `padding` > `paddingEnd` (e.g. `bronchioles` 1.08 → 0.82) so the
  frame closes slowly on the subject for the whole scene. Four scenes also carry a slow `orbit`
  (intro 36°, summary 50°, gasExchange 30°, alveoli 20°).
- **Continuity is built into the camera.** `alveoli` and `gasExchange` both use `alignTo: "heroCut"` with
  small `azOffset`/`elOffset` — the second shot starts from where the first ended rather than cutting.
- **A legend appears only where it is needed.** The O₂ / CO₂ / Air colour key is on screen in the
  `gasExchange` scene and nowhere else.
- **The lesson ends with an explicit "Lesson Complete" card** offering *Replay* and *Explore the model*.
- **Accessibility:** `lang="en"`, `aria-live="polite"` on the subtitle, `aria-label` on every control,
  a `prefers-reduced-motion` block, headings present. The canvas has **no** `role`, no `aria-label` and
  `tabindex="-1"`; there is no keyboard interaction with the model and no per-scene text alternative for
  what is being shown.
- **There is no assessment of any kind.** No quiz, no question, no check, no recall.

---

## 5. One difference that is not about teaching, and matters

Under the same throttled rendering conditions in the same browser pane:

| | Frames/s observed | Film clock advance |
|---|---|---|
| Reference | low (throttled) | **real time** — stayed in step with its own audio |
| Ours | 1.6–2.1 fps | **0.125× real time** |

Cause, read from our own source: `src/engine/core/RenderLoop.ts:81` —
`const dt = this.lastFrame ? Math.min(100, now - this.lastFrame) : 16.7;` — the film's clock is advanced by
the render loop's frame delta, clamped at 100 ms. Below ~10 fps the film plays in slow motion while the
narration audio, which runs on the audio clock, does not. The two drift apart.

This is normally invisible: on this machine, in Playwright with a real GPU, the film runs at 60 fps. It
becomes visible on any device that drops under ~10 fps — which is exactly the class of device Step 12 is
still failing on (emulated phone ×4: first meaningful 3D 2742 ms, drag p95 45.1 ms).

The reference is immune to this because its player time comes from a wall clock and its speech scheduling
from the audio element, not from frames.

**Recorded here as an observation. No change was made.**

---

## 6. Two entry-point differences worth naming

1. **We have no start gesture.** The reference's landing card ("13 scenes · about 3 min", *Start lesson*,
   *"Narrated by Google Cloud TTS — turn your sound on"*) does three jobs at once: it sets the time
   expectation, it tells the learner sound matters, and it produces the user gesture that browsers require
   before audio may play. Our film autoplays with narration on. In this browser pane autoplay is permitted
   (verified: `new Audio(...).play()` resolves with `navigator.userActivation.hasBeenActive === false`), so
   narration was heard. **On a stock Chrome/Safari profile with the default autoplay policy it would not be**,
   and the learner would watch the whole lesson silently without knowing anything was missing. This has not
   been verified on a stock browser profile and should be, before anything else on this list.
2. **We do not say how long it is.** The reference says "about 3 min" before you commit. We show `0:00 / 4:40`
   in a control bar.
