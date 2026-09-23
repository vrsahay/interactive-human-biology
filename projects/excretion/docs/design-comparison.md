# Design comparison: Excretion in Plants vs Types of Joints

Types of Joints (`joints-platform`, the film route) is the product-design reference. This lesson follows its design language and learning philosophy but does not reuse its code or its Biology.

## Where they are the same

- **Stage and lighting.** A dark full-bleed 3D stage (radial gradient and vignette), the same colour tokens, and the same lighting rig: key and rim lights that follow the camera, neutral tone mapping, FOV 32.
- **Top bar and heading.** Brand plus a chapter line with a warm number. The topic heading sits top-left with no card behind it, and is never read aloud word for word.
- **Timeline.** Chapter-segmented, with chapter numbers, time, an Explore / “Return to the lesson” pill and full screen. The UI quiets while the film plays.
- **Labels.** Dark pills with a 58 px leader; at most five per shot, apart from the one exception listed below.
- **Emphasis.** A warm highlight on the subject; everything else darkened but kept opaque.
- **Panels.** “Your turn” opens bottom-right. Explore and Recall open as temporary panels bottom-left, and return to the exact film frame.
- **Teaching shape.** Teach → show → try; nothing is asked before it has been taught. Every shot is narrated, and narrations are distinct from each other (Jaccard < 0.45).
- **Narration.** The same Google voice and settings, pre-rendered at build time. One audible owner at a time, clips starting after a 350 ms lead-in, catch-up at 1.15×, holding instead of rewinding, and the Start card as the audio gesture.

## Meaningful differences

| Area | Types of Joints | Excretion in Plants | Why |
|---|---|---|---|
| **Caption line** | The bottom subtitle is the spoken sentence. | The bottom line is a **concise caption, one idea per spoken sentence** (e.g. spoken “Many plant waste products are stored in vacuoles like this one.” → caption “Many plant wastes are stored in vacuoles.”). Settings → “Captions show: every spoken word” restores the full sentence. | The brief’s caption design (“do not display the entire narration transcript”). The full-words option keeps the lesson accessible without sound. |
| **Caption timing** | The subtitle follows the clip. | The TTS pipeline measures where each sentence starts in the audio (from pauses in the LINEAR16 render) and stores `sentenceStartsMs` in the manifest, so each caption changes when its sentence starts. | One caption per sentence needs sentence-level timing. |
| **Chapter structure** | Chapters of similar length. | Five chapters. Chapter 03 “Follow the waste” is one long journey in **six sections**. Each section is shown as a quiet tick in its timeline segment and in the chapter line (“03 Follow the waste · Inside a cell”). | The brief’s structure: one journey that discovers six strategies without a checklist. Sections are named by **place**, never by the answer. |
| **Scale transition** | None of this depth. | Plant → leaf → tissue → cell → vacuole and back, bridged by a veil. A breadcrumb in the heading eyebrow reads “Plant › Leaf › Tissue › Cell › Vacuole”. | One of the brief’s major teaching moments. |
| **Summary** | Five labels at most. | The final map (`whole.answer`) shows **six** route labels plus two picture-in-picture windows (vacuole, old xylem). It is built one route per shot. On phones the labels drop their route line. | The brief’s synthesis map has six routes. Every other shot keeps five labels or fewer. |
| **Recall ending** | Recall ends when the questions are done. | Six questions, then an **open prompt**: “Can you explain, in your own words, how plants deal with wastes?” The learner speaks or types an answer (it stays on the device), compares it with a model answer, and ticks a six-point self-check. | The brief’s success test is that the learner can explain the idea, not only pick answers. |
| **Explore gating** | By chapter. | By the shot that teaches each model (e.g. old xylem unlocks after `resin.reason`). A locked model says “Later in the lesson”. | Chapter 03 is long, so chapter-level gating would open models before they are taught. |
| **Task feedback audio** | Cues for exploration and recall. | The same, plus each “Your turn” confirmation is a cue, and the film **waits for it to finish** before the next shot. | Otherwise the next shot’s narration would start under the confirmation. |
| **Hidden page** | Not applicable. | The film pauses when the page is hidden. The clock follows real elapsed time (capped at 1 s per frame) so narration and film stay together on slow devices. | Found in QA: a stalled film made the voice wait mid-sentence. |
| **Interaction set** | Explore tasks per joint. | Three teach-then-try moments tied to the processes: bring sunlight to the leaf, store the last wastes in the vacuole, find the tissue that stores resins and gums. Each has buttons as well as tapping on the model. | Each task makes the learner repeat the process they just watched. |
| **Runtime** | Preact + signals, TypeScript. | Plain ES modules + three.js; the lesson is data-driven (`lesson-data.js`, `shots.js`, `world.js`). | No code copied from the reference. The data files use the field names from the brief (cameraTarget, narration, caption, highlightObjects, animation, interaction, duration). |

## Checked and intentionally unchanged

- **Visual hierarchy:** 3D subject, then heading, then caption, then quiet controls.
- **Label density:** five or fewer per shot, except the final map.
- **Guided mode as the main experience:** Explore is an entry point, not a parallel mode.
- **Pacing:** each shot lasts as long as its voice needs, plus a tail. The central question has a longer pause, about 2.8 s.
