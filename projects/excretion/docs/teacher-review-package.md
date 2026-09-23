# Teacher review: Excretion in Plants (Class 10), V2.4

**What we ask of you:** please check only whether the **Biology** is accurate and appropriate for a Class 10 NCERT learner (NCERT *Science* Class X, Ch. 5, §5.5.2, p. 98). Please do **not** review the design or the interface.

**How to view the lesson**
- Open `releases/v2.4/site` through a web server (for example `npx vite preview --outDir releases/v2.4/site`), or use the link you were sent.
- It is a narrated 9½-minute film with four short "Your turn" tasks, an Explore mode, and a Recall quiz at the end.
- Stills of every key moment are in `docs/qa/release/evidence/`.

## Documents in this package

| Document | What it is for |
|---|---|
| `ncert-content-audit.md` | Every spoken and on-screen sentence (292 lines), each matched to an NCERT page, or marked as a definition or a simplification. |
| `biological-accuracy-audit.md` | The biology the lesson says and shows, claim by claim, with its status (§§1–2d). |
| `deep-biological-audit.md` | The 3D models and animations, audited from all angles (DA-01 … DA-25), and how V2.4 corrected them. |
| `asset-accuracy-map.md` | One row per 3D model: what it shows, and what is simplified. |
| `accepted-simplifications.md` | The deliberate simplifications (32 items). **Please check each one.** |
| `v2-self-review.md` | The design team's own "as a Class 10 student" reviews, including the final learner test. |
| `qa-report.md` | Technical test results (for reference only). |

## Please inspect specifically

For each topic, please mark it **OK**, **OK with a note**, or **Factual issue**, and name the shot or screenshot concerned.

| # | Topic | Where to look (shot / evidence file) | NCERT |
|---|---|---|---|
| 1 | Stomata and guard cells: guard cells swell (pore opens) and shrink (pore closes); chloroplasts in the guard cells | `stoma.look`, `stoma.open`, `stoma.close`, `stoma.try`; `02_stoma`, `03_stoma_closing` | C10 p. 83 |
| 2 | Respiration → CO₂ as a waste; at night CO₂ is given out, by day it is used in photosynthesis | `night.respire`, `night.night`, `night.day`, `night.reason` | C10 pp. 88–89, 96 |
| 3 | Transpiration: water from xylem → cells → evaporates into air spaces as vapour → out through stomata | `water.leaf`, `water.vapour`, `water.out`, `water.reason`; `04_transpiration_*` | C10 pp. 94–95 |
| 4 | Root hairs take in water; water moves into the root's xylem and up the stem | `water.enter`, `water.hairs`, `water.root`, `water.rise`; `05_*`, `09_root_hairs_soil` | C10 p. 94; C9 Ch. 3 p. 32 |
| 5 | Vacuole storage: wastes stored in the vacuole (a single membrane) | `vacuole.cell`, `vacuole.store`, `vacuole.reason`; `10_vacuole` | C10 p. 98; C9 Ch. 2 p. 19 |
| 6 | Leaf storage and fall: wastes stored in leaves that later fall | `leaves.load`, `leaves.fall`, `leaves.reason`; `11_*` | C10 p. 98 |
| 7 | Old xylem: many plant tissues are dead cells; xylem is mostly dead | `resin.old`, `xylem.cells`; `06_old_xylem`, `07_xylem_heading` | C10 p. 98; C9 Ch. 3 p. 33 |
| 8 | Resins and gums stored, especially in old xylem | `resin.store`, `resin.reason`, `resin.try`; `08_*` | C10 p. 98 |
| 9 | Some wastes excreted into the soil around the roots | `soil.excrete`, `soil.reason`; `09b_soil_excretion` | C10 p. 98 |
| 10 | Oxygen as a by-product of photosynthesis, released through stomata | `oxygen.*` | C10 pp. 81, 98 |
| 11 | All accepted simplifications (`accepted-simplifications.md`, items 1–32) | as listed | — |

## Decisions we would like you to confirm (not reopen unless you see a learner risk)
- **DA-15:** the daytime summary (`whole.oxygen`) shows oxygen only, although the narration mentions night CO₂. Showing CO₂ leaving by day would contradict "used by day". The summary label says "CO₂ at night".
- **DA-13:** in the molecule symbols, CO₂'s oxygen atoms are grey while O₂ is blue. Shape, label and context identify them; atoms are not taught.
- **DA-14:** respiration CO₂ is shown forming in the leaves. This is a visualization choice, not a claim that only leaves respire (the narration says "plant cells also respire").
- **DA-17:** a faint seam on the bark of the magnified stem slice (cosmetic).
- **DA-20:** root hairs start close behind the root cap (root zones are not taught).
- **DA-21:** the opened cell is cream (the cut wall) among green neighbours; it is the selected, cut-away cell.
- The magnified stem slice shows about ten growth rings from a young woody plant (compressed for teaching).

## Your verdict

| Item | Verdict (OK / note / factual issue) | Comment |
|---|---|---|
| 1 Stomata and guard cells | | |
| 2 Respiration → CO₂ | | |
| 3 Transpiration | | |
| 4 Root hairs → xylem | | |
| 5 Vacuole storage | | |
| 6 Leaf storage and fall | | |
| 7 Old xylem | | |
| 8 Resin and gum | | |
| 9 Soil excretion | | |
| 10 Oxygen | | |
| 11 Accepted simplifications | | |
| Overall: accurate and appropriate for Class 10? | | |

Reviewer: ______________________  Date: __________

A factual issue would lead to a V2.5 correction. Anything else stays with V2.4.
