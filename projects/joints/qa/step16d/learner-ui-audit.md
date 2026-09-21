# Learner UI audit — three layers, separated

Measured shot by shot against the running build, before and after, by `qa/step16d/audit_learner_ui.mjs`. All 52 shots
were visited and every element's real visibility was tested (size, `visibility`, computed opacity), not just its
presence in the DOM.

---

## 1. The three layers

| Layer | What it is | Where it lives now |
|---|---|---|
| **A — learner** | the model, the headline caption, the spoken line, the current instruction, the minimum controls | the stage |
| **B — teacher / sources** | provenance classes and what they mean, the range citation, what is a validated rig and what is a teaching simulation, the draft-review status | **Settings → For teachers → Sources & draft status** |
| **C — QA / developer** | per-string provenance in the content, `data-provenance` on the rendered element, the expert packages, the QA reports | the repository and the DOM attributes; never rendered as text |

Before this step, B was on the stage for all 52 shots and part of C was being read out to screen-reader users after
almost every caption.

---

## 2. Measured, before and after

| | Before | After |
|---|---|---|
| Shots showing a visible **DRAFT** badge | **28 of 52** | **0** |
| Shots whose `sr-only` text repeats the reviewer legend | **28 of 52** | **0** |
| Shots showing the **Sources** control | **52 of 52** | **0** |
| Source panels open during teaching | 0 | 0 |
| Shots showing the teaching-view status | 17 | 17 *(kept — see §4)* |
| Persistent controls at a teaching beat | 17 | **16** |
| Site labels hidden behind a panel, across 7 widths × 4 explorations | **6** | **0** |

---

## 3. What moved, and where it went

### The DRAFT badge
Removed from the caption — the visible chip **and** the `sr-only` span that carried the full twenty-word reviewer
legend with it.

**Nothing was deleted.** The classification is still:

- on every locale string (`provenance: "draft-enrichment"`), 126 of them;
- on the rendered caption element as `data-provenance`, which `step16d-polish` §3b asserts;
- shown, in words and with its marker, in Sources & draft status;
- in `qa/expert/step15b/strings-inventory.json` and the review packages.

No string was promoted. `step16d-polish` §3 asserts the four provenance classes still exist, that there are still more
than a hundred draft strings, that there is still exactly one `source-excerpt`, and that every `narr.*` string is still
draft.

### The Sources control
"Sources & draft status" sat beside the chapter title on every shot. It is now **Settings → For teachers → Sources &
draft status**: one deliberate step away, still a real control, still labelled, still keyboard-reachable, and the
dialog is unchanged — same provenance legend, same range citation, same "what moves, and how" paragraph.

The dialog also gained one sentence explaining *why* the markers are there rather than over the lesson, so a teacher
opening it is not left wondering where the DRAFT chips went.

### The source badge
Removed from the caption for the same reason — it is a review-state marker, and the brief asks for those off the
teaching surface. The one `source-excerpt` line (`hinge.source`) still carries `data-provenance="source-excerpt"` and
is still styled as a source quotation (`is-source`); `film.spec` now asserts the classification on the element instead
of a visible chip.

---

## 4. What was deliberately kept

Per §12 of the brief — this is a simplification pass, not an information-removal pass.

| Kept | Why |
|---|---|
| **The teaching-view status** — *"Teaching view: the moving marks show the kind of movement."* | It is an honesty claim a learner needs, not implementation detail: whenever a schematic indicator is on screen, the learner is told the mark shows a *kind* of movement. It uses none of the vocabulary §6 forbids — no "schematic indicator", "validated rig", "fitted" or "reviewer". The Step-15B invariant requires it whenever indicators are visible, and it holds. |
| **The exploration status badge** — *Teaching simulation* / *3D joint model* | §6 requires the distinction to remain, stated concisely on entry. It is one short badge plus one plain line. |
| **The nine chapter buttons** | Navigation and accessibility (§12, §17). They already fade to 0.12 opacity while the film plays and the pointer rests, and return on pointer or focus. |
| **Captions, Explore instruction, task, Reset, Return, the 90° check, the recall challenge** | All named in §12 and §14 as things to keep. |

## 5. Persistent elements at a teaching beat

Sixteen, of which thirteen are controls that §17 requires to stay reachable:

```
narration toggle · Settings · Play · Replay · timeline slider ·
01 02 03 04 05 06 07 08 09 (chapter navigation) ·
Explore this joint · Full screen
```

plus the product name, the chapter title and the caption. The control bar and the top bar drop to 0.12 and 0.35 opacity
respectively once the film is playing and the pointer has rested, and come back on pointer movement or keyboard focus —
so during actual teaching the learner sees the anatomy, the caption and the spoken line, and effectively nothing else.

That auto-quiet behaviour predates this step and was verified still working. What this step removed from that list is
the Sources control.

## 6. The Explore panel

Unchanged in content except that it never carried a DRAFT badge to begin with (measured: 0 before, 0 after). It shows,
in order: the joint name, the status badge, the one-line plain meaning of that status, **Your task**, how to move it,
the readout, what it demonstrates, the keyboard hint, Reset and Return. That is §14's list.

The one fix here is geometric: the panel now publishes its rectangle to the label system, so a site label is never
placed underneath it — see `responsive-ui-review.md`.
