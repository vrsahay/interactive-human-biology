# QA fix plan

Issues from the automated and manual QA pass, grouped by priority and fixed in order: P0 (factual/content) first, then P1 (learner confusion), then P2 (visual/process weakness). P3 (polish) waits until nothing above it remains that can be fixed in this build.

Status: **FIXED** (verified after the fix) · **OPEN** (needs something this build could not do) · **DEFERRED** (P3).

## P0: factual / content

| # | Issue | Found by | Fix | Status |
|---|---|---|---|---|
| P0-1 | “Plants can do something animals cannot.” is a comparison NCERT does not make, and animals also shed parts. | NCERT audit | Now “Plants have another useful ability.” | FIXED |
| P0-2 | The stem narration stated the order of the layers (bark, then phloem, then xylem inside); the NCERT text names the tissues but not their order. | NCERT audit | Now “Bark covers the outside. Inside are phloem… and xylem…”. The model still shows the arrangement. | FIXED |
| P0-3 | “Deep in the stem, old xylem…” states a position the text does not. | NCERT audit | Now “In the stem, old xylem holds resins and gums.” | FIXED |
| P0-4 | The Explore stem description repeated the layer order; branch and pith descriptions claimed properties (carry leaves, soft) not in the supplied pages. | NCERT audit | Order removed; branch and pith are now named only. | FIXED |
| P0-5 | Earlier drafts: “sticky” resins, “the leaf changes colour”, “the oldest xylem lies near the centre”, “Leaves fall for many reasons”. | NCERT audit | Removed or reworded before this build. | FIXED |
| P0-6 | “Leaves also fall for other reasons” is not NCERT content. | NCERT audit | **Kept on purpose**: the brief requires that leaf fall is not presented as only for excretion. Marked NOT SUPPORTED in the audit; it adds no tested fact. | OPEN: teacher to confirm the wording |
| P0-7 | “Old xylem is made mostly of dead cells” combines Class X p. 98 with Class 9 p. 33. | NCERT audit | Kept as SUPPORTED WITH MINOR PARAPHRASE, with the inference stated. | OPEN: teacher to confirm |

## P1: learner confusion

| # | Issue | Found by | Fix | Status |
|---|---|---|---|---|
| P1-1 | Four headings were read aloud word for word in their narration (platform rule). | `qa:content` | Headings reworded (“Staying alive”, “Where the wastes go”, “Under the soil”, “Excreted”). | FIXED |
| P1-2 | Two summary lines were near-copies of their teaching lines (Jaccard 0.59 and 0.47). | `qa:content` | Rephrased (now < 0.45). | FIXED |
| P1-3 | The final map showed only five of its six routes (“Into the soil” missing); the label layer had a hard cap of five. | tour + capture | Labels honour the shot’s `labelsMax`; the map keeps its two windows (cell, stem). | FIXED |
| P1-4 | Scrubbing or jumping past an unfinished “Your turn” snapped back to the task. | tour | The clock gate uses the shot at the clock’s time, not the last rendered shot. | FIXED |
| P1-5 | Opening Explore on a model not yet taught crashed Explore. | tour | Falls back to the stage’s taught model; locked models say “Later in the lesson”. | FIXED |
| P1-6 | Chapter numbers under the timeline moved to wrong places after a resize (“02” at 75%). | capture | Positions come from stored fractions, not re-read pixels. | FIXED |
| P1-7 | A task confirmation could still be speaking when the next shot’s narration began. | `audioTest` | The film waits for the confirmation to finish (plus a reading pause). | FIXED |
| P1-8 | With the page hidden, the voice would carry on over a frozen picture. | `audioTest` trace | The film pauses when the page is hidden. | FIXED |
| P1-9 | A stalled frame (shader compile, main-thread hiccup) slowed the film clock, so the voice paused mid-sentence to wait for the picture. | `audioTest` trace | Film time follows real elapsed time up to 1 s per frame, and every stage’s shaders compile at load. | FIXED |
| P1-11 | With the real clips, a jump within the same clip could let a fraction of a second of the old voice play before the next frame silenced it. | `audioTest` on real clips | Every seek silences the voice at once; a re-position pauses the element before moving it. | FIXED |
| P1-10 | The Start-button audio unlock played the first clip muted on both audio elements and could race the real first clip. | `audioTest` (maxAudible 2) | Unlocks with a 50 ms silent sound, released only if nothing else has claimed the element; `audible` counts unmuted elements only. | FIXED |

## P2: visual / process weakness

| # | Issue | Found by | Fix | Status |
|---|---|---|---|---|
| P2-1 | The fallen leaf, which carries the wastes, was small at the edge of the frame. | capture | The `leafFallen` camera moved close to the landing spot. | FIXED |
| P2-2 | On phones, six route labels and two windows crowd the final map. | mobile capture | Dense maps drop the route line on screens ≤ 480 px; the caption line carries the routes. | FIXED |
| P2-3 | Section ticks in chapter 03 looked like chapter breaks. | capture | Thinner, fainter ticks. | FIXED |
| P2-4 | Narration audio not generated (no `TTS_KEY` at first). | pipeline | Generated with the key the user supplied: 84 clips, 1.77 MB; the lesson re-timed to 6:44. | FIXED |
| P2-5 | Real-voice timing. | `audioTest`, caption timing | Sync test 18/18 on the real clips (3 runs); captions change ~0.1 s before each measured sentence. **Still to do: listen to the whole film once** (pronunciation, pauses). | PARTLY DONE |
| P2-6 | Real devices: phone and tablet checked only by viewport emulation; audio sync timed in a hidden, throttled browser pane. | — | Watch once on a mid-range Android phone and an iPad; run `app.qa.audioTest()` on a visible page. | OPEN |

## P3: polish (deferred)

| # | Issue | Status |
|---|---|---|
| P3-1 | The Blender QA still of the cell cutaway is dark under the studio lights (the lesson’s Three.js lighting shows it well). | DEFERRED |
| P3-2 | On phones, the cell window on the final map sits under the “Oxygen” and “Vacuoles” labels. | DEFERRED |
| P3-3 | The old-xylem highlight in Explore is subtle. | DEFERRED |
| P3-4 | The JS bundle is 773 KB (202 KB gzipped) in one chunk; three.js could be split out. | DEFERRED |
| P3-5 | In `FilmUI.js`, the heading element is still called `caption` (code clarity only). | DEFERRED |
