# Deep biological and 3D visual accuracy audit

> **Where the evidence lives (repository cleanup, 2026-09-23).** Paths below to intermediate builds (`releases/v2` … `releases/v2.3`, the `v2.4-rc*` folders) and to bulk QA captures (`docs/qa/captures/**`, the full deep-audit render sets, the watch frame series) refer to development artefacts that are kept **locally only**, in the git-ignored `local-archive/`, and are not part of the public repository. The shipped release is `releases/v2.4/site`; a representative evidence set remains under `docs/qa/`. See [repo-cleanup-final.md](repo-cleanup-final.md).

## V2.4 outcome (correction pass, 2026-09-22)

**Result: no P0, no P1, and no unresolved P2 that can mislead a Class 10 learner.**
- The script is unchanged. Spoken hash `1bd750e41e0b…` and surface hash `7c4d6ad18018…` both match the freeze, so no TTS was needed.
- Blender checkpoints v043–v048 are new; v042 and earlier are untouched.
- Four GLBs were re-exported: `01_plant`, `03_stoma`, `05_leaf_internal` and `14_root`. The other 8 are byte-identical to V2.3 (sha256).
- Build: `releases/v2.4/site`.
- Evidence:
  - `docs/qa/deep-audit/v24/blender/`: final models, several angles, stoma at Open = 0, 0.5 and 1;
  - `docs/qa/deep-audit/v24/runtime/`: `v24final_01…13` cover the 12 required areas, plus mobile, Explore and recall.

