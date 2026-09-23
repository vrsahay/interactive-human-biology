"""
Build the main plant asset (plant.glb).

Lesson needs driving this asset
-------------------------------
* A clear, simple, complete plant (Ch 02): stem, branches, leaves, roots.
* Leaf_Hero – large, unobstructed, faces the viewer: photosynthesis → O2,
  transpiration, and the entry point of the leaf → cell zoom (Stops 1–3).
* Leaf_Old – a lower, older leaf whose origin sits at the petiole joint so
  Three.js can detach and drop it (Stop 4). It hangs over the back soil half so
  it lands on soil that never fades.
* Roots – kept in front of the soil cut plane so they are revealed when the
  front soil fades (Stop 6).
* Anchors / paths / camera references exported as empties so the lesson is
  driven by authored positions rather than magic numbers.
"""

import math
import random

import numpy as np
from mathutils import Matrix, Vector

import common as C
import layout as L

RNG = random.Random(1005)  # NCERT 10, ch 5 ;)


# --------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------
def leaf_texture():
    h, w = 1024, 512
    v = np.linspace(0, 1, h)[:, None]       # along leaf: 0 = base, 1 = tip
    u = np.linspace(0, 1, w)[None, :]       # across leaf: 0.5 = midrib
    d = np.abs(u - 0.5)
    noise = C.value_noise(h, w, 6, seed=11)
    fine = C.value_noise(h, w, 40, seed=12, octaves=2)

    base = np.array([0.30, 0.56, 0.22])
    light = np.array([0.44, 0.68, 0.30])
    dark = np.array([0.22, 0.44, 0.17])
    rgb = base[None, None, :] + (light - base)[None, None, :] * (0.55 - d)[..., None] * 0.9
    rgb = rgb + (dark - base)[None, None, :] * C.smoothstep(0.38, 0.5, d)[..., None]
    rgb = rgb * (0.92 + 0.12 * noise[..., None]) * (0.97 + 0.05 * fine[..., None])

    vein_col = np.array([0.66, 0.82, 0.48])
    # midrib
    mid_w = 0.016 * (1.0 - 0.75 * v) + 0.002
    mid = 1.0 - C.smoothstep(mid_w * 0.5, mid_w, d)
    # secondary veins: arcs leaving the midrib towards the tip
    veins = np.zeros((h, w), dtype=np.float32)
    for k in range(9):
        v0 = 0.06 + k * 0.1
        line = v0 + 0.62 * d ** 0.85
        width = 0.0065 * (1.0 - d * 1.4) + 0.0012
        dist = np.abs(v - line)
        veins = np.maximum(veins, (1.0 - C.smoothstep(width * 0.4, width, dist)) * (d < 0.47))
    vein_mask = np.clip(np.maximum(mid, veins * 0.75), 0, 1)[..., None]
    rgb = rgb * (1 - vein_mask) + vein_col[None, None, :] * vein_mask
    # rim
    rim = C.smoothstep(0.46, 0.5, d)[..., None]
    rgb = rgb * (1 - rim * 0.35)
    return C.save_texture("tex_leaf", rgb)


def materials():
    mats = {}
    # V2.4 (DA-12): a faint green glow floor, so a leaf turned away from the light is dark GREEN, not black
    # (near-black leaves read as dead or diseased)
    mats["leaf"] = C.make_material("MAT_Leaf", image=leaf_texture(), roughness=0.55, double_sided=True,
                                   emission="#1c3a12", emission_strength=1.0)
    mats["stem"] = C.make_material("MAT_Stem", vertex_color=True, roughness=0.7)
    mats["branch"] = C.make_material("MAT_Branch", vertex_color=True, roughness=0.65)
    mats["root"] = C.make_material("MAT_Root", vertex_color=True, roughness=0.8)
    return mats


# --------------------------------------------------------------------------
# Geometry helpers
# --------------------------------------------------------------------------
def sample_polyline(pts, t):
    """Point on polyline at normalised arc length t."""
    lengths = [0.0]
    for i in range(1, len(pts)):
        lengths.append(lengths[-1] + (pts[i] - pts[i - 1]).length)
    target = t * lengths[-1]
    for i in range(1, len(pts)):
        if lengths[i] >= target:
            seg = lengths[i] - lengths[i - 1]
            f = 0.0 if seg == 0 else (target - lengths[i - 1]) / seg
            return pts[i - 1].lerp(pts[i], f), (pts[i] - pts[i - 1]).normalized()
    return pts[-1], (pts[-1] - pts[-2]).normalized()


