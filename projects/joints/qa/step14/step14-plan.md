# Step 14 — implementation plan

Branch `step14-teaching-redesign`, cut from `537ac71` (tag `step13-frozen-baseline`). The Step-13 frozen build is
recoverable with `git checkout step13-frozen-baseline`. Nothing in the frozen set is edited in place.

## A. What exists today (audit)

**Content → engine → UI is already data-driven, and it can carry Step 14 without an architectural rewrite.**

| Layer | What it does | Step-14 fit |
|---|---|---|
| `content/lessons/hinge-elbow.json` | 6 chapters, 22 shots. Each shot declares camera (preset/site/scale), body (highlight/hidden/dim/shell), joint (visible/handOver/reveal/poseKeys), labels (anchors/bands/sites), overlays (axis, arc, badge, bands, concept indicators), caption (title/text/note keys) and interaction (mode, check). | Extend: more chapters/shots, plus a new `explores` block. |
| `content/locales/en/hinge-elbow.json` | 117 strings with provenance (`source-excerpt`, `figure-reference`, `draft-enrichment`, `ui`). | Extend with new draft-enrichment teaching lines + UI strings. |
| `VideoTimeline` | Clock, chapters, seek, learner hold, check status, buffering, `explore` boolean. | Reuse. `explore` becomes "an explore session is open" rather than "free-orbit mode". |
| `AppVideoRuntime` | Applies a shot to the App: `presentBody`, `presentJoint`, `presentLabels`, `presentOverlays`, camera framing, pose keys, composition shift/lift. | Reuse; add explore enter/exit that saves and restores shot presentation. |
| `App` (engine) | Structures, anchors, labels, highlighter, interaction, camera director, the validated `JointController.setDof` path. | Reuse unchanged. |
| `BodyLayer` | 35 render groups, each bound as its own `Object3D` with `matrixAutoUpdate = false`. | **This is the key finding** — see below. |
| `ConceptOverlay` | Schematic indicators per body site (fixed ring, rotation arrow, multi-axis arcs, hinge arc), phase-animated, already labelled schematic. | Reuse as the "movement preview" in each chapter. |
| `InteractionController` | Pointer → `HingeDragGesture` → `setDof`; picking; orbit; capture. | Reuse for the hinge; add a generic drag→angle mapping for teaching motion. |
| `NarrationPlayer` + `pipeline/audio/build_narration.ts` | Build-time TTS, one clip per shot, spoken text assembled only from existing caption strings. | Reuse; re-synthesize for new/changed shots. |
| Accessibility | `<main>`, dialogs with focus traps, 44 px targets, measured contrast, reduced motion, live announcements, one semantic quiz prompt. | Must not regress; explore panels join the same patterns. |

**Current Explore** is a single global boolean: it switches the interaction policy to free + picking and shows the joint
slider only when the shot already has the elbow visible. Other chapters get "Drag to look around". That is the thing
Step 14 replaces.

**Current recap** is `recap.pullback` → `recap.compare` (all four categories named in one line, six site labels on the
body) → `recap.check` (bend to 90°). It states the taxonomy; it does not make the learner retrieve it.

## B. The feasibility finding that shapes everything

Every part Step 14 needs to move is **already its own render group**, and each group node has `matrixAutoUpdate = false`:

| Group | Contents | Used for |
|---|---|---|
| `skeleton.015` + `skeleton.033` | 22 skull bones + 28 teeth | head turn (pivot) |
| `skeleton.019` | `atlas_c1`, `axis_c2` | the pivot itself (stays still) |
| `skeleton.016` | `frontal_bone`, `parietal_bone_right` | fixed suture pair |
| `skeleton.005` / `.004` / `.006` / `.003` | `humerus_right` / `radius_right` / `ulna_right` / all 27 right-hand bones | arm swing (ball-and-socket) |
| `skeleton.014` / `.013` | `scapula_right` / `clavicle_right` | the socket side (stays still) |

So a teaching simulation is a **rigid transform of existing geometry about a teaching axis** — no new asset, no new rig,
no change to any validated file. This satisfies rule 23 ("no new full anatomical rigs") while still letting the learner
*see and cause* movement.

