"""
15_root_hairs.glb: a small patch of root surface among soil particles (micro scale).

Source: Class 9 Ch. 3 p. 32: root hairs are outgrowths of epidermal cells of the root and
greatly increase the surface area for absorbing water and minerals. Class X p. 94: water
and ions are taken up from the soil by the root. Class X p. 98: plants excrete some waste
substances into the soil around them. Class 9 Ch. 2: plant cells have a cell wall, cytoplasm,
a nucleus and a large vacuole.

Modelled (a slice seen from the side, root surface along X at z = 0, soil above it):
  RH_Epidermal_Cells   a row of root surface cells (translucent, so the nuclei show)
  RH_Nuclei            one nucleus per cell
  RH_Inner_Cells       the next layer of cells towards the root centre
  RH_Root_Hairs        long tubular outgrowths of some epidermal cells, winding between
                       soil particles (each hair is ONE cell: its wall is continuous with it)
  RH_Soil_Particles    irregular mineral grains of different sizes
  RH_Soil_Water        the water in moist soil: thin films on the grains and small water
                       bridges where grains touch each other and the hairs
Relative sizes are compressed so hair, cells and grains fit one view: EDUCATIONAL VISUALIZATION.

V2.4.1 (visual refinement): thinner, slightly irregular hairs that swell out of their own cell;
soil grains packed all along each hair (no hair in an empty gap); the soil water is a subtle, static
moisture (no blobs). The runtime moves only a few teaching drops (processes/roots.js HairFlow).

Units: patch about 2.4 wide (X), 0.7 deep (Y), soil up to z = 1.3.
"""

import math
import random

from mathutils import Vector

import common as C

RNG = random.Random(15)
IRR = random.Random(1515)   # V2.4.1: the hairs' natural irregularity (own stream)
W = 2.4
CELL_L = 0.3           # epidermal cell length along the root
CELL_H = 0.16
N_CELLS = 8
HAIR_R = 0.017         # V2.4.1: thinner, more hair-like (was 0.028), still clearly visible at lesson scale
HAIR_CELLS = (0, 2, 5, 7)