def resample(pts, n):
    return [sample_polyline(pts, i / (n - 1))[0] for i in range(n)]


def leaf_mesh(length, width, petiole_len, droop, cup, fold, nt=20, ns=10):
    verts, faces, uvs = [], [], []
    # petiole (small tube, joined into the leaf so the leaf can fall as one piece)
    pet_pts = [Vector((0, 0, 0)), Vector((petiole_len * 0.5, 0, 0.004)), Vector((petiole_len, 0, 0.006))]
    pv, pf, _ = C.sweep_tube(pet_pts, [0.0042, 0.0034, 0.0028], sides=6, cap_start=True, cap_end=False)
    verts.extend(pv)
    for f in pf:
        faces.append(f)
        uvs.append([(0.5, 0.012)] * len(f))
    off = len(verts)

    def hw(t):
        return 0.5 * width * max(0.03, math.sin(math.pi * t ** 0.72)) ** 0.85

    grid_uv = []
    for i in range(nt + 1):
        t = i / nt
        for j in range(ns + 1):
            s = -1 + 2 * j / ns
            x = petiole_len + t * length
            y = s * hw(t)
            z = 0.006 - droop * (t ** 2) * length + cup * (s * s) * hw(t) + fold * abs(s) * hw(t)
            verts.append(Vector((x, y, z)))
            grid_uv.append((0.5 + 0.5 * s, t))
    for i in range(nt):
        for j in range(ns):
            a = off + i * (ns + 1) + j
            b = off + (i + 1) * (ns + 1) + j
            c = off + (i + 1) * (ns + 1) + j + 1
            d = off + i * (ns + 1) + j + 1
            faces.append((a, b, c, d))
            uvs.append([grid_uv[k - off] for k in (a, b, c, d)])
    return verts, faces, uvs


def leaf_basis(direction, pref_normal):
    x = Vector(direction).normalized()
    n = Vector(pref_normal).normalized()
    z = (n - x * n.dot(x)).normalized()
    y = z.cross(x)
    m = Matrix((x, y, z)).transposed()
    return m.to_4x4()


