"""
05_leaf_internal.glb: a block of leaf cut across (micro scale).

Source
* Class X p. 82: a leaf cross-section has cells with green dots (chloroplasts, which contain chlorophyll).
* Class X p. 88: plants exchange gases through stomata; large intercellular spaces keep all cells in contact with air.
* Class X p. 95: water lost through the stomata is replaced by water from the xylem in the leaf; water evaporates from leaf cells.
* Class 9 Ch. 3 p. 32: stomata in the leaf epidermis; loosely packed parenchyma with intercellular spaces.

Layers (top to bottom), shown but named only where the lesson needs them:
cuticle · upper epidermis · palisade cells (lined with chloroplasts) · spongy cells with large air spaces ·
a vein (thick-walled xylem vessels above phloem) · lower epidermis with a stoma cut through its middle.
Layer names other than epidermis, xylem, phloem, air space, stoma and chloroplast are
EDUCATIONAL VISUALIZATION (not taught).

Units: block 2.4 wide (X), 0.9 deep (Y), about 1.25 thick (Z). Cut face at y = -0.45 faces the camera (-Y).
"""

import math
import random

import bmesh
from mathutils import Vector

import common as C

RNG = random.Random(95)
W, D = 2.4, 0.9
FRONT = -D / 2
Z_TOP = 0.66
Z_EPI_U = (0.50, 0.63)
Z_PAL = (0.08, 0.49)
Z_SPONGY = (-0.40, 0.04)
Z_EPI_L = (-0.56, -0.44)
STOMA_X = -0.55
STOMA_HALF = 0.15      # V2.4: half-width of the opening in the lower epidermis for the guard-cell pair
VEIN = Vector((0.45, 0.0, -0.12))