| ID | Sev. | Status | What was done / why |
|---|---|---|---|
| DA-01 | P1 | **FIXED** | The guard-cell chloroplasts are rebuilt relative to the cell's centre line and radius, with their own `Open` shape key (Basis = closed). The runtime drives them with the cells. `validate.py` now checks every chloroplast vertex at Open = 0, 0.25, 0.5, 0.75 and 1: 0 outside the cell, and at least 0.018 clear of the wall at every step. Checked in Blender (top, oblique and side at three states) and in `stoma.look`, `stoma.close`, `stoma.try` (slider 30/60/100%) and `stoma.open`. Checkpoint v043. |
| DA-02 | P1 | **FIXED** | "Water vapour" in `water.vapour` now rides the vapour column in the air space (`TRACK_LI_Vapour`). It stays hidden until the first puffs are there, via a small generic label hold, `userData.labelOff`. Only the anchor changed; the label text is the same. |
| DA-03 | P2 | **FIXED** | Liquid water now goes xylem → bundle sheath → cell to cell (routes built over the cell surfaces) and stops at the cells that border the air space. Only from `water.vapour` ("From the cells, some water evaporates…") do white puffs form at those cell surfaces, cross the air space and leave by the stoma. No liquid drop is shown in an air space. |
| DA-04 | P2 | **FIXED** | During `stoma.reason`, oxygen and vapour leave the pore in two lanes that drift apart. "Water vapour" stays hidden until puffs have left the pore (about 6.3 s), then rides the vapour lane; "Oxygen" rides the oxygen lane. |
| DA-05 | P2 | **FIXED** | No more pole beads. Each guard cell's centre line runs a little past the midline, so the two cells' ends overlap and they are joined by their own shape. A thin shared end wall marks where the two cells meet. The pore opens exactly as before. Checked closed, half-open and open, from above, oblique and the side. Checkpoint v045. |
| DA-06 | P2 | **FIXED** | The stoma in the leaf section is now the same kidney-shaped pair as `03_stoma`: the same centre-line and radius functions, open, scaled × 0.68. It has the same translucent guard-cell material and chloroplasts inside, and the section cuts through its middle. The lower epidermis opens evenly (±0.15) either side of it. Checkpoint v044. |
| DA-07 | P2 | **FIXED** | The palisade cells now reach up into the upper epidermis with blunt tops, so there is no empty band under the skin. Checked in side and front renders and in `oxygen.inside`, `vacuole.tissue` and `night.day`. Checkpoint v044. |
| DA-08 | P2 | **FIXED** | During `water.rise`, the stem and branches become see-through and a thin pale xylem channel (x-ray) runs root → stem → branch → leaf stalk → midrib. The drops travel inside it. The same channel shows the root part in `water.enter` and the whole route in `water.reason`. The route was already the centre line of each organ; now it is visibly inside. |
| DA-09 | P2 | **FIXED** | The root xylem is recoloured from `#c79a4a` (golden-orange) to `#c9b27a`, the leaf-vein xylem tan. Water-carrying xylem now looks the same at every scale and clearly unlike amber resin and gum. Checkpoint v046. |
| DA-10 | P2 | **FIXED (option A)** | The plant is now a young **woody** plant. Its trunk is thicker at the base and tapers upward, with bark (brown, with vertical furrows) up to the lowest branches; only the shoot above is green. The tap root matches the base, and the runtime cut ring was resized to fit. The magnified slice (bark, rings, darker old xylem) now plausibly comes from this trunk. No text was added. Checkpoint v047. |
| DA-11 | P2 | **FIXED** | While the wastes climb, the stem is see-through, so they are seen travelling inside it. Each one becomes a purple patch coloured into the leaf tissue as it arrives (leaf shader), not a crystal on the surface. The fallen leaf keeps its patches. |
| DA-12 | P3 | **FIXED** | The plant leaf material has a faint green emission floor, so a leaf turned from the light is dark green, not black. Checkpoint v048. |
| DA-13 | P3 | **KEPT** | Atoms are not taught. Tinting the CO₂ oxygen atoms blue would make CO₂ look more like O₂, which is a worse confusion. |
| DA-14 | P3 | **KEPT** | `stoma.other`, just before, already shows gas crossing the stem and root surfaces. CO₂ drawn on the opaque stem would re-create the "on the outside" ambiguity that DA-08 removed. |
| DA-15 | P3 | **KEPT** | `whole.oxygen` is a daylight scene. Drawing CO₂ leaving by day would contradict "by day, this carbon dioxide is used up". The summary label "O₂ by day · CO₂ at night" (in `whole.answer`) states it. |
| DA-16 | P3 | **FIXED** | All wastes are in the leaf by about 4.2 s, during the first sentence. The leaf starts to yellow only at "Time passes, and the leaf grows older" and after the last waste is in, so the yellowing is not read as caused by the wastes. |
| DA-17 | P3 | **KEPT** | A cosmetic seam on the bark of the slice. Fixing it would re-export an otherwise untouched GLB, for no learner benefit. |
| DA-18 | P3 | **NOT APPLICABLE** | Re-inspection shows the block is closed: 472 downward-facing bottom triangles. The "open box" in the audit render was the unlit underside seen from below. |
| DA-19 | P3 | **FIXED** | A partial (cut) epidermis cell at the left edge of the leaf block covers the mesophyll to the cut edge. It uses no random draw, so all other cells keep their places. Checkpoint v048. |
| DA-20 | P3 | **KEPT** | The root-hair zone is not taught, and hairs near the cap mislead no taught idea. It is in accepted-simplifications. |
| DA-21 | P3 | **KEPT** | "One of those cells, opened up": the cream is the cut wall, and the green chloroplasts inside show it is a leaf cell. |
| DA-22 | P3 | **FIXED** | Picture-in-picture windows snap to their state on a seek or scrub, so there are no ghosts. Checked: whole.answer → night.reason gives opacity 0/0. |
| DA-23 | P3 | **FIXED** | The label stacking gap went from 6 px to 10 px; `whole.answer` "Gases"/"Vacuoles" measure 5 → 10 px in the DOM. |
| DA-24 | P2 (new) | **FIXED** | Found while fixing DA-01: in `stoma.open`/`close` the water drops slid over the **outside** of the leaf into the guard cells. They now rise from inside the leaf (below the epidermis) into the see-through guard cells, aimed at the cells' current centre line. |
| DA-25 | P2 (new) | **FIXED** | Found in the final inspection: in `stoma.look` ("this one is closed") both "Guard cell" labels pointed beside the cells, because the anchors sat at the open position. The anchors now move with the cells as they swell or shrink. |

The other runtime fix is a one-token guard in `world.js` (`if (it && …)`). It stops a task completion that arrives after the panel has closed from throwing. This is a latent V2.3 bug, found in regression and not biology.

**Scorecard after V2.4:**
- VERIFIED: Leaf, Vacuole, Chloroplast, **Stoma**, **Guard cells**, **Leaf internal**.
- VERIFIED WITH EDUCATIONAL SIMPLIFICATION: Plant (woody young plant), Plant cell, Stem, Stem cross-section, Xylem, **Root** (colour fixed), Root hairs + soil, Waste visuals.
- MISLEADING / INCORRECT / NEEDS REVIEW: none.

**Answers after V2.4:**
1. **Could a Class 10 student learn something biologically incorrect?** Not from the issues found. Liquid water and vapour are now shown separately and in the right places. Water rises visibly inside the plant. The guard cells stay intact, with their chloroplasts inside, at every opening. Stored wastes sit inside the leaf tissue. The stem slice belongs to a woody plant.
2. **Realistic but ambiguous structures?** The remaining ones are deliberate and listed in `accepted-simplifications.md`:
   - the single central root xylem strand;
   - resin shown as amber masses;
   - the grey oxygen atoms in CO₂ (DA-13);
   - the cream cut cell (DA-21).
   None contradicts what is taught.

