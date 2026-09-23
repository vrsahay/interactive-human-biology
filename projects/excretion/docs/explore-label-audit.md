# Explore label / anchor accuracy audit (V2.4)

**Date:** 2026-09-22 · **Scope:** Explore mode only. Guided mode, narration, audio, lesson timing, captions and chapters are untouched.

## How every label was tested

For each selectable structure of each Explore model, at **7 views** (default, rotated ±35°, 25° above, 20° below, zoomed in ×0.6, zoomed out ×1.6):

1. select it (both paths: the part button and a real tap through the picker);
2. read the label's anchor **exactly as the leader line uses it**;
3. shoot a ray from the camera through that endpoint;
4. see what the learner actually has under it: see-through tissue (opacity < 0.75) does not count as a blocker, an opaque mesh does;
5. compare with what is highlighted, with the label, and with the description.

A view counts as **ON** only when the first thing seen at the leader-line endpoint is the named structure itself. 53 structures × 7 views = **371 checks**.

## Root cause (systemic, not only the bark)

`ExploreController.selectPart()` passed the part's **node** (or its first node) to the label, and `FilmLabels.anchorPos()` turns a node into the centre of its **bounding box**:

```js
const anchor = (info?.labelAnchor && …) || node || nodes[0];   // → box centre
```

For any ring, shell or scattered structure the box centre is not on the structure:
- bark, phloem, xylem, old xylem → the centre of the stem (the pith);
- cell wall, cytoplasm's neighbours, chloroplasts → the cell membrane;
- chloroplast membranes and stroma → the disc stacks;
- root hair → the root body, or a soil grain;
- water in the soil → a soil grain;
- the stomatal pore → the epidermis above it.

So the **bark case was one symptom of one bug**: 190 of 371 checks (51%) pointed somewhere other than the named structure, including 25 structures that were already wrong in the default view.

## The fix (one place, `web/src/lessons/SurfaceAnchor.js`)

The Explore label now targets a point **on the structure's visible surface**:

1. keep the current point while it is still visible (it does not jump while the model is turned);
2. use the point the learner **tapped**, when they tapped it and it is visible;
3. otherwise scan the structure's on-screen area (17 × 17 rays) and take the visible pixel of the structure nearest the middle of where it is seen. This finds narrow slivers, such as the pore showing in its slit;
4. if nothing of it is unobstructed, use the point that lies **least deep** behind whatever is in front — but only when that is within 4% of the model's size (the pore in its slit). If the structure is properly hidden in this view, the anchor returns nothing and `FilmLabels` hides the label and its line rather than pointing at the wrong tissue.

It re-chooses after the camera settles (140 ms), so orbiting and zooming stay smooth.

Two small supporting changes:
- `Picker` already reported the tapped point; `ExploreController` now passes it through (`onPick: (node, point) => …`).
- Explore's Root model uses the existing wider `rootFar` framing, so the root tip is inside the default Explore view (no Guided shot uses that Explore entry; presets are unchanged).

No Blender geometry was changed and **no GLB was re-exported**: every wrong endpoint came from the anchor, not from the models.

## Findings matrix

"Before" and "after" are the number of the 7 views where the leader line ends on the named structure. Highlight, label text and description were correct for **every** structure both before and after (only the anchor was wrong), so those columns are PASS throughout.

