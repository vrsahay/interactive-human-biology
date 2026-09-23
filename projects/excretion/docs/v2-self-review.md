# V2 self-review: models first, then the lesson as a Class 10 student

> **Where the evidence lives (repository cleanup, 2026-09-23).** Paths below to intermediate builds (`releases/v2` … `releases/v2.3`, the `v2.4-rc*` folders) and to bulk QA captures (`docs/qa/captures/**`, the full deep-audit render sets, the watch frame series) refer to development artefacts that are kept **locally only**, in the git-ignored `local-archive/`, and are not part of the public repository. The shipped release is `releases/v2.4/site`; a representative evidence set remains under `docs/qa/`. See [repo-cleanup-final.md](repo-cleanup-final.md).

Done 2026-09-22 on the shipped build (`releases/v2/site`) and fresh Blender renders of the exported scene (`blender/renders/v2/`). The review itself is kept below unchanged. **V2.1 outcomes are recorded in the next section.**

## V2.1 outcome (correction pass, 2026-09-22)

The V2.1 build is in `releases/v2.1/site`. Blender checkpoints v029–v039 were added; none was overwritten. Five GLBs were re-exported; seven are byte-identical to V2.

| Item | Outcome | What changed |
|---|---|---|
| A1 Stoma guard cells separate at the ends | **FIXED** | The poles stay fixed and overlap. A shared end-wall joint bridges both cells; only the middles bow apart. Checked closed, half-open, open, and both context stomata (`build_v2_stoma.py`, v029). |
| A2 Root hairs not touching soil | **FIXED** | 62 grains packed around the hairs and touching them, with water films and droplets at the contacts (v030). |
| A3 Cuticle floating strip, missing below | **FIXED** | A thin continuous waxy skin on both epidermises, following the cells and open at the stoma (v031, v036). |
| A4 Leaf chloroplasts outside cells | **FIXED** | The front row of cells is translucent, with the chloroplasts inside (v031). |
| A5 Root hair between two cells | **FIXED** | Each hair swells out of the top of one cell; its nucleus sits near the hair (v030). |
| A6 Chloroplasts appear inside the vacuole | **FIXED** | The back-wall chloroplasts behind the vacuole were removed (v032). |
| A7 Green cell wall | **FIXED** | Pale cream (cellulose). |
| A8 Green phloem | **FIXED** | Buff (v033). |
| A9 Spiral-only vessels | **RETAINED** | A disclosed simplification (bio audit C-18); not a correction item. |
| A10 Simple root xylem strand | **RETAINED** | A disclosed simplification (C-09). |
| B1 Why dead cells matter | **FIXED** | `xylem.cells` adds: “Plants use dead tissues like this as places to store some of their wastes.” (p. 98). Explore’s xylem text says the same. |
| B2 Why CO₂ is a waste | **FIXED** | Now: respiration makes CO₂ → “a gaseous waste” (p. 96) → given out at night → by day, “an input for photosynthesis”. `night.night` now comes before `night.day`. |
| B3 Stoma order and repetition | **FIXED** | Closed stoma and guard cells → they swell and curve apart, the pore opens → what passes through (gases; the oxygen got out; water can be lost) → closing saves water. The early “when it does not need carbon dioxide” is gone. |
| B4 Drift from “follow the waste” | **FIXED** | Link lines “The oxygen left through a stoma.” and “Now follow a second gas.” The stoma is taught as the way the oxygen left. |
| B5 Inconsistent location labels | **FIXED** | One hierarchy on every heading, e.g. *Plant › Leaf › Leaf surface › Stoma*, *Plant › Stem › Cross-section › Xylem › Old xylem*, *Plant › Root › Root hairs › Soil*. Explore titles use the same names. |
| B6 “Tubes called xylem” twice | **FIXED** | `water.rise`: “Through the xylem, it rises up the stem …” |
| B7 CO₂ entry before stomata | **NOT APPLICABLE** | Marked acceptable in the review; no change. |
| B8 Length | **RETAINED** | 9:28 (V2 9:18). |
| Extra: heading legibility on pale stages | **FIXED** | The heading backing already used on the cell stage now also applies to the leaf and stoma stages (existing style, no new UI). |

### Final learner test (after V2.1, as a Class 10 beginner)