---

## Original audit (V2.3 state)

**Audited state:** V2.3 working build, which matches the `releases/v2.3` export at Blender checkpoint v042. The brief called it V2.2. The differences from V2.2 are the V2.3 fixes S1–S7 plus the old-xylem pore colour in the stem slice (now dark brown, no longer amber). All of these were re-inspected here rather than taken on trust.

**Date:** 2026-09-22 · **Mode:** audit only. No model, material, lesson data, narration, camera, label, UI or GLB was changed.

**Method**
1. **Blender source.** Every asset root was rendered on its own, moved to the origin, from independent directions: front, back, side, top, bottom and oblique. The stoma was also rendered at `Open` = 0, 0.5 and 1 from above, from the side and from below, at 2.2× zoom. The script was a scratch file that saves nothing. Evidence: `docs/qa/deep-audit/blender/` (64 renders).
2. **Three.js runtime.** The production scene was captured with `?qa=1` at 1280×760, at 40%, 60–85% and 95% of each relevant shot, including transparency, depth sorting, labels and particle streams. Evidence: `docs/qa/deep-audit/runtime/` (50 captures; names `audit*_<shot>`).
3. **Code.** The code was read to confirm the cause of every geometry and animation finding (file:line given in the Evidence column).
4. **Sources.** Facts are checked against NCERT C10 pp. 83, 88–89, 94–96, 98–99 and C9 Ch. 2–3. Anything beyond NCERT is marked **SUPPLEMENTARY BIOLOGICAL KNOWLEDGE (SBK)**.

Severity: **P0** = teaches a false fact / blocks release · **P1** = a learner is likely to misread a taught concept; fix before release · **P2** = ambiguous or inconsistent; fix in the correction version · **P3** = polish / low risk.

---

## 1. Findings matrix