| ID | Model | Structure | Highlight | Label | Leader line | Endpoint before | Endpoint after | Multi-angle | Severity | Action |
|---|---|---|---|---|---|---|---|---|---|---|
| EL-01 | Plant | Leaf | PASS | PASS | PASS | 3/7 | 7/7 | PASS | P2 | fixed by the anchor |
| EL-02 | Plant | Branch | PASS | PASS | PASS | 0/7 (empty space) | 7/7 | PASS | P2 | fixed |
| EL-03 | Plant | Stem | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-04 | Plant | Roots | PASS | PASS | PASS | 0/7 (soil) | 7/7 | PASS | **P1** | fixed |
| EL-05 | Plant | Soil | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT (uses the authored `LABEL_Soil` anchor) |
| EL-06 | Leaf | Leaf | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-07 | Leaf | Vein | PASS | PASS | PASS | 1/7 (blade) | 7/7 | PASS | **P1** | fixed |
| EL-08 | Leaf | Leaf stalk | PASS | PASS | PASS | 4/7 | 5/7 (2 views: the stalk itself is out of frame, label hides) | PASS | P3 | fixed; framing only |
| EL-09 | Inside the leaf | Air space | PASS | PASS | PASS | 3/7 | 7/7 | PASS | P2 | fixed |
| EL-10 | Inside the leaf | Chloroplasts | PASS | PASS | PASS | 0/7 (palisade cells) | 7/7 | PASS | **P1** | fixed |
| EL-11 | Inside the leaf | Waxy layer (cuticle) | PASS | PASS | PASS | 0/7 (air space, vein) | 7/7 | PASS | **P1** | fixed |
| EL-12 | Inside the leaf | Leaf surface (epidermis) | PASS | PASS | PASS | 6/7 | 7/7 | PASS | P3 | fixed |
| EL-13 | Inside the leaf | Palisade cells | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-14 | Inside the leaf | Lower-layer cells | PASS | PASS | PASS | 6/7 | 7/7 | PASS | P3 | fixed |
| EL-15 | Inside the leaf | Guard cell | PASS | PASS | PASS | 6/7 | 7/7 | PASS | P3 | fixed |
| EL-16 | Inside the leaf | Phloem (in a vein) | PASS | PASS | PASS | 2/7 (sheath, xylem) | 7/7 | PASS | **P1** | fixed |
| EL-17 | Inside the leaf | Xylem (in a vein) | PASS | PASS | PASS | 3/7 (sheath, phloem) | 7/7 | PASS | **P1** | fixed |
| EL-18 | Chloroplast | Disc-shaped membranes | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-19 | Chloroplast | Membranes | PASS | PASS | PASS | 0/7 (discs) | 7/7 | PASS | **P1** | fixed |
| EL-20 | Chloroplast | Stroma | PASS | PASS | PASS | 0/7 (discs) | 7/7 | PASS | **P1** | fixed |
| EL-21 | Stoma | Leaf surface | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-22 | Stoma | Guard cell | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-23 | Stoma | Stoma (pore) | PASS | PASS | PASS | 0/7 (epidermis) | 7/7 | PASS | **P1** | fixed (the pore shows only in its slit) |
| EL-24 | Cell | Cell membrane | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-25 | Cell | Cell wall | PASS | PASS | PASS | 0/7 (membrane) | 7/7 | PASS | **P1** | fixed |
| EL-26 | Cell | Chloroplasts | PASS | PASS | PASS | 0/7 (membrane) | 7/7 | PASS | **P1** | fixed |
| EL-27 | Cell | Cytoplasm | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-28 | Cell | Nucleus | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-29 | Cell | Vacuole | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-30 | Cell | Vacuole membrane | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-31 | Cell | Neighbouring cells | PASS | PASS | PASS | 1/7 (membrane) | 7/7 | PASS | **P1** | fixed |
| EL-32 | Stem | **Bark** | PASS | PASS | PASS | 0/7 (**pith**) | 7/7 | PASS | **P1** | fixed (the reported case) |
| EL-33 | Stem | Phloem | PASS | PASS | PASS | 0/7 (pith) | 7/7 | PASS | **P1** | fixed |
| EL-34 | Stem | Xylem | PASS | PASS | PASS | 1/7 (pith) | 7/7 | PASS | **P1** | fixed |
| EL-35 | Stem | Old xylem | PASS | PASS | PASS | 0/7 (pith) | 7/7 | PASS | **P1** | fixed |
| EL-36 | Stem | Centre of the stem (pith) | PASS | PASS | PASS | 6/7 | 7/7 | PASS | P3 | fixed |
| EL-37 | Stem | Resins and gums | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-38 | Xylem | Xylem tube (vessel) | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-39 | Xylem | Narrow xylem cell (tracheid) | PASS | PASS | PASS | 0/7 (fibres, parenchyma) | 7/7 | PASS | **P1** | fixed |
| EL-40 | Xylem | Xylem fibre | PASS | PASS | PASS | 2/7 (parenchyma) | 7/7 | PASS | **P1** | fixed |
| EL-41 | Xylem | Living xylem cells | PASS | PASS | PASS | 2/7 (tracheids) | 7/7 | PASS | **P1** | fixed |
| EL-42 | Xylem | Old xylem | PASS | PASS | PASS | 5/7 (resin) | 7/7 | PASS | P2 | fixed |
| EL-43 | Xylem | Resins and gums | PASS | PASS | PASS | 1/7 (old vessels) | 7/7 | PASS | **P1** | fixed |
| EL-44 | Root | Root surface | PASS | PASS | PASS | 6/7 | 7/7 | PASS | P3 | fixed |
| EL-45 | Root | Root hair | PASS | PASS | PASS | 1/7 (root body) | 7/7 | PASS | **P1** | fixed |
| EL-46 | Root | Inside the root | PASS | PASS | PASS | 1/7 (root xylem) | 7/7 | PASS | **P1** | fixed |
| EL-47 | Root | Root tip | PASS | PASS | PASS | 2/7 (root body) | 6/7 (hidden when zoomed past it) | PASS | **P1** | fixed by the anchor + the wider Explore framing (`rootFar`) |
| EL-48 | Root | Root xylem | PASS | PASS | PASS | 6/7 | 7/7 | PASS | P3 | fixed |
| EL-49 | Root hairs and soil | Root surface | PASS | PASS | PASS | 7/7 | 7/7 | PASS | — | PASS — CORRECT |
| EL-50 | Root hairs and soil | Inside the root | PASS | PASS | PASS | 2/7 (empty space) | 7/7 | PASS | P2 | fixed |
| EL-51 | Root hairs and soil | **Root hair** | PASS | PASS | PASS | 0/7 (soil grain) | 7/7 | PASS | **P1** | fixed |
| EL-52 | Root hairs and soil | Soil particle | PASS | PASS | PASS | 5/7 | 7/7 | PASS | P2 | fixed |
| EL-53 | Root hairs and soil | **Water in the soil** | PASS | PASS | PASS | 1/7 (soil grain) | 7/7 | PASS | **P1** | fixed |