| # | Question | Answer after V2.1 |
|---|---|---|
| 1 | Why do dead tissues matter? | Yes. Right after “most are dead”, I hear that plants use dead tissues to store wastes. Then I watch resin and gum fill the old xylem. |
| 2 | Why is CO₂ a waste of respiration? | Yes. “Respiration makes carbon dioxide … a gaseous waste” comes before anything about using it. |
| 3 | Why might the plant also use CO₂? | Yes. “By day, the same gas is used instead, as an input for photosynthesis” comes last, and is set against “waste”. |
| 4 | How does a stoma open? | Yes. I see it closed, then water flows in, the cells swell and curve apart, and the pore opens. |
| 5 | How are the guard cells related to the pore? | Yes. The pore is the space between the two joined cells; it widens only in the middle as they change shape. |
| 6 | Where are the root hairs? | Yes. They grow out of the root’s surface cells, among the soil grains. |
| 7 | Where does the water come from and go? | Yes. Soil water on the grains → root hair → root xylem → stem → leaf cells → air spaces → stoma → air. |
| 8 | What is the cuticle? | In Explore, yes: a thin waxy skin on the leaf’s surface. It is not narrated. |
| 9 | Can I tell where I am? | Yes. Every heading starts at “Plant” and names each level down. |
| 10 | Is “Follow the waste” one story? | Yes. Oxygen leaves through a stoma → how the stoma works → “now follow a second gas” → water → stores → soil. |

Severity:
- **P1**: teaches or implies something wrong; should be fixed.
- **P2**: could confuse a student, or is a simplification worth improving.

## A. Scientific accuracy of the GLBs

| # | Model | What I saw | Why it matters | Sev. | Proposed fix |
|---|---|---|---|---|---|
| A1 | `03_stoma` | When the pore opens (morph “Open”), the two guard cells **come apart at both ends**, leaving extra gaps above and below the pore (`CAM_Stoma_Top_morph.png`). The context stomata also show the two cells as separate crescents. | Real guard cells stay **joined at both ends**; only their middles bow apart. The lesson’s key image (“they swell, and the pore opens”) currently shows the wrong shape. | **P1** | Rebuild the open shape so the poles stay fused and only the mid-section bows. Close the context stomata the same way. |
| A2 | `15_root_hairs` | The builder deliberately placed soil particles **away** from the hairs. The hairs stand in empty space; no hair touches a grain or a water film. | The lesson says root hairs take in water *from the soil*. The picture should show hairs in close contact with soil particles and their water films. | **P1** | Let the hairs wind between and touch grains; wrap water films around the contact points. |
| A3 | `05_leaf_internal` | The cuticle is a thin **rod floating above** the upper epidermis, with a gap. There is no cuticle on the lower surface. | A cuticle is a continuous waxy layer *on* the epidermis (C9 p. 32). A floating bar reads as a separate object. | **P1** | Make it a thin continuous skin on the upper epidermis, and a thinner one on the lower. |
| A4 | `05_leaf_internal` | Chloroplasts sit **on the outside** of the palisade and spongy cells, like bumps. | Chloroplasts are *inside* cells. A student could read them as things stuck to cells. | P2 | Make the cells slightly translucent and put the chloroplasts just inside the cell surface. |
| A5 | `15_root_hairs` | Each hair looks like a stick planted **between** two cells. The nuclei are white beads at the base. | A root hair is an outgrowth of **one** epidermal cell (C9 p. 32). | P2 | Grow each hair from the top of one cell, with a smooth swelling where it starts. Put the nucleus clearly inside that cell (often near the hair). |
| A6 | `06_plant_cell` | Chloroplasts behind the translucent vacuole show through it, so they look like objects **inside** the vacuole. | Could be mistaken for stored material. | P2 | Remove the chloroplasts behind the vacuole, or make the vacuole less transparent there. |
| A7 | `06_plant_cell` | The cell wall is bright green. | Cell walls are not green; the colour comes from chloroplasts. (Many textbook diagrams do colour it green.) | P2 | Pale cream or colourless wall. |
| A8 | `10_stem_cross_section` | The phloem ring is bright green. | Phloem is not a green tissue. Green suggests photosynthesis. | P2 | Pale brown or buff phloem, told apart by texture. |
| A9 | `11_xylem` | Every young vessel has spiral thickenings. | Already disclosed (bio audit C-18). | P2 | Optional: one vessel with pitted walls. |
| A10 | `14_root` | The root xylem is one smooth central cylinder. | Already disclosed (C-09). | P2 | Optional: a star-shaped xylem strand. |