| ID | Asset/Shot | Issue | Type | Severity | Evidence | Source | Learner Risk | Recommended Fix |
|---|---|---|---|---|---|---|---|---|
| DA-01 | 03_stoma · `stoma.look`, `stoma.close`, `stoma.try` (and every closed state) | The guard-cell chloroplasts are static geometry placed at the *mid* bow. When the guard cells shrink (`Open`→0), they poke out through the wall and sit on or outside the cell outline. When open, they sit inside and look faded. | GEOMETRY / ANIMATION | **P1** | `blender/Stoma_top_m0_z2.2.png` vs `_m1_`; `runtime/audit_stoma_close_5000.jpg`, `audit3_stoma_close_95.jpg`; `build_v2_stoma.py:276` builds them at `(CLOSED_BOW+OPEN_BOW)/2` with no shape key | C10 p83 (guard cells swell/shrink); C9 p18 (chloroplasts are inside cells) | High visibility: the highlighted focus object of a narrated process and of an interactive task. It reads as "chloroplasts leave the cell when it shrinks" or as a broken model. | Give each guard-cell chloroplast set an `Open` shape key that follows the guard-cell centre line and radius, or rebuild them at `CLOSED_BOW` with a radius inside `gc_radius` at `Open`=0. Re-export 03 only. |
| DA-02 | 05_leaf_internal · `water.vapour` | The label "Water vapour" (static anchor `ANCHOR_LI_Air_Space`) points into an air space that holds **blue liquid drops**. The white vapour puffs appear only near and below the pore. For most of the shot the nearest object to the leader line is a liquid drop. | LABEL / NARRATION | **P1** | `runtime/audit3_water_vapour_40.jpg`, `audit2_water_vapour.jpg`; `lesson-data.js` `water.vapour` view.labels | C10 p95 (transpiration = water lost as vapour) | Directly pairs the word "vapour" with a liquid drop, in the one shot that defines evaporation. The learner may think vapour is the drops, or that liquid water collects in air spaces. | Put the label on a tracked vapour puff (`world.track`, as done for O₂/CO₂). In `leafInside` water mode, turn the drops into puffs *at the cell surface*, so the air space shows only vapour. The label text is unchanged, so no narration re-freeze is needed. |
| DA-03 | 05_leaf_internal · `water.leaf` → `water.vapour` | Liquid drops leave the xylem and **fly through the air spaces** to reach the cells. | PROCESS | P2 | `runtime/audit2_water_leaf.jpg` | C10 p94–95; SBK: water moves from xylem to mesophyll through cell walls and cells; the air spaces hold vapour | Moderate. The idea of liquid flowing through air spaces conflicts with "evaporates into the air spaces". | Route drops along the vein → bundle sheath → cell surfaces, keeping them on or inside cells. Fix together with DA-02. |
| DA-04 | 03_stoma · `stoma.reason` | The "Water vapour" label appears at 6.0 s. Vapour is born at 5.3 s at the *bottom* of the path and reaches the label anchor (curve 0.62) only at about 7.3 s. From 6.0 to 7.3 s the label points at **oxygen** molecules. Both streams also share one path. | LABEL / VISUALIZATION | P2 | `runtime/audit3_stoma_reason_60.jpg` vs `audit2_stoma_reason.jpg`; `stoma.js:118-119`, timing `sentenceStarts` [0, 3320, 5270] | C10 p83 | A brief but direct mislabel of O₂ as vapour. | Delay the label to about 7.4 s or make it a tracked puff. Offset the vapour path slightly (x +0.04) so the two streams separate. |
| DA-05 | 03_stoma (hero + context stomata), Explore | The `Guard_Cell_Poles` joints show as two **round beads** at each end, split by a seam. From above they read as 4 small extra cells rather than the joined ends of 2 guard cells. | ANATOMY | P2 | `blender/Stoma_top_m0_z2.2.png`, `Stoma_top_m1_z2.2.png`; `runtime/audit2_water_out.jpg` | C10 p83 "two guard cells" | The narration says "two guard cells" while the eye counts more parts. | Make the joint flush with the tube ends (radius ≈ tube tip radius, no bulge) so the ends look like one continuous kidney pair with a thin shared wall. |
| DA-06 | 05_leaf_internal · `oxygen.path`, `night.night`, `night.day`, `water.vapour` | In the leaf slice the guard cells are two small round blobs **without chloroplasts**, smaller than the epidermal cells. The stoma close-up shows kidney-shaped guard cells with chloroplasts. The two scales disagree. | ANATOMY / SCALE | P2 | `runtime/audit_oxygen_path_6000.jpg`, `audit_night_night_5000.jpg`; `blender/LeafInternal_front.png` | C10 p83 | Low to moderate: "A tiny pore" is labelled right next to them. | Model the guard cells as a kidney cross-section pair (two bean profiles) with 2–3 chloroplasts, at the same size as the epidermal cells. Re-export 05. |
| DA-07 | 05_leaf_internal · `oxygen.inside`, `vacuole.tissue`, `night.day`, all leaf-interior shots | A continuous dark **gap between the upper epidermis and the palisade layer** runs the full width of the block. | SPATIAL RELATIONSHIP | P2 | `blender/LeafInternal_side.png`, `LeafInternal_front.png`; `runtime/audit2_oxygen_inside.jpg` | SBK: palisade cells press directly against the upper epidermis | The shot says "layers of cells, with air spaces between them", so the gap can be read as an extra air layer under the skin. | Close the gap (move the palisade up or the epidermis down by the gap height) in `build_v2_leaf_internal.py`. Re-export 05. |
| DA-08 | 01_plant · `water.rise` | Water drops are drawn `onTop` over an **opaque** stem and branch, and one sits on the face of a leaf blade. No xylem is visible, although the narration and caption say "through the xylem". The a11y text says the drop climbs *inside* the stem. | VISUALIZATION / NARRATION | P2 | `runtime/audit3_water_rise_40.jpg`, `audit2_water_rise.jpg`; `processes/water.js:27` | C10 p94 | Moderate: it can look like water running up the *outside* of the stem, or like a raindrop on the leaf. | Show a thin translucent xylem strand (or a soft cut-away strip) along the drop path, and dim the stem locally. On the blade, keep the drop on the midrib line with a smaller size, or hide it under a translucent midrib. |
| DA-09 | 14_root (xylem strand) vs 11_xylem / 10_stem (resin) | The root's water-carrying xylem is **orange**, the same hue family as the resin/gum masses. At the other scales, water-carrying xylem is cream/tan. | MATERIAL | P2 | `blender/Root_front.png`; `runtime/audit2_water_root.jpg` vs `audit2_resin_store.jpg`, `audit2_resin_reason.jpg` | Lesson colour code (ncert-content-map) | Orange means "stored waste" elsewhere in the lesson, so a learner may link root xylem to resin. | Recolour the root xylem to the stem/xylem-block cream-tan (≈ `#d9c79a`) in `build_v2_root.py`. Re-export 14. |
| DA-10 | 10_stem_cross_section vs 01_plant · `resin.cut` → `resin.try` | The slice shows a **mature woody trunk**: about 10 growth rings, a large heartwood core and bark. The parent plant is a small sapling whose stem is green above and only slightly brown at the base. | SCALE / ANATOMY | P2 | `blender/StemSection_top.png`; `runtime/audit2_resin_old.jpg`; `blender/Plant_front.png` | SBK: heartwood forms in older woody stems | Low to moderate: the learner may think every young stem already has old xylem and resin. NCERT wording ("old xylem") is fine. | Either (a) accept, and add "(an older, woody stem)" to the heading or eyebrow, which changes surface text and needs a re-freeze; or (b) make the plant's lower stem visibly woody and thicker. Decision needed. |
| DA-11 | 01_plant (older leaf) · `leaves.load`, `leaves.fall`, `leaves.reason` | Stored wastes are large purple crystals sitting **on the outer surface** of the older leaf, each about 1/8 of the leaf's length. | VISUALIZATION | P2 | `runtime/audit2_leaves_load.jpg` | C10 p98 (wastes stored in leaves that fall off) | Can read as deposits on the leaf rather than wastes stored inside its cells. | Make the crystals smaller and embedded (render them under a slightly translucent blade, or flatten them into tinted spots in the blade). |
| DA-12 | 01_plant (several leaves) | Leaves whose underside or edge faces the camera render **nearly black**, which can look like dead or diseased leaves. | MATERIAL | P3 | `blender/Plant_front.png`; `runtime/audit2_water_rise.jpg` (upper right), `audit2_night_reason.jpg` | SBK: leaf undersides are paler, not darker | Low. | Give the backface a lighter tint (two-tone material, or `side:DoubleSide` with a minimum emissive). |
| DA-13 | 17_waste_visuals | The oxygen atoms in the CO₂ model are **grey/white**, while O₂ uses **pale blue**, so the atom colour code is inconsistent. | MATERIAL | P3 | `blender/WasteVisuals_top.png` | none (atoms not taught) | Low: atoms are not taught. It could still suggest that CO₂ contains no oxygen. | Optional: tint the CO₂ end-spheres pale blue-grey, keeping a dark carbon centre. |
| DA-14 | 01_plant · `night.respire` | Respiration CO₂ forms **only on leaves**, while the narration says "plant cells also respire". | PROCESS | P3 | `runtime/audit2_night_respire.jpg` | C10 p83, p88 | Low: `stoma.other` shows gas at stems and roots just before. | Optional: a few CO₂ molecules at the stem and roots in `form` mode. |
| DA-15 | 01_plant · `whole.oxygen` | The narration mentions night CO₂, but only oxygen is shown (the a11y text says the same). | NARRATION / VISUALIZATION | P3 | `lesson-data.js` `whole.oxygen` | C10 p89 | Low: the `whole.answer` label shows "O₂ by day · CO₂ at night". | Optional: a short dim-and-CO₂ beat, or accept. |
| DA-16 | 01_plant · `leaves.load` | The leaf yellows while the wastes gather, which can suggest that the wastes *cause* the yellowing. | PROCESS | P3 | `runtime/audit2_leaves_load.jpg` | none (NCERT is silent); SBK: yellowing is ageing (chlorophyll breakdown) | Low: the narration says "grows older". | Start yellowing after the wastes have settled, or accept. |
| DA-17 | 10_stem_cross_section | A horizontal **seam** runs around the bark at mid-height. | GEOMETRY | P3 | `blender/StemSection_front.png`, `StemSection_oblique.png` | none | Negligible. | Weld the seam or align the texture. |
| DA-18 | 03_stoma (epidermis block) | The block is an **open box underneath**: no bottom and no chamber below the pore. | GEOMETRY | P3 | `blender/Stoma_bottom.png`, `Stoma_under_oblique_m*_z2.2.png` | none | Only if the Explore orbit allows looking from below; not seen in the film. | Confirm the Explore polar limit. If it can reach, cap the block. |
| DA-19 | 05_leaf_internal | Some spongy cells hang **outside the block's cut face**, beyond the epidermis edge (left side). | GEOMETRY | P3 | `blender/LeafInternal_front.png`, `LeafInternal_oblique.png` | none | Negligible. | Clip the spongy cells to the block bounds. |
| DA-20 | 14_root | The root-hair zone runs almost to the root cap, with no hair-free zone just behind the tip. | ANATOMY | P3 | `blender/Root_front.png`, `Root_oblique.png` | SBK: root hairs arise in the maturation zone, behind a hair-free elongation zone | Low: not taught. | Optional: move the lower end of the hair zone about 15% further up. |
| DA-21 | 06_plant_cell · `vacuole.cell` | The hero cell is **cream** while its neighbours are solid green blocks, which could suggest a different kind of cell. | MATERIAL | P3 | `blender/PlantCell_front.png`, `PlantCell_top.png`; `runtime/audit2_vacuole_store.jpg` | none | Low: the narration says "one of those cells, opened up". | Optional: a faint green tint on the hero cell's cytoplasm. |
| DA-22 | Runtime · picture-in-picture insets | After a **backward seek** (QA or scrubbing), the inset discs fade at 0.88 per frame and remain visible as faint ghosts for about a second in shots without insets. | VISUALIZATION (runtime) | P3 | `runtime/audit2_resin_reason.jpg`, `audit2_night_reason.jpg` (ghost circles, left); `world.js:324` | none | Negligible in linear play. | Snap the inset opacity to its target on `seek`. |
| DA-23 | Runtime · `whole.answer` at 1280×760 | The "Gases…" and "Vacuoles…" label boxes touch (stacked with no gap). | LABEL | P3 | `runtime/audit2_whole_answer.jpg` | none | Negligible. | Add 6–8 px of separation in the label solver. |

