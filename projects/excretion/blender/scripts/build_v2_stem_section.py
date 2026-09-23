"""
10_stem_cross_section.glb (V2): a magnified slice of a woody stem (meso scale).

V2 keeps V1's geometry, names, anchors and cameras (the runtime depends on them) and
replaces flat colours with a wood-section texture: bark, phloem, a thin cambium line,
younger xylem (pale, growth rings, rays, open vessel pores), older xylem (darker, pores
plugged with resin) and pith. Only "bark", "phloem", "xylem" and "old xylem" are named in
the lesson (Class X p. 94, p. 98; Class 9 Ch. 3 pp. 29, 34). The position of the older
xylem (inside) follows real woody-stem anatomy but is NOT stated in the lesson; the words
"heartwood" and "sapwood" are not used (not in the source): EDUCATIONAL VISUALIZATION.

V1 notes follow.

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

import numpy as np
from mathutils import Vector

import common as C

RNG = random.Random(552)

# radii (outer edge of each tissue ring)
R_PITH, R_OLD, R_NEW, R_PHLOEM, R_BARK = 0.07, 0.30, 0.42, 0.46, 0.50
Z_TOP, Z_WEDGE, Z_RINGS_BOTTOM, Z_BOTTOM = 0.0, -0.35, -0.65, -0.95
A0, A1 = 0.0, 1.5 * math.pi          # 270° kept; quadrant (+x, −y) removed = the wedge


def wood_textures(n=1536):
    """Radial texture of the cut face: every tissue from bark to pith, by radius."""
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float64)
    x = (xs / (n - 1) * 2 - 1) * R_BARK * 1.02
    y = (ys / (n - 1) * 2 - 1) * R_BARK * 1.02
    r = np.sqrt(x * x + y * y)
    ang = np.arctan2(y, x)
    wob = C.value_noise(n, n, 10, 3, octaves=3) - 0.5
    rw = r + wob * 0.006
    grain = C.value_noise(n, n, 120, 4, octaves=2)
    rgb = np.zeros((n, n, 3))
    h = np.zeros((n, n))
    def zone(mask, col, height):
        rgb[mask] = col
        h[mask] = height
    zone(rw >= R_PHLOEM, np.array([0.30, 0.21, 0.14]), 0.3)                          # bark
    zone((rw >= R_NEW + 0.006) & (rw < R_PHLOEM), np.array([0.64, 0.57, 0.46]), 0.35)  # phloem (V2.1: buff, not green)
    zone((rw >= R_NEW) & (rw < R_NEW + 0.006), np.array([0.70, 0.74, 0.52]), 0.5)      # cambium line
    young = (rw >= R_OLD) & (rw < R_NEW)
    old = (rw >= R_PITH) & (rw < R_OLD)
    zone(young, np.array([0.88, 0.80, 0.60]), 0.5)
    zone(old, np.array([0.55, 0.36, 0.22]), 0.5)
    zone(rw < R_PITH, np.array([0.84, 0.78, 0.64]), 0.45)
    # growth rings: a thin darker band at the end of each year's wood
    ring = ((R_NEW - rw) / 0.034) % 1.0
    late = np.clip(1 - ring / 0.16, 0, 1) * (young | old)
    rgb *= (1 - late[..., None] * 0.28)
    h -= late * 0.08
    # rays: fine radial lines through the xylem
    rays = (np.abs(np.sin(ang * 46 + wob * 3)) < 0.05) * (young | old)
    rgb = rgb * (1 - rays[..., None] * 0.12) + rays[..., None] * np.array([0.95, 0.9, 0.78]) * 0.12
    # vessel pores: open (dark) in the younger xylem; in the older xylem, closed and dark brown. V2.2: no amber
    # here, so the slice does not show resin before the lesson shows resins and gums being stored
    rng = np.random.default_rng(7)
    for k in range(950):
        pr = rng.uniform(R_PITH + 0.01, R_NEW - 0.008)
        pa = rng.uniform(-math.pi, math.pi)
        early = (((R_NEW - pr) / 0.034) % 1.0) > 0.7
        size = rng.uniform(0.0035, 0.0065) * (1.5 if early else 1.0)
        cx, cy = pr * math.cos(pa), pr * math.sin(pa)
        i0 = int(((cx / (R_BARK * 1.02)) + 1) / 2 * (n - 1))
        j0 = int(((cy / (R_BARK * 1.02)) + 1) / 2 * (n - 1))
        rad = max(1, int(size / (R_BARK * 2.04) * n))
        sl = (slice(max(0, j0 - rad), j0 + rad + 1), slice(max(0, i0 - rad), i0 + rad + 1))
        d = np.sqrt((x[sl] - cx) ** 2 + (y[sl] - cy) ** 2) < size
        if pr >= R_OLD:
            rgb[sl][d] = np.array([0.25, 0.19, 0.12])
            h[sl][d] = 0.1
        else:
            rgb[sl][d] = np.array([0.36, 0.23, 0.13])
            h[sl][d] = 0.55
    rgb *= (0.92 + grain[..., None] * 0.16)
    h += grain * 0.05
    # bark outside: vertical furrows
    bu = C.value_noise(n, n, 24, 9, octaves=4)
    fur = np.clip(np.abs(np.sin(xs / n * math.tau * 18 + bu * 6)), 0, 1)
    bark = np.stack([0.28 + fur * 0.12, 0.20 + fur * 0.08, 0.13 + fur * 0.05], axis=-1) * (0.85 + bu[..., None] * 0.3)
    return (C.save_texture("tex_wood_section", rgb[::-1]), C.save_data_texture("tex_wood_section_n", C.normal_from_height(h[::-1], 3.0)),
            C.save_texture("tex_bark_outer", bark), C.save_data_texture("tex_bark_outer_n", C.normal_from_height(fur * 0.8 + bu * 0.2, 4.0)))


def map_uvs(ob):
    """Cut faces sample the radial texture at their true (x, y); outer bark faces use the bark
    texture (material slot 1) wrapped around by angle."""
    me = ob.data
    uv = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")
    span = R_BARK * 1.02
    mats = []
    for poly in me.polygons:
        n = poly.normal
        centre = poly.center
        rc = math.hypot(centre.x, centre.y)
        outer = abs(n.z) < 0.5 and rc > R_BARK - 0.012 and abs(n.x * centre.x + n.y * centre.y) > 0.5 * rc
        mats.append(1 if outer else 0)
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            if outer:
                a = math.atan2(co.y, co.x)
                uv.data[li].uv = (a / math.tau * 3.0, co.z * 1.2)
            elif abs(n.z) >= 0.5:
                uv.data[li].uv = (0.5 + co.x / (2 * span), 0.5 + co.y / (2 * span))
            else:
                # radial cut (wedge) faces: sample the texture along a radius, so rings become bands
                r = math.hypot(co.x, co.y)
                uv.data[li].uv = (0.5 + r / (2 * span), 0.5 + co.z * 0.02)
    me.polygons.foreach_set("material_index", mats)
    me.update()


def tissue(name, r_in, r_out, mat, part, label, coll, parent, segs=72):
    upper = C.annular_sector(r_in, r_out, A0, A1, Z_WEDGE, Z_TOP, int(segs * 0.75))
    lower = C.annular_sector(r_in, r_out, 0.0, 2 * math.pi, Z_RINGS_BOTTOM, Z_WEDGE, segs)
    ob = C.join_meshes(name, [upper, lower], coll)
    C.recalc_normals(ob)
    C.assign(ob, *mat) if isinstance(mat, tuple) else C.assign(ob, mat)
    if isinstance(mat, tuple):
        map_uvs(ob)
    C.tag(ob, part, label)
    C.set_parent(ob, parent)
    return ob


def in_kept_region(angle):
    a = angle % (2 * math.pi)
    return A0 + 0.06 <= a <= A1 - 0.06


def build():
    wood_c, wood_n, bark_c, bark_n = wood_textures()
    # each tissue gets its own material (so it can be highlighted alone) sharing the section texture
    def cut_mat(name):
        return C.make_material(name, image=wood_c, roughness=0.72, normal_image=wood_n, normal_strength=0.7)
    m_outer = C.make_material("MAT_Bark_Outer", image=bark_c, roughness=0.92, normal_image=bark_n, normal_strength=1.0)
    m_bark = (cut_mat("MAT_Bark"), m_outer)
    m_phloem = (cut_mat("MAT_Phloem"), m_outer)
    m_new = (cut_mat("MAT_Xylem_New"), m_outer)
    m_old = (cut_mat("MAT_Xylem_Old"), m_outer)
    m_pith = (cut_mat("MAT_Pith"), m_outer)
    m_resin = C.make_material("MAT_Resin_Gum", color="#f2a12e", roughness=0.18, coat=0.6,
                              emission="#ffb04a", emission_strength=0.12)
    m_cover = (cut_mat("MAT_Stem_Cover"), m_outer)

    root = C.add_empty("StemSection", (0, 0, 0), "STEM_CROSS_SECTION", size=0.4)
    C.tag(root, "stem_section", "Stem cross-section", asset="10_stem_cross_section")

    tissue("Bark", R_PHLOEM, R_BARK, m_bark, "bark", "Bark (outer layer)", "STEM_CROSS_SECTION", root)
    tissue("Phloem", R_NEW, R_PHLOEM, m_phloem, "phloem", "Phloem", "STEM_CROSS_SECTION", root)
    tissue("Xylem_New", R_OLD, R_NEW, m_new, "xylem", "Xylem", "XYLEM", root)
    tissue("Xylem_Old", R_PITH, R_OLD, m_old, "old_xylem", "Old xylem", "XYLEM", root)
    tissue("Pith", 0.0, R_PITH, m_pith, "pith", "Pith (centre)", "STEM_CROSS_SECTION", root, segs=36)

    # continuation of the stem below the section (bark outside, closed)
    cv, cf, cflat = C.annular_sector(0.0, R_BARK, 0.0, 2 * math.pi, Z_BOTTOM, Z_RINGS_BOTTOM, 72)
    cont = C.mesh_object("Stem_Continuation", cv, cf, "STEM_CROSS_SECTION", smooth=True, flat_faces=cflat)
    C.recalc_normals(cont)
    C.assign(cont, *m_bark)
    map_uvs(cont)
    C.tag(cont, "bark", "Bark (outer layer)")
    C.set_parent(cont, root)

    # cover: the intact stem piece that lifts away in the cutaway reveal
    vv, vf, vflat = C.annular_sector(0.0, R_BARK + 0.006, 0.0, 2 * math.pi, Z_WEDGE - 0.002, 0.42, 72)
    cover = C.mesh_object("Stem_Cover", vv, vf, "STEM_CROSS_SECTION", smooth=True, flat_faces=vflat)
    C.recalc_normals(cover)
    C.assign(cover, *m_cover)
    map_uvs(cover)
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