Checked and correct:
- **Plant and leaf:** leaf venation; an acuminate tip; the petiole attachment.
- **Stoma:** jigsaw pavement cells with no chloroplasts; guard cells with chloroplasts.
- **Leaf interior:** tall, packed cells above and loose cells with air spaces below; a cavity above the stoma; xylem on the upper side of the vein and phloem below.
- **Cell:** membrane inside the wall; nucleus pushed to the side; large central vacuole.
- **Chloroplast:** double membrane, stroma, disc stacks joined by sheets.
- **Stem:** bark, phloem, cambium line, growth rings, rays, younger xylem outside older, pith.
- **Xylem:** vessels with end rims, tapered tracheids, fibres, living parenchyma as a ray, darker old vessels.
- **Root:** hair zone begins behind a bare tip, hairs longest mid-zone and fewer higher up.

## B. The lesson as a Class 10 beginner

**What works.**
- Chapters 01–02 build the idea from zero: alive → life processes → unwanted substances → excretion → kidneys → no such organ → the big question.
- “Follow the waste” gives the lesson a thread.
- Every place ends with a plain explanation, then a *Your turn*.
- The final map collects everything, and the recall uses the same pictures.
- Language is simple. Each new word (chloroplast, stoma, guard cells, xylem, transpiration, vacuole, resins and gums) is shown before it is named.

**Where I got lost or confused as a student.**

| # | Where | What a student experiences | Sev. | Proposed fix |
|---|---|---|---|---|
| B1 | “Inside the stem” (`resin.old`, `xylem.cells`) | I’m told xylem is mostly dead cells, then that resins and gums are stored there. **Nobody tells me why the dead cells matter.** NCERT’s point is that plants *use* dead tissues to store wastes. | **P1** | Add one line after `xylem.cells`: “Plants make use of this: wastes can be stored in these dead parts.” This paraphrases p. 98, “plants use the fact that many of their tissues consist of dead cells”. |
| B2 | “At night” | I’m never told that carbon dioxide is a *waste*. I hear “by day it is used in photosynthesis”, so I wonder: if the plant uses it, why is it a waste? | **P1** | In `night.respire`: “Respiration makes carbon dioxide, a waste the cell does not need.” Pages 88–89 treat CO₂ as something to get rid of; p. 98 groups it with oxygen. Then “by day the plant reuses it; at night it is given out.” |
| B3 | “A tiny pore” order | Open → *explanation* → close. The explanation arrives before I’ve seen the pore close. Then `stoma.close` repeats “a lot of water can be lost” (said in the shot before). “When it does not need carbon dioxide” refers to night before the night section. | **P1** | Reorder to look → open → close → reason → try. Merge the repeated water-loss sentence into one place. |
| B4 | The lesson’s focus | Sections b (“A tiny pore”) and c (“At night”) are about *how gases get out* rather than *a way to deal with waste*. The thread “follow the waste” goes quiet for about 90 s. “Gases are also exchanged across stems and roots” feels like a side note. | P2 | Open section b with one linking line: “Oxygen got out through a stoma. Let’s look at how these doors work.” Consider folding `stoma.other` into `stoma.reason`. |
| B5 | Scale jumps in section a | Plant → leaf → inside → chloroplast → inside → stoma → plant: six model changes in about 90 s. The breadcrumb labels change style (“Plant › Leaf › Inside”, then “Leaf › Cell › Chloroplast”, then “Leaf › Surface › Stoma”), so I lose track of where I am. | P2 | One consistent breadcrumb from “Plant” every time (e.g. “Plant › Leaf › Cell › Chloroplast”). Optionally a small “zoom level” strip showing the current scale. |
| B6 | Water section | `water.root` says “into its tubes called xylem”, and `water.rise` immediately says “inside tubes called xylem” again. | P2 | Change `water.rise` to “It moves up the stem in the xylem, and out along the branches to the leaves.” |
| B7 | Photosynthesis | I see carbon dioxide *enter the chloroplast*, but I haven’t yet been told how it gets into the leaf (through the stomata). The stoma is introduced two shots later. | P2 | Acceptable as is. Optional: “carbon dioxide from the air” in `oxygen.photo`. |
| B8 | Length | 9:18 with four tasks and eight recall questions. Long for one sitting, but the chapters are clearly separated. | — | Keep. |

