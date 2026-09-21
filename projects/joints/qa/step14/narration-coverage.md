# Narration coverage

Voice: **en-IN Chirp3-HD-Aoede**, Google Cloud Text-to-Speech, MP3 24 kHz mono. The key is supplied through the
environment at build time and is never written to a file, a manifest or the web build; a unit test greps the whole build
output for it.

**Content rule, unchanged from Step 13:** no narration sentence is written by the synthesizer step. Every spoken line is
assembled from locale strings that already exist and are already on screen, so narration cannot introduce an educational
claim that the caption has not made and provenance has not marked. Provenance notes (the schematic notes, the DRAFT
badge) stay on screen and are deliberately **not** spoken.

## Two kinds of clip

- **Shot clips** — one per shot, positioned against the film clock. A clip is always shorter than its shot; the
  synthesizer speeds up to at most 1.35× if needed and reports an overflow if it still would not fit.
- **Cue clips** (new in 14B) — learner-paced lines that belong to no shot, because the learner decides when they happen.
  They are spoken at the natural rate on their own audio element, so they cannot be silenced by the film being paused.

## Every shot

38 of 39 shots speak. **54 clips, 732 KB total, 0 overflows.**

| Chapter | Shot | Shot (s) | Spoken from | Clip | Provenance |
|---|---|---|---|---|---|
| 01 hook | `intro.title` | 8.0 | `intro.title` + `intro.subtitle` | 5240 ms | figure-reference / draft |
| | `hook.shoulder` | 6.5 | `hook.shoulder` | 3440 ms | draft |
| | `hook.elbow` | 6.5 | `hook.elbow` | 2440 ms | draft |
| | `hook.question` | 6.0 | `hook.question` | 3320 ms | draft |
| 02 what is a joint | `concept.meet` | 6.5 | `concept.meet` | 2360 ms | draft |
| | `concept.different` | 7.0 | `concept.different` | 3080 ms | draft |
| | `intro.map` | 7.5 | `intro.where` | 4160 ms | draft |
| 03 fixed | `fixed.travel` | 6.0 | `chapter.fixed` | 1680 ms | figure-reference |
| | `fixed.detail` | 8.0 | `fixed.text` | 5320 ms | draft |
| 04 pivot | `pivot.travel` | 6.0 | `chapter.pivot` | 1360 ms | figure-reference |
| | `pivot.rotate` | 9.0 | `pivot.text` | 5000 ms | draft |
| 05 ball-and-socket | `ball.travel` | 6.0 | `chapter.ball_socket` | 1720 ms | figure-reference |
| | `ball.shoulder` | 8.5 | `ball.text.shoulder` | 7560 ms | draft |
| | `ball.hip` | 8.0 | `ball.text.hip` | 2320 ms | draft |
| 06 hinge | `hinge.travel` | 6.0 | `chapter.hinge` | 1360 ms | figure-reference |
| | `hinge.source` | 7.5 | `source.elbow_hinge` | 4400 ms | **source excerpt** |
| | `hinge.bones` | 7.0 | `hinge.bones` | 3160 ms | draft |
| | `hinge.axis` | 7.0 | `hinge.axis` | 3360 ms | draft |
| | `hinge.flexion` | 9.5 | `hinge.flexion` | 2720 ms | draft |
| | `hinge.extension` | 9.5 | `hinge.extension` | 2440 ms | draft |
| | `hinge.try` | 14.0 | `hinge.try` + `hinge.try_prompt` | 5640 ms | draft / ui |
| | `hinge.check` | 14.0 | `check.prompt` | 3720 ms | draft |
| | `hinge.support` | 10.5 | `hinge.support` | 3200 ms | draft |
| | `hinge.return` | 5.5 | — | **silent** | — |
| | `hinge.knee` | 8.5 | `hinge.knee` | 2040 ms | draft |
| 07 compare | `compare.pullback` | 6.0 | `compare.intro` | 2840 ms | draft |
| | `compare.fixed` | 5.0 | `compare.fixed` | 2680 ms | draft |
| | `compare.pivot` | 5.0 | `compare.pivot` | 2680 ms | draft |
| | `compare.ball` | 5.0 | `compare.ball` | 3480 ms | draft |
| | `compare.hinge` | 5.0 | `compare.hinge` | 2800 ms | draft |
| | `compare.together` | 8.0 | `compare.together` | 2720 ms | draft |
| 08 recall | `recall.open` | 5.0 | `recall.open` | 3720 ms | draft |
| | `recall.challenge` | 6.0 | `recall.start_hint` | 2320 ms | draft |
| 09 body map | `map.intro` | 5.0 | `map.intro` | 2640 ms | draft |
| | `map.fixed` | 4.0 | `map.fixed` | 2440 ms | draft |
| | `map.pivot` | 4.0 | `map.pivot` | 2880 ms | draft |
| | `map.ball` | 4.0 | `map.ball` | 2673 ms @1.24× | draft |
| | `map.hinge` | 4.0 | `map.hinge` | 2800 ms | draft |
| | `map.all` | 10.0 | `recap.compare` | 6840 ms | draft |