def blob(radii, centre, seed, subdiv=2, noise=0.06):
    bm = C.ellipsoid_bm(radii, subdiv=subdiv, noise=noise, seed=seed)
    verts = [v.co + centre for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def box(size, radius, centre, segments=2):
    bm = C.rounded_box_bm(size, radius, segments=segments)
    verts = [v.co + centre for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def capsule(radius, z0, z1, x, y, sides=14, rings=5, top_round=1.0):
    """Vertical rounded cylinder (a palisade cell). top_round < 1 gives a blunter top (V2.4: palisade
    cells press flat against the upper epidermis)."""
    # rounded at both ends: the profile narrows over the last radius at the top and bottom
    n = 12
    pts, radii = [], []
    for k in range(n + 1):
        t = k / n
        z = z0 + (z1 - z0) * t
        end = min(t, (1 - t) / top_round) * (z1 - z0) / radius   # distance from an end, in radii
        r = radius * (math.sqrt(max(0.0, 1 - (1 - min(end, 1.0)) ** 2)) * 0.92 + 0.08)
        pts.append(Vector((x, y, z)))
        radii.append(r * (0.93 + 0.07 * math.sin(math.pi * t)))
    verts, faces, flat = C.sweep_tube(pts, radii, sides=sides)
    return verts, faces, flat


def tube_ring(r_in, r_out, x, z, y0, y1, segs=24):
    """A xylem vessel running into the leaf (along Y): thick wall, hollow middle."""
    verts, faces, flat = C.annular_sector(r_in, r_out, 0, 2 * math.pi, y0, y1, segs)
    # annular_sector builds along Z; rotate so it runs along Y and sits at (x, z)
    out = [Vector((v.x + x, v.z, v.y + z)) for v in verts]
    return out, [tuple(reversed(f)) for f in faces], flat


def cuticle_sheet(cells, z_face, thick, direction, gaps=()):
    """V2.1: the cuticle as a thin continuous waxy skin lying ON the outer face of the epidermis.
    It follows each cell's rounded outer edge (dipping slightly where two cells meet), so it reads
    as a layer of the surface, not a separate strip. direction +1 = upper surface, -1 = lower.
    gaps: x-ranges left open (the stoma)."""
    r = 0.045
    nx, ny = 90, 2

    def height(x):
        for (x0, x1) in cells:
            if x0 <= x <= x1:
                e = min(x - x0, x1 - x)
                return (r - math.sqrt(max(0.0, r * r - (r - e) ** 2))) if e < r else 0.0
        return r                                       # between cells: the full dip

    xa, xb = cells[0][0], max(c[1] for c in cells)      # only over the cells: no overhang
    xs = [xa + (xb - xa) * i / nx for i in range(nx + 1)]
    xs = [x for x in xs if not any(g0 < x < g1 for g0, g1 in gaps)]
    runs, cur = [], []
    for x in xs:                                       # split into runs at the gaps
        if cur and x - cur[-1] > (xb - xa) / nx * 1.5:
            runs.append(cur)
            cur = []
        cur.append(x)
    runs.append(cur)
    parts = []
    for run in runs:
        verts, faces = [], []
        idx = {}
        for side, dz in ((0, thick), (1, 0.0)):
            for i, x in enumerate(run):
                for j in range(ny + 1):
                    y = -D / 2 + D * j / ny
                    z = z_face + direction * (-height(x) * 0.9 + dz + 0.002)
                    idx[(side, i, j)] = len(verts)
                    verts.append(Vector((x, y, z)))
        n = len(run)
        for side in (0, 1):
            for i in range(n - 1):
                for j in range(ny):
                    a, b, c, d = idx[(side, i, j)], idx[(side, i + 1, j)], idx[(side, i + 1, j + 1)], idx[(side, i, j + 1)]
                    faces.append((a, b, c, d) if (side == 0) == (direction > 0) else (d, c, b, a))
        ring = [(i, 0) for i in range(n - 1)] + [(n - 1, j) for j in range(ny)] + [(i, ny) for i in range(n - 1, 0, -1)] + [(0, j) for j in range(ny, 0, -1)]
        for k in range(len(ring)):
            (i0, j0), (i1, j1) = ring[k], ring[(k + 1) % len(ring)]
            f = (idx[(0, i0, j0)], idx[(0, i1, j1)], idx[(1, i1, j1)], idx[(1, i0, j0)])
            faces.append(f if direction > 0 else tuple(reversed(f)))
        parts.append((verts, faces, []))
    return parts


def build():
    m_cut = C.make_material("MAT_Cuticle", color="#e6d98c", roughness=0.12, coat=0.9, alpha=0.8)
    m_epi = C.make_material("MAT_Leaf_Epidermis_Cells", color="#d9ecc1", roughness=0.45, coat=0.2)
    m_pal = C.make_material("MAT_Palisade", color="#7fbf5e", roughness=0.55)
    m_spo = C.make_material("MAT_Spongy", color="#95c978", roughness=0.6)
    # V2.1: the front row of cells is translucent, so the chloroplasts read as INSIDE the cells
    m_pal_f = C.make_material("MAT_Palisade_Front", color="#a9d98a", roughness=0.35, coat=0.3, alpha=0.5)
    m_spo_f = C.make_material("MAT_Spongy_Front", color="#b5dd98", roughness=0.4, coat=0.2, alpha=0.5)
    m_chl = C.make_material("MAT_Chloroplast_Leaf", color="#2c8a2a", roughness=0.4, coat=0.3)
    m_air = C.make_material("MAT_Leaf_Air_Space", color="#0f1c12", roughness=0.95)
    m_xyl = C.make_material("MAT_Vein_Xylem", color="#c9b27a", roughness=0.5)
    m_phl = C.make_material("MAT_Vein_Phloem", color="#8fae6a", roughness=0.55)
    m_sheath = C.make_material("MAT_Bundle_Sheath", color="#a9cf86", roughness=0.55)
    # V2.4 (DA-06): the same see-through guard-cell look as the stoma close-up (03_stoma MAT_Guard_Cell)
    m_gc = C.make_material("MAT_Guard_Cell_Section", color="#d6ecc0", roughness=0.3, coat=0.5, alpha=0.72)

    root = C.add_empty("LeafInternal", (0, 0, 0), "LEAF", size=0.4)
    C.tag(root, "leaf_internal", "Inside a leaf", asset="05_leaf_internal")

    def add(name, parts, mat, part, label, coll="LEAF_INTERNAL", **extra):
        ob = C.join_meshes(name, parts, coll)
        C.recalc_normals(ob)
        C.assign(ob, mat)
        C.tag(ob, part, label, **extra)
        C.set_parent(ob, root)
        return ob

    # dark back wall: the gaps between cells read as air spaces
    add("Air_Spaces", [box(Vector((W, 0.04, Z_TOP - Z_EPI_L[0])), 0.01,
                           Vector((0, D / 2 + 0.02, (Z_TOP + Z_EPI_L[0]) / 2)))], m_air, "air_space", "Air spaces inside the leaf")

    # epidermis, top and bottom (flattened rounded cells)
    top, bottom = [], []
    top_x, bottom_x = [], []
    x = -W / 2 + 0.11
    # V2.4 (DA-06): the lower epidermis opens evenly either side of the stoma (cells are trimmed to the
    # opening instead of dropped), so the guard-cell pair sits centred in it, touching its neighbours
    gap0, gap1 = STOMA_X - STOMA_HALF, STOMA_X + STOMA_HALF
    # V2.4 (DA-19): a partial (cut) cell at the left edge of the block, so the skin covers the cells under
    # it right to the cut edge (no mesophyll cells sticking out beyond the epidermis). No random draw here,
    # so every other cell keeps its place.
    x0 = -W / 2
    top_x.append((x0 + 0.006, x - 0.006))
    bottom_x.append((x0 + 0.006, x - 0.006))
    for yy in (-0.3, 0.0, 0.3):
        top.append(box(Vector((x - x0 - 0.012, 0.29, Z_EPI_U[1] - Z_EPI_U[0])), 0.03, Vector(((x0 + x) / 2, yy, sum(Z_EPI_U) / 2))))
        bottom.append(box(Vector((x - x0 - 0.012, 0.29, Z_EPI_L[1] - Z_EPI_L[0])), 0.03, Vector(((x0 + x) / 2, yy, sum(Z_EPI_L) / 2))))
    while x < W / 2 - 0.08:
        w = RNG.uniform(0.19, 0.25)
        top_x.append((x + 0.006, x + w - 0.006))
        for yy in (-0.3, 0.0, 0.3):
            top.append(box(Vector((w - 0.012, 0.29, Z_EPI_U[1] - Z_EPI_U[0])), 0.045,
                           Vector((x + w / 2, yy, sum(Z_EPI_U) / 2))))
        pieces = [(x, x + w)] if (x + w <= gap0 or x >= gap1) else [(a, b) for a, b in ((x, gap0), (gap1, x + w)) if b - a > 0.07]
        for a, b in pieces:
            bottom_x.append((a + 0.006, b - 0.006))
            for yy in (-0.3, 0.0, 0.3):
                bottom.append(box(Vector((b - a - 0.012, 0.29, Z_EPI_L[1] - Z_EPI_L[0])), 0.04,
                                  Vector(((a + b) / 2, yy, sum(Z_EPI_L) / 2))))
        x += w
    add("Upper_Epidermis", top, m_epi, "epidermis", "Upper surface (epidermis)")
    add("Lower_Epidermis", bottom, m_epi, "epidermis", "Lower surface (epidermis)")
    # waxy cuticle on the outer faces: thicker on the upper surface, thinner below, open at the stoma
    cut = cuticle_sheet(top_x, Z_EPI_U[1], 0.02, +1)
    cut += cuticle_sheet(bottom_x, Z_EPI_L[0], 0.011, -1, gaps=((STOMA_X - STOMA_HALF + 0.004, STOMA_X + STOMA_HALF - 0.004),))
    ob = C.join_meshes("Cuticle", cut, "LEAF_INTERNAL")
    ob.data.polygons.foreach_set("use_smooth", [True] * len(ob.data.polygons))
    C.assign(ob, m_cut)
    C.tag(ob, "cuticle", "Waxy layer (cuticle)")
    C.set_parent(ob, root)

    # palisade: tall cells in rows, lined with chloroplasts
    pal, pal_chl, pal_front = [], [], []
    front_pal = []
    for row, yy in enumerate((-0.34, -0.12, 0.1, 0.32)):
        x = -W / 2 + 0.09 + (0.035 if row % 2 else 0)
        while x < W / 2 - 0.07:
            r = RNG.uniform(0.058, 0.068)
            # V2.4 (DA-07): the palisade cells reach up to the upper epidermis (no false empty layer under it)
            (pal_front if row == 0 else pal).append(capsule(r, Z_PAL[0] + RNG.uniform(0, 0.03), Z_EPI_U[0] + 0.048 - RNG.uniform(0, 0.01), x, yy, top_round=0.35))
            if row == 0:
                front_pal.append((x, yy, r))
            x += 2 * r + RNG.uniform(0.012, 0.03)
    for (x, yy, r) in front_pal:
        # chloroplasts INSIDE the cell, lying just within its wall (seen through the translucent cell)
        for k in range(7):
            z = Z_PAL[0] + 0.07 + k * (Z_PAL[1] - Z_PAL[0] - 0.14) / 6 + RNG.uniform(-0.015, 0.015)
            a = RNG.uniform(-1.1, 1.1)
            c = Vector((x + math.sin(a) * r * 0.62, yy - math.cos(a) * r * 0.62, z))
            pal_chl.append(blob((0.022, 0.011, 0.03), c, seed=len(pal_chl), subdiv=2, noise=0.02))
    add("Palisade_Cells", pal, m_pal, "palisade", "Tall cells under the upper surface")
    add("Palisade_Cells_Front", pal_front, m_pal_f, "palisade", "Tall cells under the upper surface")
    add("Chloroplasts_Palisade", pal_chl, m_chl, "chloroplast", "Chloroplasts")

    # spongy cells: loosely packed, leaving large air spaces (and a big one above the stoma)
    spo, spo_chl, spo_front = [], [], []
    for yy in (-0.3, 0.0, 0.3):
        for i in range(15):
            x = -W / 2 + 0.12 + i * 0.16 + RNG.uniform(-0.03, 0.03)
            for k in range(3):
                z = Z_SPONGY[1] - 0.06 - k * 0.15 + RNG.uniform(-0.03, 0.03)
                if abs(x - STOMA_X) < 0.17 and z < -0.12:
                    continue                      # the air space above the stoma
                if (Vector((x, 0, z)) - Vector((VEIN.x, 0, VEIN.z))).length < 0.27:
                    continue                      # room for the vein
                if RNG.random() < 0.18:
                    continue                      # irregular packing = air spaces
                c = Vector((x, yy + RNG.uniform(-0.04, 0.04), z))
                front = abs(yy + 0.3) < 0.01
                (spo_front if front else spo).append(blob((RNG.uniform(0.06, 0.08), 0.1, RNG.uniform(0.05, 0.065)), c, seed=len(spo) + len(spo_front) + 300, noise=0.12))
                if front:
                    for q in range(3):
                        a = RNG.uniform(0, math.tau)
                        cc = c + Vector((math.cos(a) * 0.03, -0.045, math.sin(a) * 0.022))
                        spo_chl.append(blob((0.018, 0.01, 0.024), cc, seed=900 + len(spo_chl), subdiv=2, noise=0.02))
    add("Spongy_Cells", spo, m_spo, "mesophyll", "Loosely packed cells, with air spaces between")
    add("Spongy_Cells_Front", spo_front, m_spo_f, "mesophyll", "Loosely packed cells, with air spaces between")
    add("Chloroplasts_Spongy", spo_chl, m_chl, "chloroplast", "Chloroplasts")

    # vein: bundle sheath ring, xylem vessels (upper), phloem (lower)
    sheath = []
    for k in range(14):
        a = k / 14 * math.tau
        c = Vector((VEIN.x + math.cos(a) * 0.2, 0, VEIN.z + math.sin(a) * 0.17))
        sheath.append(blob((0.05, D / 2 - 0.02, 0.045), c, seed=500 + k, noise=0.04))
    add("Bundle_Sheath", sheath, m_sheath, "leaf_vein", "Vein")
    xyl = []
    for (dx, dz, r) in ((-0.07, 0.07, 0.042), (0.03, 0.08, 0.048), (0.1, 0.03, 0.036), (-0.02, 0.0, 0.034), (-0.1, -0.01, 0.028)):
        xyl.append(tube_ring(r * 0.55, r, VEIN.x + dx, VEIN.z + dz, -D / 2 + 0.01, D / 2 - 0.01))
    add("Vein_Xylem", xyl, m_xyl, "vein_xylem", "Xylem (carries water)")
    phl = []
    for k in range(9):
        c = Vector((VEIN.x - 0.1 + (k % 3) * 0.07 + RNG.uniform(-0.01, 0.01), 0, VEIN.z - 0.07 - (k // 3) * 0.035))
        phl.append(blob((0.03, D / 2 - 0.03, 0.02), c, seed=600 + k, noise=0.05))
    add("Vein_Phloem", phl, m_phl, "vein_phloem", "Phloem (carries food)")

    # V2.4 (DA-06): the stoma in section is the SAME kidney-shaped pair as the 03_stoma close-up (same
    # centre-line and radius functions, open, scaled to this block), lying in the lower epidermis with its
    # long axis running into the leaf. The cut face passes through the middle of the stoma, so the front
    # shows the two guard cells in section (with chloroplasts) either side of the open pore, and the
    # kidney shape runs back into the leaf behind the cut.
    import build_v2_stoma as S
    left_edge = max(x1 for (x0, x1) in bottom_x if x1 < STOMA_X)
    right_edge = min(x0 for (x0, x1) in bottom_x if x0 > STOMA_X)
    half_gap = min(STOMA_X - left_edge, right_edge - STOMA_X)
    s = max(0.5, min(0.75, half_gap / (S.OPEN_BOW + S.pole_offset(0.5) + S.gc_radius(0.5))))
    z_mid = sum(Z_EPI_L) / 2
    gcs, gc_chl = [], []
    n = 14
    for side in (-1, 1):
        pts, radii = [], []
        for k in range(n):
            t = 0.5 * k / (n - 1)                          # pole (t=0, deep in the leaf) → middle (t=0.5, the cut)
            pts.append(Vector((STOMA_X + side * s * (S.OPEN_BOW * math.sin(math.pi * t) + S.pole_offset(t)),
                               FRONT + s * S.GC_LEN * math.cos(math.pi * t), z_mid)))
            radii.append(s * S.gc_radius(t))
        v, f, _ = C.sweep_tube(pts, radii, sides=18)
        v = [Vector((p.x, p.y, z_mid + (p.z - z_mid) * 0.95)) for p in v]
        gcs.append((v, f, []))
        # chloroplasts inside each guard cell, near the cut face (seen through the translucent wall)
        for k, t in enumerate((0.3, 0.38, 0.45, 0.49)):
            r = s * S.gc_radius(t)
            cx = STOMA_X + side * s * (S.OPEN_BOW * math.sin(math.pi * t) + S.pole_offset(t) + S.gc_radius(t) * 0.3)
            cz = z_mid + r * (0.35 if k % 2 else -0.3)
            gc_chl.append(blob((0.011, 0.016, 0.009), Vector((cx, FRONT + s * S.GC_LEN * math.cos(math.pi * t) + 0.012, cz)),
                               seed=720 + k + (0 if side < 0 else 10), subdiv=2, noise=0.03))
    add("Stoma_Guard_Cells", gcs, m_gc, "guard_cell", "Guard cells", coll="LEAF_INTERNAL")
    add("Stoma_Guard_Cell_Chloroplasts", gc_chl, m_chl, "guard_cell", "Guard cells", coll="LEAF_INTERNAL")

    anchors = {
        "ANCHOR_LI_Cuticle": (0.9, FRONT, Z_TOP),
        "ANCHOR_LI_Epidermis": (-0.9, FRONT, sum(Z_EPI_U) / 2),
        "ANCHOR_LI_Palisade": (-0.2, FRONT, 0.3),
        "ANCHOR_LI_Chloroplast": (front_pal[4][0], FRONT - 0.02, 0.28),
        "ANCHOR_LI_Spongy": (-0.9, FRONT, -0.15),
        "ANCHOR_LI_Air_Space": (STOMA_X, FRONT, -0.28),
        "ANCHOR_LI_Vein": (VEIN.x, FRONT, VEIN.z + 0.2),
        "ANCHOR_LI_Xylem": (VEIN.x + 0.03, FRONT, VEIN.z + 0.08),
        "ANCHOR_LI_Phloem": (VEIN.x - 0.03, FRONT, VEIN.z - 0.1),
        "ANCHOR_LI_Stoma": (STOMA_X, FRONT, sum(Z_EPI_L) / 2),
        "ANCHOR_LI_Outside": (STOMA_X, FRONT - 0.05, Z_EPI_L[0] - 0.35),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, collection="LEAF_INTERNAL")

    # routes the runtime animates (all on the cut face, slightly in front of it)
    y = FRONT - 0.04
    chl = anchors["ANCHOR_LI_Chloroplast"]
    o2 = [(chl[0], y, 0.28), (chl[0] - 0.05, y, 0.08), (-0.35, y, 0.0), (STOMA_X + 0.03, y, -0.2),
          (STOMA_X, y, -0.36), (STOMA_X, y, -0.5), (STOMA_X, y, -0.64), (STOMA_X - 0.02, y, -0.85)]
    for i, p in enumerate(C.catmull(o2, 3)):
        C.add_anchor(f"PATH_LI_Gas_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="LEAF_INTERNAL")
    water = [(VEIN.x + 0.03, y, VEIN.z + 0.08), (VEIN.x - 0.12, y, VEIN.z + 0.2), (0.0, y, -0.05),
             (-0.3, y, -0.2), (STOMA_X + 0.04, y, -0.3), (STOMA_X, y, -0.5), (STOMA_X, y, -0.66), (STOMA_X + 0.03, y, -0.88)]
    for i, p in enumerate(C.catmull(water, 3)):
        C.add_anchor(f"PATH_LI_Water_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="LEAF_INTERNAL")

    cams = {
        "CAM_LI_Wide": ((0.1, -3.3, 0.25), (0.0, 0.0, 0.02)),
        "CAM_LI_Palisade": ((chl[0] + 0.15, -1.2, 0.42), (chl[0], FRONT, 0.28)),
        "CAM_LI_Stoma": ((STOMA_X + 0.1, -1.6, -0.5), (STOMA_X, FRONT, -0.35)),
        "CAM_LI_Vein": ((VEIN.x + 0.1, -1.3, VEIN.z + 0.05), (VEIN.x, FRONT, VEIN.z)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("leaf interior built")
    return {"objects": len(C.descendants(root))}