**Sequence verdict.** The overall order is sound: question → discovery → process → explanation → interaction → summary → recall. Fixing B1–B3 would close the only real gaps in understanding. B1 matters most: without it, “dead cells” is a fact with no purpose.

## C. What a fix round would involve

- **A1–A3** (and optionally A4–A8): rebuild those parts in Blender. Validation and export are saved as new checkpoints (v029+); `assets:inspect` must pass.
- **B1–B3, B6** (and optionally B4–B5): edit the text, update `ncert-audit.js` and the biological accuracy audit, then re-freeze. About 6–8 narration clips would be re-synthesised with Google TTS, which needs the key again.
- Then a full regression, as in `qa-report.md`.

## V2.1 student re-check (2026-09-22)

Done on the V2.1 build. I read the whole script in order, then took runtime captures at mid-narration of 33 shots across chapters 03–04 (`docs/qa/captures/st_*`). **Nothing changed yet.**

**Overall:** as a Class 10 beginner I can follow the whole lesson and answer the central question. The three V2 gaps (dead tissues, CO₂ as a waste, stoma order) are closed. What remains are moments where **what I see does not match what I hear**, plus one wording slip.

| # | Where | What a student experiences | Sev. | Proposed fix | Needs new audio? |
|---|---|---|---|---|---|
| R1 | `resin.old` | The narration says “This **darker** part is old xylem”, but the shot dims every other layer and gives old xylem the warm highlight. It is the **brightest, glowing orange** thing on screen. What I hear contradicts what I see. | **P1** | Drop `dim` and the warm highlight on this shot. Let the label point at the naturally darker ring (as in `resin.layers`). | No |
| R2 | `soil.look` | The label “Soil” sits in the middle of the root mass, next to the stem, so it looks like it names a root. | **P1** | Anchor the “Soil” label to a point on the soil cut face away from the roots. | No |
| R3 | `vacuole.pivot` | “Oxygen and extra water leave the plant.” I learned three minutes ago that carbon dioxide also leaves, at night, so this sounds like it forgot. | P2 | “Gases and extra water leave the plant.” | 1 clip |
| R4 | `oxygen.photo` (first appearance of the symbols) | Grey three-ball shapes and blue drops drift into the chloroplast. The caption says “carbon dioxide + water”, but nothing says which symbol is which. Later I have to recognise the grey shape as CO₂ on my own. | P2 | Two short labels that follow a CO₂ particle and a water drop the first time they appear (the label system already accepts a moving anchor). | No |
| R5 | `stoma.reason` | I hear “a lot of water can also be lost through them”, but only oxygen is shown leaving. | P2 | Let this shot also show vapour puffs (the stoma gas process currently runs one substance per shot). | No |
| R6 | `night.respire` | “Respiration makes carbon dioxide” is said over a still plant; I only see CO₂ in the next shot. | P2 | Show faint CO₂ forming in the leaves (the existing night-CO₂ symbols, at low rate). | No |
| R7 | `night.day`, `night.reason` | The grey CO₂ symbols are small and dark in the wide leaf view and at plant scale, so the key event (“used up” / “given out”) is hard to see. | P2 | Enlarge CO₂ in these two views, or frame `night.day` closer. | No |
| R8 | `resin.store` (xylem stage) | The heading (white) sits on the pale cream xylem and is hard to read, the same problem fixed for the leaf and stoma stages. | P2 | Add the xylem stage to the existing heading-backing rule. | No |
| R9 | `vacuole.back` | “From the vacuole, to the cell, to the leaf”: the leaf level is never shown; it cuts from the cell to the whole plant. | P2 | Optional: pass through the leaf-interior model on the way out. | No |
| R10 | `stoma.look` after `oxygen.release` | The stoma was open with oxygen leaving; the next shot shows it closed. The narration covers it (“this one is closed”), but it is a small surprise. | — | Acceptable; no change. | — |

**Correct and clear on re-check:**
- Stoma opening with the ends joined.
- Root hairs among the grains.
- Water route: soil → hair → root xylem → stem → leaf xylem → cells → vapour → stoma.
- Chloroplasts inside the cells.
- Vacuole holding only wastes.
- Leaf fall with its wastes.
- Resin and gum filling old xylem.
- Location labels.
- Final map with insets.

