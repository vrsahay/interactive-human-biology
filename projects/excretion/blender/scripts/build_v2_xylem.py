"""
11_xylem.glb: a block of xylem cut lengthwise (micro scale).

Source: Class 9 Ch. 3 p. 33: xylem consists of tracheids, vessels, xylem parenchyma and
xylem fibres; tracheids and vessels are tubular and thick-walled; xylem parenchyma is the
only living component; the others are sclerenchymatous (thick lignified walls; most such
cells are dead). Class 9 Ch. 3 p. 29 / Class X p. 94: xylem carries water and minerals.
Class X p. 98: other waste products are stored as resins and gums, especially in old xylem.

Layout (left to right):
  younger xylem: open vessels with spiral wall thickenings, carrying water
  tracheids (narrow, tapered) and fibres (very thick walls)
  a band of living xylem parenchyma (with nuclei) running across
  older xylem: darker vessels plugged with resin and gum
The front half of each vessel is cut away so the hollow inside can be seen.
Wall thickenings and the exact cell shapes are EDUCATIONAL VISUALIZATION.

Units: block about 2.4 wide (X), 0.8 deep (Y), 2.2 tall (Z, the stem's long axis).
"""

import math
import random

from mathutils import Vector

import common as C

RNG = random.Random(33)
H = 2.2
Z0, Z1 = -H / 2, H / 2


def half_tube(r_out, r_in, x, y, z0, z1, segs=28, full=False):
    a0, a1 = (0.0, 2 * math.pi) if full else (0.0, math.pi)     # back half only when cut
    v, f, fl = C.annular_sector(r_in, r_out, a0, a1, z0, z1, segs)
    return [p + Vector((x, y, 0)) for p in v], f, fl


def helix(r, x, y, z0, z1, turns, wire=0.012, back_only=True):
    pts = []
    n = int(turns * 24)
    for k in range(n + 1):
        t = k / n
        a = t * turns * 2 * math.pi
        if back_only and math.sin(a) < -0.05:
            if pts and pts[-1] is not None:
                pts.append(None)
            continue
        pts.append(Vector((x + r * math.cos(a), y + r * math.sin(a), z0 + (z1 - z0) * t)))
    runs, cur = [], []
    for p in pts:
        if p is None:
            if len(cur) > 2:
                runs.append(cur)
            cur = []
        else:
            cur.append(p)
    if len(cur) > 2:
        runs.append(cur)
    return [C.sweep_tube(run, [wire] * len(run), sides=6) for run in runs]