No P0 findings. Nothing in the models or animations states or shows a fact that contradicts NCERT. All P1/P2 items are visual misreadings of correct content.

**Checked and not raised** (verified correct, from the evidence above):
- The leaf midrib ridge is on the underside (`Leaf_side.png`).
- The stomata are on the lower epidermis, with an air space above the pore (`LeafInternal_front.png`).
- The chloroplast has a double envelope, grana and stroma lamellae. O₂ forms at the discs and CO₂ goes to the stroma (`Chloroplast_oblique.png`, `audit_oxygen_produce_5000.jpg`). V2.3 S1 is verified: the "Oxygen" label rides a forming molecule.
- The plant cell has a wall, a membrane line, cytoplasm, a nucleus, one large vacuole and peripheral chloroplasts.
- The wastes stay inside the vacuole (`audit2_vacuole_store.jpg`).
- Xylem vessels are stacked open elements with thickenings; tracheids taper; fibres; living ray cells with nuclei; old vessels are darker with deposits (`Xylem_front.png`).
- The root hair is an outgrowth of a single epidermal cell and weaves between grains, with water films. Soil waste leaves a surface cell and drifts sideways (V2.3 S7 verified, `audit2_soil_excrete.jpg`).
- The stoma pore opens as the guard cells bow apart. The morph direction is correct at 0, 0.5 and 1.
- Night and day inside the leaf: CO₂ goes out at night (thin stream, S6 verified); by day CO₂ goes to chloroplasts and O₂ leaves (`audit2_night_day.jpg`).
- The stem ring order is bark → phloem → (cambium) → xylem → old xylem → pith. Resin shows in the old xylem only (`audit2_resin_reason.jpg`).
- The O₂ / CO₂ / water / vapour / waste glyphs are distinct in shape and colour (`WasteVisuals_top.png`).