## C. Design

### C1. Generic explore layer (engine stays anatomy-agnostic)

```
src/engine/explore/
  ExploreSession.ts    lifecycle: enter(config) → interact → reset() → exit(); restores the shot exactly
  TeachingMotion.ts    rigid rotation of N body groups about a pivot/axis, with limits (data-driven)
  exploreTypes.ts      config types + a validator used at build time
```

- **No anatomy ids in `src/engine`** (existing project rule). Group ids, pivots, axes, limits and labels all come from
  content and are validated against the body manifest at build time.
- Movement models are generic behaviours, not body parts: `none` (fixed), `oneAxis` (pivot), `twoAxis` (ball-and-socket),
  `dof` (the validated hinge, which routes to `JointController.setDof` and touches nothing else).
- `BodyLayer` gains `setGroupTransform(groupId, matrix)` / `clearGroupTransforms()` — the only new engine capability.

### C2. Explore configs live in content

A new `explores` array in the lesson JSON, one per category, each with: joint type, status
(`validated-rig` | `teaching-simulation`), camera site, highlighted/context structures, the motion model (groups, pivot,
axis, limits, reset), instruction/explanation keys, and the reset state. Schema-validated at build time like everything
else, including a check that every referenced group exists in the body manifest.

### C3. Lesson flow (9 chapters)

`01 Hook → 02 What is a joint → 03 Fixed → 04 Pivot → 05 Ball-and-socket → 06 Hinge → 07 Compare → 08 Recall → 09 Body map`

Each joint chapter follows the same beats: **locate → zoom → move → name → explain → body example → explore → return**.
The hook shows a shoulder moving many ways and an elbow bending one way *before* any terminology.

### C4. Recap becomes retrieval

Four prompts (skull → neck → shoulder → elbow), each: highlight the region, ask "which type of joint is this?", let the
learner answer, then reveal. The full body map closes the lesson instead of carrying the teaching.

### C5. Honesty is preserved and made louder

The elbow explore is labelled **Validated rig**; the other three are labelled **Teaching simulation** in the explore UI
itself, in addition to the existing schematic notes and the `Schematic ligament band` labelling. No string will describe a
teaching simulation as validated or scientific.

## D. Sequence (each phase ends green: typecheck + unit + the touched e2e)

| Phase | Work | Risk |
|---|---|---|
| A | Audit + this plan | done |
| B | `ExploreSession`, `TeachingMotion`, config types, `BodyLayer.setGroupTransform`, build-time validation | low |
| C | Move hinge Explore onto the abstraction — validated behaviour byte-identical | medium: must not disturb the rig |
| D | Fixed explore (resist + "does not move") | low |
| E | Pivot explore (head turns on C1/C2) | medium: pivot point/axis must look right |
| F | Ball-and-socket explore (arm swings, two axes) | medium: arm chain must move as one |
| G | Recap → retrieval sequence | medium: touches the a11y quiz-prompt test |
| H | Short recall challenge (4–6 questions) | low |
| I | Lesson restructure to 9 chapters + captions + re-synthesized narration | **highest churn**: shot ids are referenced across 10 spec files |
| J | Accessibility + responsive pass | medium |
| K | Full regression + Step-14 reports | — |

## E. Explicit non-goals and guardrails

- No new validated rigs (skull, C1/C2, shoulder, hip, knee stay teaching simulations).
- The elbow rig, its manifest, its GLBs and its 0/45/90/145 consistency are untouched; Phase C is a call-site refactor only.
- `qa/expert/frozen-build.json` and the Step-13 expert artifacts are not edited. Step 14 writes its own `qa/step14/`.
- No new curriculum claims: new teaching lines are `draft-enrichment` and badged DRAFT, and the hip stays exactly at its
  current provenance status (still PENDING EXPERT CONFIRMATION from Step 13).
- Performance: reuse the existing body asset, groups and materials; no new downloads beyond narration clips for new shots.
  Step-12/12R performance findings stay as recorded, and no mobile certification is claimed.
- Step 12 remains **FAIL**; Step 13 remains **CONDITIONAL**. Step 14 passing does not make the product release-ready.
