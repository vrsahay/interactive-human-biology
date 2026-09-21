# Learner script review — headline caption and spoken explanation

## 1. The change in architecture

Until this step the caption *was* the narration: one string per shot, shown and spoken. The Step-16 audit measured what
that cost — **1.27 spoken words per second of lesson against the reference's 2.54**, and 8.9 spoken words per beat
against 32.8 — because a single string had to be both the thing to remember and the thing that explains.

A shot may now carry two:

| | What it is | Where it goes |
|---|---|---|
| `caption` | the **headline** — short, holdable, on screen for the whole beat | top-left / lower-left, as before |
| `narrationKey` | the **spoken explanation** — what is being looked at, what is happening, why it matters | spoken, and shown as a subtitle across the bottom, one sentence at a time |

Both are ordinary locale strings with a provenance class. The provenance rule is intact: **nothing is spoken that is
not reviewable content already on screen.** What changed is that the spoken string is no longer required to be
identical to the headline.

## 2. Measured

| | Before (Step 15B) | After (Step 16B) | Reference |
|---|---|---|---|
| Running time | 279.6 s | **385.3 s** | 168.4 s |
| Beats | 40 | **52** | 13 |
| Spoken words | 356 | **878** | 427 |
| Spoken words per second | 1.27 | **2.28** | 2.54 |
| Spoken words per beat | 8.9 | **16.9** | 32.8 |
| Shots with a spoken explanation of their own | 0 | **45 of 52** | 13 of 13 |
| Beats with no spoken words | 4 | **0** | 0 |
| On-screen text layers | 1 | **2** | 2 |

We did not copy the reference's word rate — the brief asked for its clarity, not its numbers — but the gap closed from
half its rate to ninety per cent of it.

## 3. The subtitle

The spoken explanation is revealed a sentence at a time, timed against the measured length of the shot's own clip
(`NarrationPlayer.clip(shotId)`), so the reading matches the voice. It is:

- centred across the bottom on wide screens, with the headline lifted above it;
- a panel at the bottom on narrow screens, with the headline above that;
- withheld while the joint control panel is open, because that panel already carries the prompt;
- the whole line at once under reduced motion, honouring the lesson's `reducedMotion.captions: "instant"` contract;
- `aria-hidden`, because the caption and the shot's own `role="img"` description already carry the shot for assistive
  technology, and a live region firing every few seconds would talk over both.

`subtitleIndex()` is a pure function and is unit-testable: it splits on sentence boundaries and allocates the clip's
duration in proportion to sentence length.

## 4. Examples, before and after

| Shot | Before (caption = narration) | After: headline | After: spoken |
|---|---|---|---|
| `fixed.travel` | *"Fixed joint"* (title card, no speech) | "Several bones, one skull" | "Go up to the top of the head. The skull looks like a single piece, but it is several separate bones meeting along wavy lines." |
| `fixed.detail` → `fixed.name` | "The bones of the skull meet at fixed joints. These bones do not move against each other." | *(unchanged, as the headline)* | "A join that holds two bones still like this is called a fixed joint. Its job is strength, not movement: together these bones make one solid case around the brain." |
| `pivot.rotate` | "The upper bone turns around the one below it. Your head turns with it." | "The upper bone turns" | "Now the upper bone turns around the one below it, and your head turns with it." |
| `ball.shoulder` → `ball.move` | "At the shoulder, the rounded top of the upper arm bone sits in a hollow of the shoulder bone, so the arm can move in many directions." (24 words, the longest caption in the lesson) | "Movement in many directions" | "From there the arm can swing forward and back, lift out to the side, and sweep round in a circle." |
| `concept.meet` | "A joint is a place where **two** bones meet." — over a shot of the elbow, where three bones meet | "A joint is a place where bones meet." | "A joint is any place where bones meet. Most joints are two bones meeting; here at the elbow, three bones come together." |

## 5. The connective tissue the audit asked for

Six of the reference's thirteen scenes open with a connective that refers to the previous one. Before this step, none of
our thirty-six captions referred to the previous shot. The travel beats now carry that work:

- *"Go up to the top of the head…"*
- *"Now down to the top of the neck, just under the skull, where the head meets the backbone."*
- *"Back up to the shoulder, where the arm meets the body."*
- *"Down the same arm now, to the elbow."*

and the comparison chapter opens with *"Four joints, in one body, with four different ways of moving. Look at each one
again."*

## 6. Strings

| | Before | After |
|---|---|---|
| Locale strings | 199 | **289** |
| `draft-enrichment` | 62 | **126** |
| `figure-reference` | 21 | 25 |
| `source-excerpt` | 1 | **1** (unchanged — still the single supplied sentence) |
| `ui` | 115 | 137 |

101 strings added, 1 changed (`concept.meet`), 11 retired. Every new instructional string is `draft-enrichment` and is
listed in `content-provenance.md`. A test asserts that every `narr.*` string is `draft-enrichment` and that none of them
cites a source we do not hold.