### Totals

| | Before | After |
|---|---|---|
| Checks on the named structure | 181 / 371 (49%) | **368 / 371 (99%)** |
| Views where the structure is out of frame and the label hides | — | 3 (leaf stalk ×2, root tip ×1, all when zoomed/rotated past it) |
| Endpoints on the wrong structure or in empty space | 190 | **0** |
| Highlight ≠ label target | 0 | 0 |
| Structures wrong already in the default view | 25 | 0 |

Severity counts (per structure, worst view): **P0 0 · P1 22 · P2 7 · P3 7 · PASS-CORRECT 17.** All P0/P1/P2 are fixed; the remaining P3 cases are views where the learner has turned or zoomed the structure out of the frame, and the label hides itself.

## Leader-line collision check

With the endpoint now on the structure's visible surface, no leader line ends behind geometry or in empty space (the 0 rows above). Only one label is shown at a time in Explore, so lines cannot cross each other. The line is drawn from the pill to the endpoint; the pill keeps its `labelDir` side and the existing on-screen clamping.

## Description check

Every structure's panel text (`PARTS[...]`) was read against what is highlighted: all 53 describe the structure that is selected and highlighted, and none states a fact outside the lesson. No description changed.

## Evidence

`docs/qa/explore-label-audit/<model>/ela_<model>_<part>_<view>.jpg` — 125 captures: every structure in the default view, and **all 7 views for every stem and every xylem structure** (the reported problem area).