---

## 2. Asset scorecard

| Asset | Status | Strongest accurate aspect | Most important concern | Learner risk | Fix needed |
|---|---|---|---|---|---|
| Plant (01) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Continuous stem → branch → petiole → leaf; taproot system under a see-through soil shell | DA-08 water on the outside; DA-11 surface crystals; DA-12 dark undersides | Moderate (DA-08) | Yes (P2) |
| Leaf (02) | VERIFIED | Venation, acuminate tip, petiole, midrib ridge on the underside | Specular hotspot only | Low | No |
| Leaf internal (05) | NEEDS REVIEW | Correct layer order (cuticle, epidermis, palisade, spongy + air spaces, vein, lower epidermis with stoma over a chamber) | DA-07 gap under the upper epidermis; DA-06 guard cells; DA-02/03 liquid in the air spaces (runtime) | Moderate | Yes (P1 via DA-02, P2) |
| Stoma (03) | NEEDS REVIEW | Kidney-shaped pair; the pore opens by bowing apart; closing to a slit | DA-01 chloroplasts outside the shrunken cells; DA-05 pole beads | High (DA-01) | Yes (P1) |
| Guard cells (03/05) | MISLEADING in the closed state (DA-01); otherwise VERIFIED | Swell/shrink shape change tied to water, as NCERT says | DA-01, DA-05, DA-06 inconsistency across scales | High in the closed state | Yes |
| Plant cell (06) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Wall, membrane, cytoplasm, nucleus, large vacuole, chloroplasts pushed to the edge | DA-21 cream vs green neighbours | Low | No (optional) |
| Vacuole / tonoplast (06) | VERIFIED | Single thin membrane; wastes enter and stay | none | Low | No |
| Chloroplast (08) | VERIFIED | Double envelope, grana stacks, lamellae; O₂ at the discs, CO₂ to the stroma | none (CO₂ glyph small at this scale) | Low | No |
| Stem (01, lower stem) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Green above, brown at the base | DA-10 sapling vs mature slice | Low–moderate | Decision |
| Stem cross-section (10) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Ring order correct; old xylem darker and central; resin only in the old xylem | DA-10 maturity; DA-17 seam | Low–moderate | Decision / P3 |
| Xylem / old xylem / heartwood / sapwood (11) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Vessels, tracheids, fibres, living ray cells; old vessels darker with deposits | DA-09 colour conflict with the root xylem | Low–moderate | Yes (in 14, not 11) |
| Root (14) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Root cap, hair zone, cortex, central vascular strand | DA-09 orange xylem; DA-20 hairs near the tip; single strand (accepted) | Low–moderate | Yes (P2 colour) |
| Root hairs + soil (15/16) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | One hair = one epidermal cell outgrowth; hairs between grains; water films | none significant | Low | No |
| Waste visuals (17) | VERIFIED WITH EDUCATIONAL SIMPLIFICATION | Linear O=C=O; O₂ pair; drop; puff; crystal; resin; soil particle all distinct | DA-13 oxygen colour | Low | No (optional) |