### V2.2 outcome: final correction pass for the re-check (2026-09-22)

Build: `releases/v2.2/site`. No GLB changed: all 12 are byte-identical to V2.1, so no Blender checkpoint was needed. One narration clip was regenerated (`vacuole.pivot`); the other 110 are unchanged.

| # | Outcome | What changed | Tested |
|---|---|---|---|
| R1 Old xylem “darker” vs glow | **FIXED** | `resin.old` no longer uses the warm highlight or the full dim. A soft 35 % dim (`view.dim: 0.35`) calms the paler layers, and the label points to the naturally darker inner ring. | Guided: desktop and phone captures. Explore: the selected part still uses the standard pick highlight. |
| R2 “Soil” label among roots | **FIXED** | A runtime anchor `LABEL_Soil` on the soil cut face, more than 0.1 from any root: left of the roots on wide screens, below them on portrait. Explore uses the same anchor, drawn to the left. | Guided and Explore; desktop and phone. |
| R3 “Oxygen and extra water leave” | **FIXED** | “Gases and extra water leave the plant.” Audit entry updated (N2 + p. 89 night CO₂ + N3; meaning unchanged). Content frozen, 1 clip synthesised, sync checked. | NCERT audit PASS; clip in sync (2.10 s vs 2.13 s expected). |
| R4 CO₂ / water not named | **FIXED** | In `oxygen.photo`, one CO₂ and one water drop drift in slowly, labelled “Carbon dioxide” and “Water”. Shapes differ (three in-line spheres vs a teardrop), so the colour is not the only cue. | Desktop and phone. |
| R5 Water loss not shown | **FIXED** | `stoma.reason` now shows oxygen throughout, then white vapour puffs from the moment the narration says water can be lost. Both streams are labelled. | Desktop and phone. |
| R6 Respiration makes CO₂: nothing shown | **FIXED** | In `night.respire`, grey CO₂ forms on the leaves as “Respiration makes carbon dioxide” is spoken, labelled “Carbon dioxide”. It stays on the leaves (it is day); it is given out in the next, night shot. | Desktop. |
| R7 CO₂ hard to see | **FIXED** | CO₂ is a little lighter and larger in all its scenes, but still grey, with a darker centre and two paler ends. It stays distinct from white vapour and blue oxygen. | Day, night (leaf interior) and night (plant) captures. |
| R8 Xylem heading on pale background | **FIXED** | The existing heading backing now also covers the xylem stage. | Computed styles on desktop and phone (the backing gradient is active). |
| R9 Leaf skipped in the pull-back | **FIXED** | `vacuole.back` changes scale part-way (`view.then`): vacuole → cell, then a veiled cut to the leaf model, pulling back from its surface, then the whole plant (`vacuole.plant`). The narration keeps playing through the change. The leaf is clearly on screen for about 2.5 s. | Stage sequence cell → leaf → plant; narration sync 4.02 s vs 4.07 s. |

**Beginner re-check after V2.2:**

| # | Question | Answer |
|---|---|---|
| 1 | Old xylem looks like what I hear? | Yes: it is the darker inner ring, labelled. |
| 2 | Soil unmistakably soil? | Yes: the label points into open soil, away from the roots, on both screen shapes. |
| 3 | Summary includes all gases? | Yes: “Gases and extra water leave the plant.” |
| 4 | CO₂ and water named at first sight? | Yes. |
| 5 | Water vapour leaving? | Yes: white puffs, labelled, when the narration says so. |
| 6 | CO₂ being produced? | Yes: it appears in the leaves as respiration is named. |
| 7 | CO₂ easy to follow by day and night? | Yes. |
| 8 | Xylem heading readable? | Yes. |
| 9 | The leaf seen in the scale transition? | Yes. |

## V2.2 student re-check (2026-09-22)

Done on the V2.2 build. I read the full script, then captured mid-narration frames of 30 shots across all five chapters, this time including chapters 01–02 and the summary (`docs/qa/captures/s3_*`). **Nothing changed yet.**

**Overall:**
- As a Class 10 beginner I understand the whole lesson and can explain how plants deal with wastes.
- The R1–R9 fixes hold.
- One label still points at the wrong thing (S1).
- The rest are small hear/see mismatches and polish.

