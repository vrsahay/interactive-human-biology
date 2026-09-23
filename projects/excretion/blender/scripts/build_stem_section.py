"""
Build the educational stem cross-section (stem-cross-section.glb).

Lesson needs (Stop 5 – resins and gums, especially in old xylem)
----------------------------------------------------------------
* STEM → CUTAWAY: Stem_Cover is an intact piece of stem that Three.js lifts
  away, revealing a cut face and a 90° wedge cutaway.
* INTERNAL TISSUES as separate, selectable solids (outside → in):
  Bark, Phloem, Xylem_New, Xylem_Old, Pith.
* OLD XYLEM must be visually identifiable: darker tone, fewer/smaller vessel
  pores, and it is where the Resin_## deposits sit.
* Resin_## are separate objects so Three.js can GROW them one by one as the
  waste arrives (WASTE → RESINS/GUMS → STORED → ESPECIALLY IN OLD XYLEM).

This is an educational visualisation – proportions are simplified.
"""

import math
import random

from mathutils import Vector

import common as C

RNG = random.Random(552)

# radii (outer edge of each tissue ring)
R_PITH, R_OLD, R_NEW, R_PHLOEM, R_BARK = 0.07, 0.30, 0.42, 0.46, 0.50
Z_TOP, Z_WEDGE, Z_RINGS_BOTTOM, Z_BOTTOM = 0.0, -0.35, -0.65, -0.95
A0, A1 = 0.0, 1.5 * math.pi          # 270° kept; quadrant (+x, −y) removed = the wedge


def tissue(name, r_in, r_out, mat, part, label, coll, parent, segs=72):
    upper = C.annular_sector(r_in, r_out, A0, A1, Z_WEDGE, Z_TOP, int(segs * 0.75))
    lower = C.annular_sector(r_in, r_out, 0.0, 2 * math.pi, Z_RINGS_BOTTOM, Z_WEDGE, segs)
    ob = C.join_meshes(name, [upper, lower], coll)
    C.recalc_normals(ob)
    C.assign(ob, mat)
    C.tag(ob, part, label)
    C.set_parent(ob, parent)
    return ob


def in_kept_region(angle):
    a = angle % (2 * math.pi)
    return A0 + 0.06 <= a <= A1 - 0.06