---

## 3. Process accuracy: START → MECHANISM → MOVEMENT → DESTINATION → RESULT

| # | Process (shots) | Verdict | Note |
|---|---|---|---|
| 1 | Photosynthesis makes O₂ (`oxygen.photo`, `oxygen.produce`) | ✔ | Chloroplast → light at the discs → CO₂ to the stroma and water to the discs → O₂ forms at the discs. |
| 2 | O₂ leaves the cells and the leaf (`oxygen.path`, `oxygen.release`) | ✔ | Cells → air spaces → pore → air. |
| 3 | Stoma opens (`stoma.open`) | ✔ with DA-05 | Water into the guard cells → swell and bow → pore opens. |
| 4 | Stoma closes (`stoma.close`, `stoma.try`) | ✖ **DA-01** | Shrink → pore closes is correct, but the chloroplasts end up outside the cells. |
| 5 | O₂ and vapour out through the pore (`stoma.reason`, `water.out`) | ~ DA-04 | Right route; label timing is off. |
| 6 | Gas exchange across stems and roots (`stoma.other`) | ✔ | Matches p83. |
| 7 | Respiration makes CO₂ (`night.respire`) | ✔ with DA-14 | Shown on leaves only. |
| 8 | Night CO₂ release (`night.night`, `night.reason`) | ✔ (accepted simplification) | Route through the pore is SBK; stream thinned (S6). |
| 9 | Day CO₂ reuse (`night.day`) | ✔ | Respiration CO₂ → chloroplasts, used up; O₂ leaves. |
| 10 | Water uptake by root hairs (`water.enter`, `water.hairs`) | ✔ | Soil → hair → surface cell → root. |
| 11 | Root → xylem → up the stem (`water.root`, `water.rise`) | ~ **DA-08**, DA-09 | Route correct; the plant-scale visual shows water on the outside. |
| 12 | Leaf: xylem → cells → vapour → out (transpiration) (`water.leaf`, `water.vapour`, `water.out`, `water.reason`) | ✖ **DA-02**, DA-03 | Liquid water in the air spaces, with the vapour label on the liquid. |
| 13 | Storage in vacuoles (`vacuole.store`, `vacuole.reason`, `vacuole.try`) | ✔ | Cytoplasm → across the tonoplast → stays inside. |
| 14 | Storage in leaves that fall (`leaves.load`, `leaves.fall`, `leaves.reason`) | ~ DA-11, DA-16 | Route correct; the crystals sit on the surface. |
| 15 | Resins and gums in old xylem (`xylem.cells`, `resin.store`, `resin.reason`) | ✔ with DA-10 | Waste → through living ray cells → old vessels → amber masses. |
| 16 | Excretion into soil (`soil.excrete`, `soil.reason`) | ✔ | Surface cell → sideways between grains (S7). |

---

## 4. Visual–narration (HEAR = SEE) mismatches

| Shot | Heard / read | Seen | Finding |
|---|---|---|---|
| `water.vapour` | "evaporates into the air spaces, as water vapour" + label "Water vapour" | blue liquid drops in the air space; puffs only near the pore | DA-02 (P1) |
| `water.leaf` | "passes out of the xylem, into the cells" | drops cross open air spaces | DA-03 (P2) |
| `stoma.reason` | label "Water vapour" from 6.0 s | O₂ molecules at the label for about 1.3 s | DA-04 (P2) |
| `water.rise` | "Through the xylem" / a11y "inside the stem" | drops on the outer surface and on a blade | DA-08 (P2) |
| `stoma.close` | "When the guard cells shrink" | cells shrink but the chloroplasts stay out | DA-01 (P1) |
| `stoma.look` | "two guard cells" | a pair plus two round end beads | DA-05 (P2) |
| `night.respire` | "Plant cells also respire" | CO₂ forms on leaves only | DA-14 (P3) |
| `whole.oxygen` | "At night, carbon dioxide … is given out" | oxygen only | DA-15 (P3) |
| `leaves.load` | "stored in leaves … grows older" | crystals on the surface; yellowing during loading | DA-11 (P2), DA-16 (P3) |