# --------------------------------------------------------------------------
# Build
# --------------------------------------------------------------------------
def build():
    mats = materials()
    root = C.add_empty("Plant", (0, 0, 0), "PLANT", size=0.2)
    C.tag(root, "plant", "Plant", asset="01_plant")

    # ---------------- stem ----------------
    base_z = L.soil_height(0, 0)
    stem_ctrl = [(0, 0, -0.07), (0.0, 0.0, base_z + 0.06), (0.012, -0.004, 0.32), (0.0, -0.01, 0.55),
                 (-0.014, 0.0, 0.78), (0.0, 0.01, 0.98), (0.01, 0.0, 1.14), (0.004, 0.0, 1.26)]
    stem_pts = C.catmull(stem_ctrl, 5)

    # V2.4 (DA-10): a young WOODY plant (a sapling tree), so the magnified stem slice (bark, rings of
    # xylem, darker old xylem) belongs to it: the trunk is thicker at the base and tapers upward, and is
    # covered in bark (brown, with vertical furrows) up to the lowest branches; only the young shoot
    # above is green.
    def stem_radius(z):
        f = max(0.0, min(1.0, (z - 0.05) / 1.2))
        r = 0.012 + 0.046 * (1 - f) ** 1.3
        if z < base_z + 0.03:
            r += 0.010 * (1 - max(0.0, (z + 0.07) / (base_z + 0.1)))
        return r

    radii = [stem_radius(p.z) for p in stem_pts]
    radii[-1] = 0.004
    sv, sf, sflat = C.sweep_tube(stem_pts, radii, sides=24)
    stem = C.mesh_object("Stem_Main", sv, sf, "PLANT_STEM", smooth=True, flat_faces=sflat)
    C.recalc_normals(stem)
    C.assign(stem, mats["stem"])
    brown, bark_dark, green = (0.45, 0.32, 0.21), (0.27, 0.18, 0.11), (0.40, 0.56, 0.22)

    def stem_col(w, _l):
        f = max(0.0, min(1.0, (w.z - 0.34) / 0.28))           # bark below ~0.34, green shoot above ~0.62
        a = math.atan2(w.y + 0.004, w.x - 0.006)
        furrow = (0.5 + 0.5 * math.sin(a * 9 + math.sin(w.z * 23.0) * 1.3)) ** 3 * (1 - f)
        bark = tuple(brown[i] * (1 - 0.75 * furrow) + bark_dark[i] * 0.75 * furrow for i in range(3))
        return tuple(bark[i] * (1 - f) + green[i] * f for i in range(3))

    C.set_vertex_colors(stem, stem_col)
    C.tag(stem, "stem", "Stem")
    C.set_parent(stem, root)

    def stem_point(z):
        best = min(range(len(stem_pts)), key=lambda i: abs(stem_pts[i].z - z))
        return stem_pts[best].copy()

    # ---------------- branches ----------------
    branch_defs = [
        # name, height, direction, length
        ("Branch_01", 0.50, (1.0, -0.05, 0.70), 0.40),
        ("Branch_02", 0.62, (-1.0, -0.42, 0.68), 0.42),   # carries the hero leaf
        ("Branch_03", 0.78, (0.62, 0.60, 0.90), 0.34),
        ("Branch_04", 0.92, (-0.60, 0.55, 0.92), 0.30),
        ("Branch_05", 1.04, (0.75, -0.55, 0.95), 0.24),
        ("Branch_06", 0.70, (0.62, -0.75, 0.80), 0.30),   # front-right, fills the canopy
        ("Branch_07", 0.84, (-0.30, 0.95, 0.90), 0.28),   # back, gives depth
    ]
    branches = {}
    for name, hgt, d, length in branch_defs:
        p0 = stem_point(hgt)
        dv = Vector(d).normalized()
        up = Vector((0, 0, 1))
        ctrl = [p0, p0 + dv * length * 0.35, p0 + dv * length * 0.7 + up * 0.035, p0 + dv * length + up * 0.075]
        pts = C.catmull(ctrl, 5)
        rad = [0.0135 - 0.009 * (i / (len(pts) - 1)) for i in range(len(pts))]
        bv, bf, bflat = C.sweep_tube(pts, rad, sides=9)
        br = C.mesh_object(name, bv, bf, "BRANCHES", smooth=True, flat_faces=bflat)
        C.recalc_normals(br)
        C.assign(br, mats["branch"])
        C.set_vertex_colors(br, lambda w, l: (0.40, 0.55, 0.23))
        C.tag(br, "branch", "Branch")
        C.set_parent(br, root)
        branches[name] = pts

    # ---------------- leaves ----------------
    leaf_count = [0]
    leaf_records = {}

    def add_leaf(name, attach, direction, pref_normal, length, width, droop=0.12, cup=0.10, fold=0.08,
                 petiole=0.03, part_role="leaf"):
        verts, faces, uvs = leaf_mesh(length, width, petiole, droop, cup, fold)
        ob = C.mesh_object(name, verts, faces, "LEAVES", uvs=uvs, smooth=True)
        C.assign(ob, mats["leaf"])
        ob.matrix_world = Matrix.Translation(attach) @ leaf_basis(direction, pref_normal)
        C.tag(ob, "leaf", "Leaf", role=part_role, open_surface=1)
        C.set_parent(ob, root)
        leaf_records[name] = dict(obj=ob, length=length, petiole=petiole)
        return ob

    def next_name():
        leaf_count[0] += 1
        return f"Leaf_{leaf_count[0]:02d}"

    front_up = (0.0, -0.8, 1.0)
    for bname, pts in branches.items():
        for k, t in enumerate((0.34, 0.58, 0.82)):
            p, tan = sample_polyline(pts, t)
            lateral = tan.cross(Vector((0, 0, 1))).normalized() * (1 if k % 2 == 0 else -1)
            direction = (tan * 0.5 + lateral * 0.8 + Vector((0, 0, 0.3))).normalized()
            if bname == "Branch_02" and k == 1:
                # the hero leaf: faces the learner, large, unobstructed
                hero_dir = Vector((-0.55, -0.78, 0.30)).normalized()
                add_leaf("Leaf_Hero", p, hero_dir, (0.0, -0.9, 0.55), 0.21, 0.10, droop=0.10,
                         cup=0.06, fold=0.05, petiole=0.034, part_role="hero")
                continue
            add_leaf(next_name(), p, direction, front_up, RNG.uniform(0.18, 0.225), RNG.uniform(0.088, 0.106),
                     droop=RNG.uniform(0.08, 0.16))
        p_end, tan_end = sample_polyline(pts, 1.0)
        add_leaf(next_name(), p_end - tan_end * 0.004, (tan_end + Vector((0, 0, 0.5))).normalized(), front_up,
                 RNG.uniform(0.16, 0.19), RNG.uniform(0.078, 0.092), droop=0.10)

    # top rosette
    top = stem_pts[-1] - Vector((0, 0, 0.012))
    for d in ((0.35, -0.35, 1.0), (-0.45, 0.15, 1.0), (0.30, 0.50, 0.9)):
        add_leaf(next_name(), top, d, (0.0, -0.3, 1.0) if d[1] > 0 else front_up, 0.12, 0.06, droop=0.06)

    # lower stem leaves: one ordinary, one old leaf that will fall
    low_p = stem_point(0.40)
    add_leaf(next_name(), low_p, (-0.92, -0.25, 0.30), front_up, 0.16, 0.078, droop=0.18)
    old_p = stem_point(0.30)
    old_dir = Vector((0.86, 0.42, 0.10)).normalized()
    add_leaf("Leaf_Old", old_p, old_dir, (0.0, -0.35, 1.0), 0.17, 0.082, droop=0.26, cup=0.08,
             petiole=0.036, part_role="old")

    # ---------------- roots ----------------
    root_parts = []

    def clamp_root(p):
        p = p.copy()
        p.y = min(p.y, L.ROOT_MAX_Y)
        p.z = max(p.z, L.ROOT_MIN_Z)
        r = math.hypot(p.x, p.y)
        if r > L.ROOT_MAX_R:
            p.x *= L.ROOT_MAX_R / r
            p.y *= L.ROOT_MAX_R / r
        return p

    tap_ctrl = [(0, 0, -0.02), (0.006, -0.012, -0.12), (-0.01, -0.02, -0.24), (0.012, -0.03, -0.35),
                (0.0, -0.035, -0.45)]
    tap = C.catmull(tap_ctrl, 5)
    # V2.4: the tap root starts as thick as the (now woody) stem base, then tapers
    tap_r = [0.004 + 0.042 * (1 - i / (len(tap) - 1)) ** 1.6 for i in range(len(tap))]
    root_parts.append(C.sweep_tube(tap, tap_r, sides=10))

    lateral_paths = []
    for i in range(9):
        depth_t = 0.08 + i * 0.09
        base_idx = int(depth_t * (len(tap) - 1))
        p0 = tap[base_idx]
        side = 1 if i % 2 == 0 else -1
        length = 0.40 - 0.03 * i
        yaw = RNG.uniform(-0.55, 0.15)
        dv = Vector((side * math.cos(yaw), math.sin(yaw) * 0.6 - 0.1, -0.28 - 0.04 * i)).normalized()
        ctrl = [p0]
        for s in (0.3, 0.62, 1.0):
            q = p0 + dv * length * s + Vector((0, 0, -0.06 * s * s)) \
                + Vector((RNG.uniform(-0.02, 0.02), RNG.uniform(-0.02, 0.02), RNG.uniform(-0.015, 0.015)))
            ctrl.append(clamp_root(q))
        pts = C.catmull(ctrl, 5)
        rad = [0.0105 - 0.0085 * (k / (len(pts) - 1)) for k in range(len(pts))]
        root_parts.append(C.sweep_tube(pts, rad, sides=7))
        lateral_paths.append(pts)
        # secondary rootlets
        for t in (0.45, 0.72):
            q0, qt = sample_polyline(pts, t)
            sdir = (qt + Vector((0, RNG.uniform(-0.4, 0.2), -0.7))).normalized()
            sub = [q0, clamp_root(q0 + sdir * 0.05), clamp_root(q0 + sdir * 0.1 + Vector((0, 0, -0.02)))]
            sp = C.catmull(sub, 4)
            sr = [0.0042 - 0.0028 * (k / (len(sp) - 1)) for k in range(len(sp))]
            root_parts.append(C.sweep_tube(sp, sr, sides=5))

    roots = C.join_meshes("Roots", root_parts, "ROOTS")
    C.recalc_normals(roots)
    C.assign(roots, mats["root"])

    def root_col(w, _l):
        f = max(0.0, min(1.0, (-w.z) / 0.5))
        a, b = (0.80, 0.70, 0.52), (0.93, 0.87, 0.72)
        return tuple(a[i] * (1 - f) + b[i] * f for i in range(3))

    C.set_vertex_colors(roots, root_col)
    C.tag(roots, "roots", "Roots")
    C.set_parent(roots, root)

    # ---------------- anchors & paths ----------------
    def leaf_point(name, frac):
        rec = leaf_records[name]
        ob = rec["obj"]
        return ob.matrix_world @ Vector((rec["petiole"] + rec["length"] * frac, 0, 0.004))

    hero = leaf_records["Leaf_Hero"]["obj"]
    hero_center = leaf_point("Leaf_Hero", 0.45)
    hero_normal = (hero.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized()
    old_center = leaf_point("Leaf_Old", 0.45)

    anchors = {
        "ANCHOR_Plant_Center": Vector((0, 0, 0.5)),
        "ANCHOR_Canopy_Top": stem_pts[-1].copy(),
        "ANCHOR_Leaf_Hero": hero_center,
        "ANCHOR_Leaf_Hero_Tip": leaf_point("Leaf_Hero", 0.95),
        "ANCHOR_Leaf_Hero_Normal": hero_center + hero_normal * 0.1,
        "ANCHOR_Leaf_Old": old_center,
        "ANCHOR_Leaf_Old_Base": old_p.copy(),
        "ANCHOR_Leaf_Old_Landing": Vector((0.30, 0.26, L.soil_height(0.30, 0.26))),
        "ANCHOR_Stem_Cut": stem_point(0.20),
        "ANCHOR_Root_Zone": Vector((0.0, -0.06, -0.24)),
        "ANCHOR_Soil_Surface": Vector((0.0, -0.3, L.soil_height(0.0, -0.3))),
    }
    for name, loc in anchors.items():
        e = C.add_anchor(name, loc)
        C.set_parent(e, root)

    # Water path: soil → lateral root → tap root → stem → Branch_02 → hero leaf
    lat = lateral_paths[1]  # first left lateral, shallow
    water = [lat[-1] + (lat[-1] - lat[-2]).normalized() * 0.04] + list(reversed(lat))
    junction_z = lat[0].z
    water += [p for p in reversed(tap) if p.z > junction_z]      # up the tap root
    water += [p for p in stem_pts if 0.0 < p.z < 0.64]           # up the stem
    b2 = branches["Branch_02"]
    hero_attach = hero.matrix_world.to_translation()
    b2_until = [p for p in b2 if (p - b2[0]).length < (hero_attach - b2[0]).length]
    water += b2_until + [hero_attach, leaf_point("Leaf_Hero", 0.15), hero_center]
    water = resample(water, 26)
    for i, p in enumerate(water):
        e = C.add_anchor(f"PATH_Water_{i:02d}", p, size=0.012, display="PLAIN_AXES")
        C.set_parent(e, root)

    # Stored-waste path into the old leaf: lower stem → petiole → blade
    old_path = [p for p in stem_pts if 0.02 < p.z < 0.30] + [old_p.copy(), leaf_point("Leaf_Old", 0.1),
                                                              old_center]
    old_path = resample(old_path, 12)
    for i, p in enumerate(old_path):
        e = C.add_anchor(f"PATH_OldLeaf_{i:02d}", p, size=0.012, display="PLAIN_AXES")
        C.set_parent(e, root)

    # ---------------- camera references ----------------
    side = Vector((-0.35, -0.15, 0.12))
    cams = {
        "CAM_Plant_Intro": ((2.5, -5.0, 1.7), (0.0, 0.0, 0.40)),
        "CAM_Plant_Wide": ((1.0, -3.7, 1.0), (0.0, 0.0, 0.36)),
        "CAM_Leaf_Hero": (tuple(hero_center + hero_normal * 0.34 + side * 0.4), tuple(hero_center)),
        "CAM_Leaf_Hero_Air": (tuple(hero_center + hero_normal * 0.62 + Vector((-0.1, -0.1, 0.05))),
                              tuple(hero_center + Vector((0, 0, 0.12)))),
        "CAM_Stem_Mid": ((0.32, -1.15, 0.50), (0.0, 0.0, 0.48)),
        "CAM_Roots": ((0.22, -1.45, -0.12), (0.0, -0.04, -0.22)),
        "CAM_Leaf_Old": (tuple(old_center + Vector((0.10, -0.55, 0.16))), tuple(old_center)),
        "CAM_Leaf_Fall": ((0.65, -1.4, 0.35), (0.26, 0.12, 0.14)),
        "CAM_Stem_Cut": ((0.20, -0.56, 0.30), tuple(anchors["ANCHOR_Stem_Cut"])),
        "CAM_Final": ((1.25, -3.9, 1.05), (0.0, 0.0, 0.36)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)

    C.log("plant built:", len(leaf_records), "leaves,", len(water), "water path points")
    return root