| # | Where | What a student experiences | Sev. | Proposed fix | New audio? |
|---|---|---|---|---|---|
| S1 | `oxygen.produce` | The label “Oxygen” is anchored to a **disc stack**, so its line points at the green discs, not at the blue oxygen forming beside them. A student could read the disc as “oxygen”. | **P1** | Anchor the label to one of the forming O₂ molecules (the runtime `track` anchor added in V2.2). | No |
| S2 | `oxygen.travel`, `oxygen.look` | I hear “a leaf, high up on the plant”, but the camera looks down on the leaf and the soil fills the background, so the leaf looks low. | P2 | Frame the featured leaf from slightly below or level, with sky (the dark background) behind it and the soil out of shot. | No |
| S3 | `oxygen.look` (leaf highlighted) | The warm highlight turns the green leaf olive-yellow. In section f, yellowing is the sign of an **older** leaf, so the “leaf that makes food” briefly looks like an old one. | P2 | A weaker highlight on green leaves (as was done for chloroplasts in V2), or a cool rim instead. | No |
| S4 | `resin.layers`, `resin.old` → `xylem.cells` → `resin.store` | In the stem slice, the old xylem already shows amber, resin-filled pores **before** the lesson shows resins and gums being stored. In the xylem close-up the old tubes are empty until `resin.store`. The two scales disagree, and the amber gives away the answer early. | P2 | Stem-slice old-xylem pores plain dark until `resin.store`, then amber (a texture swap). Alternatively, accept, since the slice is “how old wood looks”. | No |
| S5 | Chapter 04 map | The “Gases” label disappears at `whole.soil` (the 5-label limit), then reappears in `whole.answer`. | P2 | At `whole.soil`, drop “Excess water” … or allow 6 labels there, as `whole.answer` does. | No |
| S6 | `night.night` | Just after “closing stomata saves water”, the night view shows CO₂ leaving through the stomatal gap. A sharp student may ask how it gets out if stomata close. This is the documented decision C-11 (not narrated; stomata partly open at night), but the picture still shows a full stream. | P2 | Thinner, slower CO₂ stream at night, or a slightly narrowed guard-cell gap in that shot. No narration change. | No |
| S7 | `soil.excrete` | The purple wastes rise in a line right next to one root hair, so they can read as travelling *along the hair* rather than out into the soil. | P2 | Let them drift sideways into the gaps between grains after leaving the cell. | No |

**Clear and correct on this pass:**
- Chapter 01–02 build-up: alive → life processes → wastes → excretion → kidneys → no such organ → big question.
- Leaf interior with labelled cells and air spaces.
- Chloroplasts inside the cells.
- O₂ route out through the pore.
- Stoma closed / open with the ends joined.
- CO₂ and water named on arrival.
- Vapour labelled.
- Respiration CO₂ forming.
- Night and day CO₂.
- Root hairs among the grains.
- Water route.
- Cell, vacuole and stored wastes.
- Pull-back through the leaf.
- Older leaf yellowing and falling with its wastes.
- Old xylem as the darker ring.
- “Dead tissues: places to store wastes”.
- Resins and gums.
- Soil label.
- Final map with insets.
- Recall.

### V2.3 outcome: fixes for the V2.2 re-check (2026-09-22)

Build: `releases/v2.3/site`. No narration changed (spoken hash unchanged; 0 clips). On-screen changes were re-audited and re-frozen. One GLB changed (`10_stem_cross_section`, Blender v040 → v042 export); the other 11 are byte-identical to V2.2.