---

## 5. Scale transitions

- **Plant → leaf → leaf interior → cell → chloroplast:** consistent. The leaf interior shows a stoma on the lower side, but its guard cells don't match the close-up (DA-06).
- **Leaf interior → stoma:** the surface view is consistent. The chloroplasts in the close-up are missing from the cross-section (DA-06).
- **Plant → stem slice → xylem block:** ring order and "old xylem" are consistent, and the amber resin matches between slice and block. The maturity mismatch is DA-10.
- **Plant → root → root hairs:** consistent. Colour-code conflict: DA-09.
- **Vacuole → cell → leaf → plant (`vacuole.back`):** consistent (V2.2 fix 9 verified in earlier passes; not changed since).

## 6. NCERT and source concerns

- All narrated claims map to NCERT C10 §5.5.2 (p98), p83, p88–89, p94–95 and C9 Ch. 2–3. None contradicts the text. `data/ncert-audit.js` refs are unchanged since V2.3.
- These visuals go beyond NCERT and count as SBK, not "NCERT says":
  - night CO₂ leaving through a pore;
  - O₂ forming at the thylakoid discs, CO₂ used in the stroma;
  - growth rings, cambium and pith;
  - resin shown as masses in old vessels;
  - living ray cells;
  - the root cap and root-hair zone.
  None is narrated as fact.
- "Bark" and "phloem" are drawn as separate rings. SBK: secondary phloem is part of the inner bark. NCERT does not define bark, so this is accepted (see accepted-simplifications).
- The NCERT sentence "plants use the fact that many of their tissues consist of dead cells" (p98) is faithfully carried by `resin.old` and `xylem.cells`.

## 7. The "invisible accuracy" check

These were examined from angles the film never uses. Details students never see do **not** raise severity unless Explore can reach them:
- the hollow underside of the stoma block (DA-18; depends on the Explore limit);
- the back of the chloroplast, which is closed (✔);
- the back face of the cell block, which is closed (✔);
- the far side of the xylem block, where fibres form a back wall (✔);
- the root above the cut window, which is solid (✔);
- the bottom of the plant, where only the base disc shows and nothing floats (✔).

## 8. Runtime notes

- There are no depth-sorting faults that hide taught objects:
  - the particles marked `onTop` stay visible;
  - the translucent palisade and spongy "front" cells show their chloroplasts;
  - the translucent guard cells sort correctly at all three morph states.
- The QA capture draws the chapter line as run-together text ("03FOLLOW THE WASTEA TINY PORE"). This is a capture-tool artefact: the real DOM draws two separate lines. It is not a finding.
- DA-22 (ghost insets after a backward seek) is the only runtime-only defect found.

---

## 9. Final answers

**1. Could a Class 10 student learn something biologically incorrect from these models or animations?**

Yes, in a few narrow places. They are visual misreadings, not false statements:
- **(a)** Water vapour gets confused with liquid water. In `water.vapour` the "Water vapour" label sits over blue liquid drops (DA-02), and liquid drops fly through the air spaces (DA-03).
- **(b)** The chloroplasts appear to leave the guard cells when a stoma closes (DA-01).
- **(c)** Water appears to climb the *outside* of the stem (DA-08).
- **(d)** Any young stem seems to contain heartwood (DA-10).
- **(e)** Stored wastes look like crystals stuck on a leaf's surface (DA-11).

**2. Are there structures that look realistic but are anatomically ambiguous?**

Yes:
- the guard-cell pole beads, which read as extra cells (DA-05);
- the round, chloroplast-free guard cells in the leaf slice (DA-06);
- the gap under the upper epidermis, which reads as an air layer (DA-07);
- the orange root xylem, the same colour as resin (DA-09);
- the mature-trunk slice from a sapling (DA-10);
- the near-black leaf undersides, which read as dead leaves (DA-12);
- the cream hero cell among green cells (DA-21);
- the grey oxygen atoms in CO₂ (DA-13).

## 10. Recommendation

Move to a correction version, **V2.4**. Keep the narration frozen: DA-01 to DA-09 and DA-11 need no spoken-text change. DA-10 option (a) would change surface text only, which needs a surface re-freeze. See `must-fix-before-release.md` for the P1 items and `accepted-simplifications.md` for the do-not-fix list.
