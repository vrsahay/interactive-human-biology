# Learning design

> **V2 / V2.1 update.** The shape below is unchanged; V2 added the scale-specific close-ups (see `v2-plan.md` and `asset-accuracy-map.md`). V2.1 fixed three learner-clarity points:
> - **Dead tissues.** `xylem.cells` now says plants use dead tissues as places to store some wastes, so “dead cells” has a purpose.
> - **CO₂.** Respiration makes CO₂, a gaseous waste → given out at night → used by day as an input for photosynthesis, in that order.
> - **Stomata.** Closed stoma and guard cells → they swell, the pore opens → what passes through → closing saves water. The stoma is introduced as the way the oxygen left, and the night section opens with “Now follow a second gas”.
>
> Heading eyebrows use one location hierarchy everywhere:
> - *Plant › Leaf › Inside the leaf / Leaf surface › Stoma / Cell › Chloroplast / Cell › Vacuole*
> - *Plant › Stem › Cross-section › Xylem › Old xylem*
> - *Plant › Root › Root hairs › Soil*
>
> The breadcrumb described under “The scale transition” below is the V1 version.

**Success test.** Could a Class 10 student who knew nothing about excretion in plants at the start explain, in their own words, how plants deal with wastes? Every design choice below serves that test.

## The shape: one question, followed

```
BASIC IDEA   01  life processes → unwanted by-products → excretion
QUESTION     01  “Plants also carry out life processes. So what happens to the substances they do not need?”
PROBLEM      02  animals have organs for this (kidneys) · a plant has leaves, stem, roots, but none works like a kidney
             02  PAUSE: “So how does a plant deal with its wastes?” (2.8 s of silence on the question)
DISCOVERY    03  follow the waste, place by place (six sections, named by place, never by the answer)
PROCESS          each section shows WHERE → WHAT HAPPENS → RESULT before anything is named
EXPLANATION      then the name and the NCERT statement
INTERACTION      three “Your turn” moments, each after its explanation
SUMMARY      04  the whole plant again: six routes built one at a time into one map
RECALL       05  six questions → “Can you explain, in your own words, how plants deal with wastes?”
```

## Chapter 03: every strategy as a process

| Section | WHERE (camera) | WHAT HAPPENS (on screen) | RESULT / DESTINATION (then named) | Learner does |
|---|---|---|---|---|
| At a leaf | whole plant → one leaf | sunlight falls on the leaf; oxygen molecules form | oxygen drifts out of the leaf into the air → “a waste product of photosynthesis, released” | brings the sunlight in with a slider and watches oxygen leave |
| Water in the plant | leaf → roots → following one drop up the stem → leaf | drops enter a root, rise in the stem (xylem), reach the leaf | vapour escapes into the air → “transpiration: how a plant gets rid of excess water” | — |
| Inside a cell | plant → leaf → tissue → **cell** → **vacuole** | wastes in the cytoplasm drift into the vacuole and stay | “stored, not removed” (the first store, contrasted with the two removals before it) | taps (or presses the button for) the last three wastes to store them |
| An older leaf | plant → an older, low leaf | wastes gather in the leaf; it yellows, then falls | the wastes leave the plant with the fallen leaf; “leaves also fall for other reasons” | — |
| Inside the stem | lower stem → a magnified slice opens → old xylem | the layers are shown; wastes move in and become amber resin and gum drops | “stored as resins and gums, especially in old xylem” | finds the old xylem by tapping or choosing from the layers; a wrong answer points back to the amber drops |
| Around the roots | down the stem, through see-through soil, to the roots | a few waste particles pass from the roots out into the soil | “plants excrete some waste substances into the soil around them” | — |

**Remove versus store** is made explicit twice:
- At the pivot into the cell: “Oxygen and extra water leave the plant. But some wastes are not removed at all. They are kept inside the plant.”
- Again on each storage beat: “Kept, not removed.”

## The scale transition

The brief’s major teaching moment:
- **Going in:** plant → leaf (camera dives to the leaf surface, veil) → tissue (“A leaf is made of many tiny cells”) → one cell (four parts labelled) → vacuole (wastes stored).
- **Coming back:** vacuole → cell → leaf (camera pulls back through the tissue, veil) → the whole plant (“Its leaves are made of cells like the one we just saw”).

The heading eyebrow is a breadcrumb that grows and shrinks with the scale: *Plant › Leaf › Tissue › Cell › Vacuole*, then *Vacuole › Cell › Leaf*, then *Leaf › Plant*.

## Teach first, then try

No question is asked and no task is set before its idea has been shown and explained:
- **Sunlight:** after `oxygen.reason`.
- **Store the wastes:** after `vacuole.reason`.
- **Find the store:** after `resin.reason`.
- **Recall:** after the whole map.

`npm run qa:content` enforces this order.

## Explore

The Explore pill is always there. Each model unlocks only after the shot that teaches it:

| Model | Unlocks after |
|---|---|
| Whole plant | `different.none` |
| Leaf | `water.reason` |
| Plant cell, Vacuole | `vacuole.reason` |
| Stem cross-section | `resin.layers` |
| Old xylem | `resin.reason` |
| Roots and soil | `soil.reason` |

Descriptions only restate the lesson. Parts the lesson does not teach (the pith, the stand) are named, never explained.

## Words

- **Narration:** Class 10 teaching language; each shot says why, what happens and what the result is; 1,341 spoken words in all.
- **Caption:** one concise idea per spoken sentence, never the transcript. “Every spoken word” is available in Settings.
- **Heading:** the topic, never read aloud word for word.
- **Terms:** each is first spoken in the shot that teaches it (checked by `npm run qa:content`). This covers life processes, excretion, kidneys, photosynthesis, oxygen, xylem, transpiration, cytoplasm, vacuole, phloem, bark, old xylem, dead cells, and resins and gums.

## Final synthesis (no new ideas)

| Map shot | Route |
|---|---|
| `whole.oxygen` | Leaf → oxygen → air |
| `whole.water` | Leaf → excess water → air |
| `whole.vacuole` | Cell → waste → vacuole (window on the cell) |
| `whole.leaf` | Leaf → stored waste → leaf fall |
| `whole.xylem` | Old xylem → resins and gums → stored (window on the stem) |
| `whole.soil` | Roots → waste substances → soil |
| `whole.answer` | all six together: “No single organ. Many ways.” |

## Recall

1. Six questions, each taken straight from p. 98, asked while the camera returns to where the idea happened (without labels).
2. A wrong answer can be retried; the reveal is spoken.
3. The closing open prompt: the learner explains the whole idea aloud or in writing.
4. The learner compares with a model answer and ticks the six-point self-check.