def cell_box(cx, cz, lx, lz, depth, y0=0.0):
    bm = C.rounded_box_bm(Vector((lx, depth, lz)), min(lx, lz) * 0.42, 4)
    verts = [v.co + Vector((cx, y0, cz)) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def blob(radii, centre, noise, seed, subdiv=3):
    bm = C.ellipsoid_bm(radii, subdiv=subdiv, noise=noise, seed=seed)
    verts = [v.co + Vector(centre) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def oriented_blob(radii, centre, axis, seed, subdiv=2):
    """An ellipsoid whose z-radius lies along `axis`: a flat water bridge held across a contact."""
    bm = C.ellipsoid_bm(radii, subdiv=subdiv, noise=0.06, seed=seed)
    q = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized())
    verts = [q @ v.co + Vector(centre) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def hair_path(x0, k):
    """A root hair: grows out of the TOP of one epidermal cell (V2.1: from the cell's centre, not a
    gap between cells), then wanders up between the soil grains."""
    pts = [Vector((x0, 0.0, CELL_H * 0.3)), Vector((x0, 0.0, CELL_H * 0.5 + 0.05))]
    ang = RNG.uniform(-0.35, 0.35)
    p = pts[-1].copy()
    length = RNG.uniform(0.95, 1.15)
    steps = 9
    for s in range(steps):
        ang += RNG.uniform(-0.45, 0.45)
        ang = max(-0.5, min(0.5, ang))
        step = length / steps
        p = p + Vector((math.sin(ang) * step, RNG.uniform(-0.02, 0.02), math.cos(ang) * step))
        pts.append(p.copy())
    return C.catmull([tuple(q) for q in pts], 4)


def build():
    m_cell = C.make_material("MAT_RH_Epidermal_Cell", color="#efe6c8", roughness=0.45, coat=0.25, alpha=0.66)
    m_inner = C.make_material("MAT_RH_Inner_Cell", color="#e3d8b6", roughness=0.55, alpha=0.85)
    m_nuc = C.make_material("MAT_RH_Nucleus", color="#7a6fb4", roughness=0.4)
    m_hair = C.make_material("MAT_RH_Root_Hair", color="#f3ecd6", roughness=0.35, coat=0.3, alpha=0.92)
    m_grain = C.make_material("MAT_RH_Soil_Grain", color="#b58a52", roughness=0.85)
    m_grain2 = C.make_material("MAT_RH_Soil_Grain_Dark", color="#6e5238", roughness=0.95)
    # V2.4.1: moist-soil water: a faint, glossy, slightly blue sheen (subtle; it is everywhere)
    m_water = C.make_material("MAT_RH_Soil_Water", color="#8cc6f7", roughness=0.04, alpha=0.55, coat=0.9)

    root = C.add_empty("RootHairs", (0, 0, 0), "ROOT_HAIRS", size=0.3)
    C.tag(root, "root_hairs", "Root hairs", asset="15_root_hairs")

    def add(name, parts, mat, coll, part, label, **extra):
        ob = C.join_meshes(name, parts, coll)
        C.recalc_normals(ob)
        C.assign(ob, mat)
        C.tag(ob, part, label, **extra)
        C.set_parent(ob, root)
        return ob

    # epidermal cells in a row; a second row behind for depth
    x_start = -W / 2 + CELL_L / 2
    cells, inner, nuclei = [], [], []
    cell_x = []
    for i in range(N_CELLS):
        x = x_start + i * CELL_L
        cell_x.append(x)
        cells.append(cell_box(x, 0.0, CELL_L - 0.02, CELL_H, 0.3, y0=0.0))
        cells.append(cell_box(x + CELL_L * 0.5, 0.0, CELL_L - 0.02, CELL_H, 0.3, y0=0.32))
        inner.append(cell_box(x + CELL_L * 0.25, -CELL_H - 0.02, CELL_L - 0.02, CELL_H * 1.05, 0.62, y0=0.16))
        # one nucleus per cell; in a hair-forming cell it sits near the base of the hair (EDUCATIONAL VISUALIZATION)
        if i in HAIR_CELLS:
            nuclei.append(blob((0.04, 0.04, 0.034), (x + 0.05, -0.03, CELL_H * 0.18), 0.05, i, subdiv=2))
        else:
            nuclei.append(blob((0.04, 0.04, 0.034), (x + RNG.uniform(-0.05, 0.05), -0.03, -0.01), 0.05, i, subdiv=2))
    add("RH_Epidermal_Cells", cells, m_cell, "ROOT_HAIRS", "root_epidermis", "Root surface cells (epidermis)")
    add("RH_Inner_Cells", inner, m_inner, "ROOT_HAIRS", "root_cortex", "Inner root cells")
    add("RH_Nuclei", nuclei, m_nuc, "ROOT_HAIRS", "root_epidermis", "Nucleus")

    # root hairs, each growing out of one epidermal cell
    hairs, paths = [], []
    for k, ci in enumerate(HAIR_CELLS):
        pts = hair_path(cell_x[ci], k)
        # V2.4.1: a hair near the patch edge leans back INTO the soil (mirrored), never out into empty space
        lim = W / 2 - 0.22
        if any(abs(q.x) > lim for q in pts):
            pts = [Vector((2 * cell_x[ci] - q.x, q.y, q.z)) for q in pts]
        pts = [Vector((max(-lim, min(lim, q.x)), q.y, q.z)) for q in pts]
        # V2.4.1: every hair ends inside the soil (none pokes out above the grains into empty space)
        pts = [q for q in pts if q.z <= 1.22] or pts
        n = len(pts)
        # the hair swells out of its own cell (a wide base) and narrows into the hair; along its length
        # the radius wavers a little (a living cell, not a pipe)
        wob = [IRR.uniform(-1, 1) for _ in range(n)]
        wob = [(wob[max(0, t - 1)] + wob[t] * 2 + wob[min(n - 1, t + 1)]) / 4 for t in range(n)]
        radii = [HAIR_R * (1.0 + 1.9 * max(0.0, 1 - t / 4) ** 1.5) * (1 + 0.16 * wob[t]) for t in range(n)]
        radii[-1] = HAIR_R * 0.9
        hairs.append(C.sweep_tube(pts, radii, sides=10))
        # rounded hair tip
        hairs.append(blob((HAIR_R * 0.95,) * 3, pts[-1], 0.0, k, subdiv=2))
        paths.append(pts)
    add("RH_Root_Hairs", hairs, m_hair, "ROOT_HAIRS", "root_hair", "Root hair (one long cell)")

    # soil grains (V2.1): packed AROUND the hairs, touching them, so each hair lies in the soil and
    # its water, not in an empty gap. Grains may touch each other and the root surface; they never
    # pass through a hair or a cell.
    all_pts = [p for pts in paths for p in pts]

    def hair_dist(c):
        return min((Vector(c) - p).length for p in all_pts)

    placed = []

    def fits(c, r, top=1.35):
        if c[2] - r * 0.9 < CELL_H / 2 or c[2] + r > top or abs(c[0]) + r > W / 2:
            return False
        if hair_dist(c) < r * 0.97 + HAIR_R * 0.55:
            return False
        return all((Vector(c) - Vector(pc)).length >= (r + pr) * 0.88 for pc, pr in placed)

    contacts = []
    # 1. grains resting against each hair, alternating sides, all along its length (V2.4.1: every
    #    other point, so no stretch of hair stands in an empty gap)
    for k, pts in enumerate(paths):
        for j in range(3, len(pts) - 1, 2):
            p = pts[j]
            t = (pts[min(j + 1, len(pts) - 1)] - pts[j - 1]).normalized()
            side = Vector((1, 0, 0)) if (j // 2 + k) % 2 else Vector((-1, 0, 0))
            dy = RNG.uniform(-0.35, 0.35)
            r = RNG.uniform(0.07, 0.14)
            # the preferred side first, then the other side (e.g. at the patch edge): no bare stretches
            for sd in (side, -side):
                nrm = (sd - t * sd.dot(t)).normalized()
                nrm.y += dy
                nrm.normalize()
                c = p + nrm * (r * 0.97 + HAIR_R * 0.7)
                c = (c.x, c.y, c.z)
                if fits(c, r, top=1.5):
                    placed.append((c, r))
                    contacts.append((p + nrm * HAIR_R, r, nrm.copy()))
                    break
    # 2. fill the rest of the soil
    tries = 0
    while len(placed) < 92 and tries < 20000:
        tries += 1
        r = RNG.uniform(0.06, 0.17)
        c = (RNG.uniform(-W / 2 + r, W / 2 - r), RNG.uniform(-0.12, 0.42), RNG.uniform(CELL_H / 2 + r * 0.9, 1.35 - r))
        if fits(c, r):
            placed.append((c, r))
    grains, grains_dark, films, gaps = [], [], [], []
    for k, (c, r) in enumerate(placed):
        radii = (r * RNG.uniform(0.98, 1.1), r * RNG.uniform(0.9, 1.0), r * RNG.uniform(0.85, 0.98))
        (grains if k % 3 else grains_dark).append(blob(radii, c, 0.1, 100 + k))
        # (V2.4.1: no full water shell per grain: it paled the soil. Moist soil is shown by the water
        # held between particles, below.)
    # water held where grains meet each other and where a grain meets a hair: small flat water
    # bridges across each contact (V2.4.1; they were round blobs)
    for (c1, r1) in placed:
        for (c2, r2) in placed:
            d = (Vector(c1) - Vector(c2)).length
            if c1 < c2 and d < (r1 + r2) * 1.12:
                mid = (Vector(c1) * r2 + Vector(c2) * r1) / (r1 + r2)
                rr = min(r1, r2) * 0.5
                gaps.append(oriented_blob((rr, rr, rr * 0.45), mid, Vector(c2) - Vector(c1), int(d * 1000)))
    for (p, r, nrm) in contacts:
        rr = max(HAIR_R * 2.6, r * 0.4)
        gaps.append(oriented_blob((rr, rr, rr * 0.5), p, nrm, int(p.x * 997) % 1000))
    add("RH_Soil_Particles", grains, m_grain, "ROOT_HAIRS", "soil_particle", "Soil particle")
    add("RH_Soil_Particles_Dark", grains_dark, m_grain2, "ROOT_HAIRS", "soil_particle", "Soil particle")
    add("RH_Soil_Water", films + gaps, m_water, "ROOT_HAIRS", "soil_water", "Water in the soil")

    # anchors on the hair nearest the camera and on its cell
    hero = paths[1]
    hero_cell = cell_x[HAIR_CELLS[1]]
    near_water = min(placed, key=lambda g: (Vector(g[0]) - hero[len(hero) * 2 // 3]).length)
    # V2.4.1: "Water in the soil" names the water held where the hero hair meets a grain (upper hair)
    hero_contacts = [c for c in contacts if min((c[0] - q).length for q in hero) < HAIR_R * 1.5]
    hero_wet = min(hero_contacts, key=lambda c: (c[0] - hero[len(hero) * 2 // 3]).length)[0] if hero_contacts else None
    anchors = {
        "ANCHOR_RH_Hair": hero[len(hero) // 2],
        "ANCHOR_RH_Hair_Tip": hero[-1],
        "ANCHOR_RH_Cell": Vector((hero_cell, -0.16, 0.0)),
        "ANCHOR_RH_Nucleus": Vector((hero_cell, -0.1, 0.0)),
        "ANCHOR_RH_Inner": Vector((hero_cell + 0.1, -0.16, -CELL_H - 0.02)),
        "ANCHOR_RH_Soil_Particle": Vector(near_water[0]) + Vector((0, -near_water[1], 0)),
        "ANCHOR_RH_Soil_Water": (hero_wet + Vector((0, -0.03, 0))) if hero_wet is not None else
        Vector(near_water[0]) + Vector((0, -near_water[1] - 0.02, near_water[1] * 0.6)),
        "ANCHOR_RH_Above": Vector((0, 0, 1.55)),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, tuple(loc), parent=root, collection="ROOT_HAIRS")
    # water: from the soil water at the hair, down the hair, into its cell, then inward (towards the xylem)
    water = [anchors["ANCHOR_RH_Soil_Water"]] + [hero[i] for i in range(len(hero) - 1, 0, -max(1, len(hero) // 6))] + \
            [Vector((hero_cell, -0.02, 0.0)), anchors["ANCHOR_RH_Inner"], Vector((hero_cell + 0.2, 0.0, -0.45))]
    for i, p in enumerate(C.catmull([tuple(p) for p in water], 2)):
        C.add_anchor(f"PATH_RH_Water_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="ROOT_HAIRS")
    # waste: from an epidermal cell out into the soil between the grains (opposite direction)
    wx = cell_x[5]
    waste = [(wx, -0.05, 0.0), (wx, -0.12, CELL_H * 0.6), (wx + 0.1, -0.16, 0.3), (wx + 0.22, -0.2, 0.5)]
    for i, p in enumerate(C.catmull(waste, 3)):
        C.add_anchor(f"PATH_RH_Waste_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="ROOT_HAIRS")

    cams = {
        "CAM_Root_Hairs_Micro": ((0.1, -3.4, 0.55), (0.0, 0.1, 0.45)),
        "CAM_RH_Hair": ((hero_cell + 0.15, -1.5, 0.45), (hero_cell, 0.0, 0.35)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("root hairs built", len(placed), "grains")
    return {"objects": len(C.descendants(root)), "grains": len(placed), "hair_contacts": len(contacts)}