def build():
    m_wall = C.make_material("MAT_Xylem_Wall_Young", color="#e3d4a8", roughness=0.55, coat=0.15)
    m_wall_old = C.make_material("MAT_Xylem_Wall_Old", color="#8a6441", roughness=0.6)
    m_spiral = C.make_material("MAT_Xylem_Thickening", color="#f2e6c0", roughness=0.5)
    m_fibre = C.make_material("MAT_Xylem_Fibre", color="#cdbb8a", roughness=0.6)
    m_par = C.make_material("MAT_Xylem_Parenchyma", color="#b9d98c", roughness=0.5, coat=0.2)
    m_par_nuc = C.make_material("MAT_Xylem_Parenchyma_Nucleus", color="#6a70b0", roughness=0.4)
    m_resin = C.make_material("MAT_Resin_Gum", color="#e8951f", roughness=0.15, coat=0.7, alpha=0.9,
                              emission="#ffb04a", emission_strength=0.1)

    root = C.add_empty("Xylem", (0, 0, 0), "XYLEM", size=0.4)
    C.tag(root, "xylem", "Xylem", asset="11_xylem")

    def add(name, parts, mat, part, label, **extra):
        ob = C.join_meshes(name, parts, "XYLEM")
        C.recalc_normals(ob)
        C.assign(ob, mat)
        C.tag(ob, part, label, **extra)
        C.set_parent(ob, root)
        return ob

    # younger xylem: two wide vessels (cut open) + one behind (whole), elements stacked with rims
    young, rims, spirals = [], [], []
    for (x, r, y, full) in ((-0.98, 0.2, -0.1, False), (-0.6, 0.175, -0.12, False), (-0.79, 0.14, 0.2, True)):
        for k in range(3):
            za = Z0 + k * H / 3 + 0.01
            zb = Z0 + (k + 1) * H / 3 - 0.01
            young.append(half_tube(r, r * 0.84, x, y, za, zb, full=full))
            rims.append(half_tube(r * 0.86, r * 0.62, x, y, zb - 0.012, zb + 0.012, full=full))
            if not full:
                spirals += helix(r * 0.8, x, y, za + 0.02, zb - 0.02, turns=4.5)
    add("Vessels_Young", young, m_wall, "vessel", "Vessel (younger xylem, carries water)")
    add("Vessel_End_Walls", rims, m_wall, "vessel", "Vessel")
    add("Vessel_Wall_Thickenings", spirals, m_spiral, "vessel", "Vessel")

    # tracheids: narrow, tapered at both ends, overlapping
    trach = []
    for i, x in enumerate((-0.36, -0.27, -0.18, -0.09)):
        for k in range(2):
            z_mid = Z0 + 0.55 + k * 1.1 + (0.28 if i % 2 else 0)
            n = 10
            pts = [Vector((x, 0.02 * (i % 2), z_mid - 0.5 + 1.0 * t / n)) for t in range(n + 1)]
            radii = [0.046 * math.sin(math.pi * t / n) ** 0.5 + 0.004 for t in range(n + 1)]
            trach.append(C.sweep_tube(pts, radii, sides=10))
    add("Tracheids", trach, m_wall, "tracheid", "Tracheid")

    # fibres: very thick-walled, narrow
    fib = []
    for i in range(6):
        x = -0.02 + (i % 3) * 0.072
        y = -0.12 + (i // 3) * 0.2
        fib.append(half_tube(0.036, 0.008, x, y, Z0, Z1, segs=12, full=True))
    # behind everything: close-packed fibres and tracheids, so the tissue has no gaps
    for i in range(32):
        x = -1.18 + i * 0.075
        fib.append(half_tube(0.04, 0.01, x, 0.36, Z0, Z1, segs=10, full=True))
    add("Xylem_Fibres", fib, m_fibre, "xylem_fibre", "Xylem fibre")

    # living xylem parenchyma: a band of box-like cells running across, each with a nucleus
    par, nuc = [], []
    for i in range(6):
        x = -0.4 + i * 0.13
        c = Vector((x, -0.2, 0.05))
        bm = C.rounded_box_bm(Vector((0.125, 0.14, 0.17)), 0.035, 2)
        par.append(([v.co + c for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces], []))
        bm.free()
        bm = C.ellipsoid_bm((0.028, 0.028, 0.028), subdiv=2)
        cn = c + Vector((RNG.uniform(-0.02, 0.02), -0.06, RNG.uniform(-0.03, 0.03)))
        nuc.append(([v.co + cn for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces], []))
        bm.free()
    add("Xylem_Parenchyma", par, m_par, "xylem_parenchyma", "Xylem parenchyma (the living cells of xylem)")
    add("Xylem_Parenchyma_Nuclei", nuc, m_par_nuc, "xylem_parenchyma", "Xylem parenchyma (the living cells of xylem)")

    # older xylem: darker vessels, their insides plugged with resin and gum
    old, old_rims = [], []
    resin_parts = []
    for (x, r, y, full) in ((0.4, 0.18, -0.1, False), (0.78, 0.2, -0.12, False), (0.59, 0.14, 0.2, True)):
        for k in range(3):
            za = Z0 + k * H / 3 + 0.01
            zb = Z0 + (k + 1) * H / 3 - 0.01
            old.append(half_tube(r, r * 0.84, x, y, za, zb, full=full))
            old_rims.append(half_tube(r * 0.86, r * 0.62, x, y, zb - 0.012, zb + 0.012, full=full))
        # resin/gum lumps filling the lumen, bulging slightly out of the cut
        for k in range(4):
            z = Z0 + 0.3 + k * 0.52 + RNG.uniform(-0.06, 0.06)
            rr = r * 0.8
            bm = C.ellipsoid_bm((rr, rr * 0.95, RNG.uniform(0.2, 0.3)), subdiv=3, noise=0.14, seed=int(x * 100) + k)
            c = Vector((x, y + (0.0 if not full else 0.0), z))
            resin_parts.append(([v.co + c for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces], []))
            bm.free()
    add("Vessels_Old", old, m_wall_old, "old_xylem", "Old xylem")
    add("Vessel_End_Walls_Old", old_rims, m_wall_old, "old_xylem", "Old xylem")
    add("Resin_Gum_In_Old_Xylem", resin_parts, m_resin, "resin", "Resins and gums (stored wastes)")

    anchors = {
        "ANCHOR_XY_Young": (-0.79, -0.35, 0.8),
        "ANCHOR_XY_Vessel": (-0.98, -0.1, 0.45),
        "ANCHOR_XY_Tracheid": (-0.27, -0.05, -0.55),
        "ANCHOR_XY_Fibre": (0.05, -0.15, 0.6),
        "ANCHOR_XY_Parenchyma": (-0.14, -0.28, 0.05),
        "ANCHOR_XY_Old": (0.59, -0.35, 0.8),
        "ANCHOR_XY_Resin": (0.78, -0.12, 0.35),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, collection="XYLEM")
    # water rising in a young vessel; waste moving from the living cells into an old vessel
    for i in range(12):
        C.add_anchor(f"PATH_XY_Water_{i:02d}", (-0.98, -0.02, Z0 + 0.1 + i * (H - 0.2) / 11), parent=root,
                     size=0.01, display="PLAIN_AXES", collection="XYLEM")
    waste = [(-0.3, -0.27, 0.05), (-0.05, -0.27, 0.05), (0.2, -0.22, 0.05), (0.4, -0.08, 0.1), (0.4, -0.06, 0.32)]
    for i, p in enumerate(C.catmull(waste, 2)):
        C.add_anchor(f"PATH_XY_Waste_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="XYLEM")

    cams = {
        "CAM_Xylem": ((0.1, -4.6, 0.6), (0.05, 0.0, 0.0)),
        "CAM_Xylem_Young": ((-0.75, -2.1, 0.55), (-0.79, 0.0, 0.2)),
        "CAM_Xylem_Old": ((0.65, -2.0, 0.5), (0.59, 0.0, 0.2)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("xylem built")
    return {"objects": len(C.descendants(root))}