def build():
    m_bark = C.make_material("MAT_Bark", color="#6b4f36", roughness=0.9)
    m_phloem = C.make_material("MAT_Phloem", color="#8fae5a", roughness=0.7)
    m_new = C.make_material("MAT_Xylem_New", color="#e8d6a2", roughness=0.75)
    m_old = C.make_material("MAT_Xylem_Old", color="#9a7c63", roughness=0.8)
    m_pith = C.make_material("MAT_Pith", color="#d8cbb0", roughness=0.85)
    m_vessel = C.make_material("MAT_Xylem_Vessel", color="#4a3a2a", roughness=0.9)
    m_resin = C.make_material("MAT_Resin_Gum", color="#f2a12e", roughness=0.18, coat=0.6,
                              emission="#ffb04a", emission_strength=0.12)
    m_cover = C.make_material("MAT_Stem_Cover", color="#6b4f36", roughness=0.9)

    root = C.add_empty("StemSection", (0, 0, 0), "STEM_CROSS_SECTION", size=0.4)
    C.tag(root, "stem_section", "Stem cross-section", asset="stem-cross-section")

    tissue("Bark", R_PHLOEM, R_BARK, m_bark, "bark", "Bark (outer layer)", "STEM_CROSS_SECTION", root)
    tissue("Phloem", R_NEW, R_PHLOEM, m_phloem, "phloem", "Phloem", "STEM_CROSS_SECTION", root)
    tissue("Xylem_New", R_OLD, R_NEW, m_new, "xylem", "Xylem", "XYLEM", root)
    tissue("Xylem_Old", R_PITH, R_OLD, m_old, "old_xylem", "Old xylem", "XYLEM", root)
    tissue("Pith", 0.0, R_PITH, m_pith, "pith", "Pith (centre)", "STEM_CROSS_SECTION", root, segs=36)

    # continuation of the stem below the section (bark outside, closed)
    cv, cf, cflat = C.annular_sector(0.0, R_BARK, 0.0, 2 * math.pi, Z_BOTTOM, Z_RINGS_BOTTOM, 72)
    cont = C.mesh_object("Stem_Continuation", cv, cf, "STEM_CROSS_SECTION", smooth=True, flat_faces=cflat)
    C.recalc_normals(cont)
    C.assign(cont, m_bark)
    C.tag(cont, "bark", "Bark (outer layer)")
    C.set_parent(cont, root)

    # cover: the intact stem piece that lifts away in the cutaway reveal
    vv, vf, vflat = C.annular_sector(0.0, R_BARK + 0.006, 0.0, 2 * math.pi, Z_WEDGE - 0.002, 0.42, 72)
    cover = C.mesh_object("Stem_Cover", vv, vf, "STEM_CROSS_SECTION", smooth=True, flat_faces=vflat)
    C.recalc_normals(cover)
    C.assign(cover, m_cover)
    C.tag(cover, "stem_cover", "Stem (outside)", fadeable=1)
    C.set_parent(cover, root)

    # ---------------- xylem vessel pores (top face) ----------------
    pore_spots = []
    pores = []

    def pore(x, y, r):
        v, f, flat = C.annular_sector(0.0, r, 0.0, 2 * math.pi, Z_TOP - 0.004, Z_TOP + 0.0018, 8)
        return ([p + Vector((x, y, 0)) for p in v], f, flat)

    # resin deposit positions first so pores can avoid them
    resin_defs = []
    tries = 0
    while len([d for d in resin_defs if d[0] == "top"]) < 10 and tries < 500:
        tries += 1
        r = RNG.uniform(0.10, R_OLD - 0.035)
        a = RNG.uniform(A0, A1)
        if not in_kept_region(a):
            continue
        p = Vector((r * math.cos(a), r * math.sin(a), Z_TOP))
        if any((p - q[1]).length < 0.075 for q in resin_defs):
            continue
        resin_defs.append(("top", p, RNG.uniform(0.022, 0.034)))
    # deposits on the two wedge faces
    for k in range(3):
        r = 0.11 + k * 0.07 + RNG.uniform(-0.01, 0.01)
        z = RNG.uniform(-0.29, -0.07)
        resin_defs.append(("face_x", Vector((r, 0.004, z)), RNG.uniform(0.022, 0.03)))
        r = 0.12 + k * 0.065 + RNG.uniform(-0.01, 0.01)
        z = RNG.uniform(-0.29, -0.07)
        resin_defs.append(("face_y", Vector((-0.004, -r, z)), RNG.uniform(0.022, 0.03)))

    for _ in range(900):
        if len(pores) >= 90:
            break
        a = RNG.uniform(A0, A1)
        if not in_kept_region(a):
            continue
        if RNG.random() < 0.62:
            r = RNG.uniform(R_OLD + 0.015, R_NEW - 0.015)
            size = RNG.uniform(0.008, 0.013)
        else:
            r = RNG.uniform(R_PITH + 0.02, R_OLD - 0.015)
            size = RNG.uniform(0.005, 0.009)
        x, y = r * math.cos(a), r * math.sin(a)
        p = Vector((x, y, Z_TOP))
        if any((p - d[1]).length < d[2] + size + 0.012 for d in resin_defs if d[0] == "top"):
            continue
        if any((Vector((x, y)) - Vector((q[0], q[1]))).length < 0.028 for q in pore_spots):
            continue
        pore_spots.append((x, y))
        pores.append(pore(x, y, size))

    # longitudinal vessel strands on the wedge faces (xylem regions)
    def strand_x(r, w):
        v, f, flat = C.annular_sector(0.0, 1.0, 0.0, 2 * math.pi, 0, 1, 4)
        verts = [Vector((r + q.x * w, -0.0015 + q.y * 0.0018, Z_WEDGE + 0.02 + q.z * (Z_TOP - Z_WEDGE - 0.04)))
                 for q in v]
        return verts, f, flat

    def strand_y(r, w):
        v, f, flat = C.annular_sector(0.0, 1.0, 0.0, 2 * math.pi, 0, 1, 4)
        verts = [Vector((0.0015 + q.x * 0.0018, -r + q.y * w, Z_WEDGE + 0.02 + q.z * (Z_TOP - Z_WEDGE - 0.04)))
                 for q in v]
        return verts, f, flat

    for r in (0.33, 0.355, 0.38, 0.40):
        pores.append(strand_x(r, 0.0035))
        pores.append(strand_y(r + 0.006, 0.0035))
    for r in (0.12, 0.2, 0.27):
        pores.append(strand_x(r + 0.02, 0.0025))
        pores.append(strand_y(r, 0.0025))

    vessels = C.join_meshes("Xylem_Vessels", pores, "XYLEM")
    C.recalc_normals(vessels)
    C.assign(vessels, m_vessel)
    C.tag(vessels, "xylem", "Xylem")
    C.set_parent(vessels, root)

    # ---------------- resin / gum deposits ----------------
    for i, (kind, p, s) in enumerate(resin_defs):
        if kind == "top":
            radii = (s * 1.15, s, s * 0.55)
        elif kind == "face_x":
            radii = (s * 1.1, s * 0.55, s * 1.3)
        else:
            radii = (s * 0.55, s * 1.1, s * 1.3)
        bm = C.ellipsoid_bm(radii, subdiv=2, noise=0.08, seed=i + 20)
        name = f"Resin_{i + 1:02d}"
        ob = C.bmesh_to_object(name, bm, "RESIN_GUM")
        ob.location = p
        C.assign(ob, m_resin)
        C.tag(ob, "resin", "Resin / gum", order=i)
        C.set_parent(ob, root)

    # ---------------- anchors & cameras ----------------
    def polar(r, deg, z=Z_TOP):
        a = math.radians(deg)
        return Vector((r * math.cos(a), r * math.sin(a), z))

    anchors = {
        "ANCHOR_Bark": polar(R_BARK - 0.01, 95, -0.02),
        "ANCHOR_Phloem": polar((R_NEW + R_PHLOEM) / 2, 140),
        "ANCHOR_Xylem_New": polar((R_OLD + R_NEW) / 2, 195),
        "ANCHOR_Xylem_Old": polar(0.19, 40),
        "ANCHOR_Xylem_Old_Face": Vector((0.18, -0.001, -0.18)),
        "ANCHOR_Pith": polar(0.0, 0),
        "ANCHOR_Section_Top": Vector((0, 0, Z_TOP)),
        "ANCHOR_Waste_Entry": polar(R_BARK + 0.02, 230, -0.05),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root)

    cams = {
        "CAM_Stem_Intact": ((1.65, -2.25, 0.95), (0.0, 0.0, -0.12)),
        "CAM_Stem_Top": ((1.05, -1.55, 1.30), (0.0, 0.0, -0.12)),
        "CAM_Stem_OldXylem": ((0.62, -0.88, 0.70), (0.04, -0.04, -0.10)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)

    C.log("stem section built:", len(resin_defs), "resin deposits,", len(pores), "vessel marks")
    return root