**The one silent shot is `hinge.return`**, a wordless transition that has no caption and therefore no instructional text.
A test asserts that it is the *only* silent shot, so a future beat cannot be added without a voice by accident.

## Every learner-paced line

16 cue clips. None of them existed before this step; all of the Step-14 Explore and recall text was silent.

| Cue | Clip | Spoken |
|---|---|---|
| `explore.fixed.instruction` | 1680 ms | "Try to move the skull bones." |
| `explore.pivot.instruction` | 1960 ms | "Drag left and right to turn the head." |
| `explore.ball.instruction` | 2720 ms | "Drag in any direction to move the arm." |
| `explore.hinge.instruction` | 2400 ms | "Drag to bend and straighten the elbow." |
| `recall.q.skull` | 2160 ms | "These skull bones hardly move at all." |
| `recall.a.skull` | 6080 ms | "Yes. That is right. Fixed: the bones hold firm, so there is little or no movement." |
| `recall.q.neck` | 2320 ms | "The head turns around the bone below it." |
| `recall.a.neck` | 5120 ms | "Yes. That is right. Pivot: one bone rotates around another." |
| `recall.q.shoulder` | 2240 ms | "The arm moves in many directions." |
| `recall.a.shoulder` | 6520 ms | "Yes. That is right. Ball-and-socket: the rounded end sits in a socket, so it moves many ways." |
| `recall.q.elbow` | 3360 ms | "This joint bends and straightens in one direction." |
| `recall.a.elbow` | 5240 ms | "Yes. That is right. Hinge: it bends and straightens in one main direction." |
| `recall.q.knee` | 3040 ms | "This joint in the leg bends and straightens one way." |
| `recall.a.knee` | 5280 ms | "Yes. That is right. Hinge: the knee bends and straightens, like the elbow." |
| `recall.incorrect` | 2520 ms | "Not that one. Look at how it moves." |
| `recall.complete` | 2480 ms | "You named every joint from the way it moves." |

Every cue string is `draft-enrichment` and carries the DRAFT badge on screen.

## Synchronisation

- A shot clip is positioned **from the shot's local time**, never the other way round: the film owns the clock. If the
  clock stalls or jumps (buffering, a seek, a background tab) the clip is re-seeked to follow the film, and a finished
  clip is never revived.
- A cue is spoken the moment the learner causes it — opening an exploration, being shown a question, answering right or
  wrong — and is stopped when they leave. It uses a second audio element, because the film is paused exactly then and the
  shot element is deliberately silent.
- Narration can be switched off from the top bar. When the browser refuses autoplay (no gesture yet) the control says so
  rather than failing silently — WCAG 1.4.2.

## What is still not spoken, on purpose

- The schematic notes and the DRAFT badge. Speaking them would need up to 2.1× compression against the shot durations,
  and they are provenance marks for a reader, not teaching lines.
- The screen-reader (`a11y.*`) descriptions, which exist for a screen reader rather than for the room.
