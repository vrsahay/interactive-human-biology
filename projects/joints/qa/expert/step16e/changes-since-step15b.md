# What changed since the Step-15B package

The last package a reviewer received was `qa/expert/step15b/`, for `step15b-learner-clarity-complete` (`4c2f8f7`). Five
steps have changed the lesson since. This page is the short version; each step's own folder has the evidence.

**Unchanged across all five:**
- the anatomy assets (GLBs, manifests, the master blend);
- the validated elbow (geometry, rig, axis, pivot, neutral offset, the `flexion` DOF and its 0–145° range);
- the nine-chapter architecture;
- the four-category taxonomy;
- the recall challenge;
- the provenance system.

---

## Step 16A — reference benchmark audit (`qa/step16/`)

A read-only comparison with a faculty reference lesson. No change to the product. Its main finding: the hinge chapter
was *taught* (arrive, look, move, why, name, try), while the other three categories were only *introduced*.

## Step 16B — teaching depth (`qa/step16b/`)

- All four category chapters now follow the same six beats: **arrive → look → movement → why → name → task**. Each
  gives a reason, and each ends with a learner task in its exploration.
- The on-screen headline and the spoken sentence are now **separate strings**. The spoken line appears as a subtitle.
- Shot lengths are derived from the measured narration, not guessed.
- A **Start lesson** card replaces autoplay, so the learner's tap is what starts the sound.
- There is a completion card at the end.
- 40 shots → 52; 4:40 → 6:25.
- **The draft-enrichment lines a learner can reach went from 61 (Step-15B inventory) to 125, and none of the new ones
  has been reviewed by anyone.** All 125 are listed, each with where it appears and whether it is spoken, in
  `strings-inventory.json`.

## Step 16C — Explore isolation and narration (`qa/step16c/`)

- **Explore:** dragging an exploration orbited the camera at the same time, which read as "the whole skeleton moves".
  The camera is now locked while an exploration owns the pointer. Only the declared bones move; this is measured on
  all 35 render groups.
- **Narration:** a drift corrector re-seeked the audio 60 times a second, and a shot clip and an exploration cue could
  speak together. There is now one narration owner at a time, and a guarded corrector.

## Step 16D — learner-facing polish (`qa/step16d/`)

- DRAFT badges left the captions: 28 of 52 shots → 0.
- The screen-reader-only reviewer disclaimer, previously read after 28 captions, was removed.
- The Sources control moved from the teaching surface into **Settings → For teachers → Sources & draft status**.
- **Every provenance record stayed:** `data-provenance` on every caption, the class of every string, and the legend.
- Two unintended near-duplicate spoken lines were rewritten, and exploration task cues stopped repeating their
  instructions.
- Site labels no longer hide behind an open panel.

## Step 16E — mobile Explore visibility (`qa/step16e/`), this candidate

- **On a phone, the exploration panel covered the joint it asked the learner to move.** At 320–390 px this happened in
  all four explorations. On narrow screens the paused film's player now steps aside while an exploration is open, and
  the subject is composed into the space the panel actually leaves. The target is 2.0–2.3× larger at 390×844 and is
  never under the panel.
- **The camera does not move further back at any width.** On desktop the subject is now centred beside the panel.
- **One line changed.** `narr.ball.move` said the shoulder gives "more freedom than any other" joint in the body. That
  comparative claim was unsourced. It now says the arm "can move in many directions", which the lesson already says
  elsewhere. It is still draft enrichment.
- A primary-button hover state measured 1.27:1 contrast on a phone; it has been fixed.

## Current counts, for this candidate

| | |
|---|---|
| Chapters · shots · length | 9 · 52 · **6:21** |
| Narration | 52 of 52 shots spoken, 24 learner-paced cues, 0 overruns; every spoken key is also on screen |
| Learner-facing strings (as the lesson reaches them) | A source-backed **1** · figure reference **22** · B draft enrichment **125** · C interface **8** |
| Strings in the locale file | 292: `source-excerpt` 1, `figure-reference` 29, `draft-enrichment` **126**, `ui` 136. The difference from the row above is interface text outside the lesson content (controls, dialogs, the screen-reader layer) and one draft string, `hinge.axis_note`, that nothing in the lesson or code references. It is kept, with its provenance, and flagged here for cleanup |
| Tests | typecheck clean · unit 98/98 · end-to-end 116/116 |
| Assets | 29/29 frozen files byte-identical; master matches its pin |
