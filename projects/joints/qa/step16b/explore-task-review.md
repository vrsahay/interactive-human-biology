# Explore task review — every exploration now asks for something

## 1. The problem

From the audit: our Explore offered movement with no goal, and in five of nine chapters it offered no content at all.
The only place in either product where a learner did something and found out whether they were right was the 90° elbow
check — one beat, of one chapter, 58 % of the way through the lesson. The first 161 seconds were entirely passive.

## 2. What a task is

`ExploreConfig` may now carry one, as data:

```json
"task": {
  "promptKey": "explore.pivot.task",
  "doneKey": "explore.pivot.done",
  "goal": { "kind": "reach", "primaryDeg": 40 }
}
```

Three goal kinds, all evaluated against the exploration session's own readout, so the engine still knows nothing about
necks, shoulders or elbows:

| Kind | Met when | Used by |
|---|---|---|
| `attempt` | the learner has moved the joint at all (peak > 0.05°) | fixed — the joint barely moves and springs back, so succeeding *is* having tried |
| `reach` | the peak magnitude on the primary axis reaches `primaryDeg` | pivot (40°), hinge (85°) |
| `twoWay` | both axes reach their magnitudes | ball-and-socket (25° and 15°) |

The **peak** is kept, not the current angle: letting go does not undo the task, and a joint that springs back can still
be tried. A reset clears the peak but not the fact that the task was done.

Build-time validation rejects a goal the joint cannot reach, a `twoWay` goal on a single-axis joint, an `attempt` goal
on anything that does not spring back, and a missing text key.

## 3. The four tasks

| Exploration | Status | Task | Confirmation |
|---|---|---|---|
| `explore.fixed` | Teaching simulation | "Try to move the two skull bones apart." | "They barely move, and they spring straight back. That is a fixed joint." |
| `explore.pivot` | Teaching simulation | "Turn the head as if you were looking over one shoulder." | "The head turned, and the bone below stayed still. That is a pivot joint." |
| `explore.ball` | Teaching simulation | "Move the arm in two different directions." | "One joint, more than one direction. That is a ball-and-socket joint." |
| `explore.hinge` | **Validated rig** | "Bend the elbow until it is about half-way — around 90 degrees." | "That is flexion. Straighten it again and that is extension — one line, two directions." |

Each task is spoken as a learner-paced cue when the exploration opens, and each confirmation is spoken when the goal is
met. Both are announced to assistive technology.

**The distinction the brief insists on is not blurred.** The three teaching simulations still declare
`status: "teaching-simulation"`, still show the *Teaching simulation* badge and still carry the plain line "This shows
the movement pattern. The bones are real; the movement is a demonstration." The elbow still declares `validated-rig`,
still drives `flexion` through `JointController.setDof` and nothing else, and still displaces no render groups.

## 4. The film hands the learner the joint

Three chapters end with a beat that opens the exploration by itself, the way the recall chapter opens its questions:

| Chapter | Handover beat | Spoken |
|---|---|---|
| 03 Fixed | `fixed.task` | "Try it yourself. See whether you can move these two bones apart." |
| 04 Pivot | `pivot.task` | "Try it yourself. Turn the head as if you were looking over one shoulder." |
| 05 Ball-and-socket | `ball.task` | "Try it yourself. Move the arm in two different directions." |

The elbow chapter does **not** hand over a second time: it already hands the learner the validated rig inside the film,
at `hinge.try` and then the 90° check. Its exploration carries the same task for anyone who opens it from the button.

Handover offers once per visit to a chapter. Leaving the chapter arms it again, so a learner who scrubs back can take
it again. Escape or *Return to the lesson* carries the lesson on from where it paused; an exploration the learner
opened themselves still simply closes, as before.

## 5. Participation across the lesson, before and after

| | Before | After |
|---|---|---|
| Chapters with a learner action | 1 of 9 | **4 of 9** |
| First interaction | 2:41 (58 % through) | **0:49** (13 % through) |
| Actions with a pass condition | 1 | **5** (four tasks + the 90° check) |
| Explorations with a stated purpose | 0 of 4 | **4 of 4** |
| Chapters where Explore opens something with no content | 5 | 5 (unchanged — see below) |

The free-orbit mode in the five non-category chapters is unchanged. The audit flagged it, but giving those chapters
content is an Explore-architecture question rather than the teaching-depth work this step was scoped to, and it is left
open.

## 6. Proof

`tests/e2e/step16b-teaching.spec.ts` §3 asserts, in the shipped content and against the running build:

- every exploration has a task with a prompt, a confirmation and a spoken cue;
- every goal is inside the joint's own limits;
- exactly the three non-elbow chapters declare a handover, and each names a real shot;
- reaching each handover beat opens the panel with the task stated and `data-done="false"`;
- **doing the task with the keyboard alone** flips it to `data-done="true"` and shows the confirmation.
