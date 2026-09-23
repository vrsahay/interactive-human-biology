# Must fix before release (P0 and P1 only)

> **Where the evidence lives (repository cleanup, 2026-09-23).** Paths below to intermediate builds (`releases/v2` … `releases/v2.3`, the `v2.4-rc*` folders) and to bulk QA captures (`docs/qa/captures/**`, the full deep-audit render sets, the watch frame series) refer to development artefacts that are kept **locally only**, in the git-ignored `local-archive/`, and are not part of the public repository. The shipped release is `releases/v2.4/site`; a representative evidence set remains under `docs/qa/`. See [repo-cleanup-final.md](repo-cleanup-final.md).

Source: `deep-biological-audit.md`. The audit was of V2.3 (Blender v042); V2.4 is the correction pass (Blender v043–v048, `releases/v2.4/site`).

**Status for V2.4: nothing open. No P0; both P1 items fixed and verified.**

| ID | Issue | Status in V2.4 | Verification |
|---|---|---|---|
| — | P0 | none were found | — |
| DA-01 | Guard-cell chloroplasts left the shrunken guard cells | **FIXED**: the chloroplasts have their own `Open` shape key built from the guard cell's centre line and radius, and the runtime drives them with the cells (checkpoint v043, `03_stoma` re-exported). | `validate.py` containment check at Open = 0, 0.25, 0.5, 0.75 and 1: 0 vertices outside, at least 0.018 from the wall. Blender renders `docs/qa/deep-audit/v24/blender/Stoma_*_m{0,0.5,1}_z2.2.png`. Runtime `v24final_01/02/03`, `v24_stoma_try_half`. The task slider drives all 5 morphs together. |
| DA-02 | "Water vapour" label on liquid drops | **FIXED**: the label rides the vapour in the air space (`TRACK_LI_Vapour`) and waits until puffs are there. Liquid water stays with the cells (DA-03). | `v24final_04_water_inside_leaf`, `v24final_05_water_vapour`, `v24_mobile_water_vapour`. The label is hidden at 15% and visible on the vapour column at 40–95%. |

## Kept as-is (the V2.4 constraints held)
- Narration, captions, recall and chapter text are unchanged. The spoken and surface hashes both match the freeze, so no TTS was needed.
- New Blender checkpoints only (v043–v048). v042, `releases/v2.3` and all earlier releases are untouched.
- Only the affected GLBs were re-exported (plant, stoma, leaf interior, root). The other 8 are byte-identical to V2.3.