| # | Outcome | What changed | Tested |
|---|---|---|---|
| S1 “Oxygen” label on a disc | **FIXED** | The label rides on a forming O₂ molecule (`TRACK_CP_O2`). | Desktop and phone. |
| S2 “High up” leaf with soil behind it | **FIXED** | `leafApproach` / `leafHero` framed nearly level and aimed slightly above the leaf, so the dark sky, not the soil, is behind it. | Desktop and phone. |
| S3 Food-making leaf turns yellow | **FIXED** | No warm highlight on `oxygen.look`; the leaf stays green (yellowing now only means the older leaf). | Desktop. |
| S4 Amber resin shown before it is taught | **FIXED** | Stem texture: old-xylem pores are closed and dark brown, not amber (Blender v040). Amber appears only when resins and gums are shown stored (xylem close-up fill, then the stem’s resin deposits in `resin.reason`). Scales now agree. | Blender render; runtime `resin.old` and `resin.reason`. |
| S5 “Gases” label disappears | **FIXED** | `whole.soil` shows all 6 map labels (`labelsMax: 6`, as in `whole.answer`). | Desktop and phone. |
| S6 Full night CO₂ stream after “closing stomata saves water” | **FIXED** | The night stream is thinner and slower (rate 4.2 → 1.6), consistent with stomata being mostly closed at night (C-11). The narration is unchanged. | Desktop. |
| S7 Soil wastes rise along a root hair | **FIXED** | The wastes leave the top of one surface cell and spread sideways into the water between grains. Particles slightly larger. | Desktop and phone. |

---

## V2.4 outcome: deep biological audit corrections (2026-09-22)

Source: `deep-biological-audit.md` (DA-01 … DA-23, plus DA-24 and DA-25 found during the pass). Same script (the freeze matches; no TTS), visuals only. The full status table is in `deep-biological-audit.md` § V2.4 outcome.

- **FIXED:**
  - P1: DA-01, DA-02;
  - P2: DA-03, DA-04, DA-05, DA-06, DA-07, DA-08, DA-09, DA-10, DA-11, plus the new DA-24 and DA-25;
  - P3: DA-12, DA-16, DA-19, DA-22, DA-23.
- **KEPT** (low risk, or a fix would add a worse ambiguity): DA-13, DA-14, DA-15, DA-17, DA-20, DA-21.
- **NOT APPLICABLE:** DA-18 (the block is closed; the audit misread an unlit underside).
- **Narration:** no factual contradiction required a text change, so no stop was needed.

### Final learner test (V2.4, as a Class 10 beginner)

| # | Question | Answer after watching V2.4 |
|---|---|---|
| 1 | Can I tell what water is liquid and what is vapour? | **Yes.** Liquid is always a blue drop, and it stays in the xylem and on the cells. Vapour is always a soft white puff, and it appears only in the air space and outside the pore. The "Water vapour" labels point at puffs, never at drops. |
| 2 | Do I understand that water moves internally through xylem? | **Yes.** When water rises, the stem goes see-through and the drops travel in a pale channel inside it, up to the leaf's midrib. The root close-up shows the same tan xylem tube. |
| 3 | Does the stoma opening/closing look biologically coherent? | **Yes.** Water comes from inside the leaf into the guard cells. They swell and bow apart, then shrink back, and the pore opens and closes between them. |
| 4 | Do guard cells remain structurally intact throughout? | **Yes.** Two kidney-shaped cells joined at both ends, with the chloroplasts inside at every state, including the slider. The leaf slice shows the same pair. |
| 5 | Do I understand what old xylem is? | **Yes.** It is the darker inner wood of the stem slice, and up close the older, darker dead tubes. |
| 6 | Do I understand where resin/gum is stored? | **Yes.** In the old xylem: amber masses fill the old tubes, and the same amber appears in the slice's dark core. |
| 7 | Do I think the waste is sitting on the leaf surface? | **No.** The wastes travel inside the see-through stem and become patches in the leaf's own tissue. The leaf only starts to yellow afterwards, when "time passes". |
| 8 | Do root hairs look like they are actually in soil? | **Yes** (unchanged). They grow between touching soil grains, with water around them. |
| 9 | Can I distinguish xylem from resin? | **Yes.** Xylem is pale tan at every scale; resin and gum are bright amber. |
| 10 | Does the plant/stem context feel coherent? | **Yes.** The plant is a young woody plant with a barked trunk. The cut ring fits that trunk, and the slice with bark and rings comes from it. |
| 11 | Does any visual imply a process the narration does not describe? | **No.** The one borderline case is `whole.oxygen`, which names night CO₂ while showing a daytime plant with oxygen. It is kept deliberately, because CO₂ leaving by day would contradict the lesson, and the summary label covers it. |
| 12 | Does anything realistic-looking still invite a wrong interpretation? | **No known case.** The remaining simplifications (the single root xylem strand, amber resin masses, grey O atoms in CO₂, the cream cut cell) are listed in `accepted-simplifications.md`, and none contradicts what is taught. |
