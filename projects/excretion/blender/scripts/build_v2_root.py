"""
14_root.glb: one young root, magnified (meso scale).

Source: Class X p. 94: roots take up ions from the soil; water moves into the root and on
into the root xylem, forming a column of water that is steadily pushed upwards. Class 9
Ch. 3 p. 32: root hairs (outgrowths of the root epidermis) greatly increase the surface
area for absorbing water and minerals. Class X p. 98: plants excrete some waste substances
into the soil around them.

Modelled, tip at the bottom (z = 0) growing downward into soil:
  Root_Tip          smooth, hairless growing tip (the cap-like end is shape only; the term
                    "root cap" is NOT used on the learner surface, it is not in the source)
  Root_Body         the young root, epidermis texture of elongated cells
  Root_Hairs        a zone of fine hairs, short near the tip and longer further up
  Root_Section_*    the top part is cut open: epidermis, a thick cortex, and a central
                    strand of root xylem (the destination of the water)
Hair density and the exact tissue proportions are EDUCATIONAL VISUALIZATION.

Units: root about 2.0 long (Z), radius about 0.07.
"""

import math
import random

import numpy as np
from mathutils import Vector

import common as C

RNG = random.Random(14)
LEN = 2.0
CUT_Z = 1.38          # between CUT_Z and CUT_TOP the front half is cut away (a window)
CUT_TOP = 1.78
SIDES = 48
R_XY = 0.02           # central xylem strand
HAIR_Z = (0.3, 1.26)


def radius(z):
    """Blunt rounded tip, widening quickly, then almost constant."""
    if z <= 0:
        return 0.0
    tip = math.sqrt(min(1.0, z / 0.09)) * 0.046
    grow = 0.046 + 0.024 * min(1.0, max(0.0, (z - 0.09) / 0.45)) ** 0.8
    return tip if z < 0.09 else grow


def wobble(z):
    """A little waviness so the root is not a perfect rod (straight through the cut window)."""
    z = min(z, CUT_Z)
    return Vector((0.03 * math.sin(z * 2.3) + 0.012 * math.sin(z * 7.1), 0.015 * math.sin(z * 3.1 + 1.0), 0))


def root_texture():
    h, w = 1024, 256
    f1, f2, cid = C.voronoi_cells(h, w, 1100, 41, warp=0.015, aspect=0.66)
    edge = np.clip(1 - (f2 - f1) / 0.004, 0, 1) ** 1.5
    rng = np.random.default_rng(5)
    tint = rng.uniform(-0.03, 0.03, 1100)[cid]
    v = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    young = np.clip(1 - v / 0.12, 0, 1)                 # tip is paler, denser
    base = np.stack([0.93 + tint, 0.89 + tint, 0.76 + tint * 0.5], axis=-1)
    base = base * (1 - young[..., None] * 0.1) + np.array([0.98, 0.93, 0.7]) * young[..., None] * 0.1
    rgb = base * (1 - edge[..., None] * 0.1)
    height = 1 - edge * 0.5 + C.value_noise(h, w, 30, 6, octaves=2) * 0.06
    return C.save_texture("tex_root_surface", rgb), C.save_data_texture("tex_root_surface_n", C.normal_from_height(height, 2.5))


def lathe(z0, z1, rings, a0=0.0, a1=2 * math.pi, r_scale=1.0, close_bottom=False, close_top=True):
    """Surface of revolution around the (wobbling) root axis, with UVs (u = angle, v = z / LEN)."""
    verts, faces, uvs = [], [], []
    n = SIDES
    grid = []
    for j in range(rings + 1):
        z = z0 + (z1 - z0) * j / rings
        r = radius(z) * r_scale
        c = wobble(z)
        row = []
        for i in range(n):          # closed ring, no duplicated seam vertices (watertight); UV seam is per loop
            a = a0 + (a1 - a0) * i / n
            row.append(len(verts))
            verts.append(c + Vector((r * math.cos(a), r * math.sin(a), z)))
        row.append(row[0])
        grid.append((row, z))
    for j in range(rings):
        (ra, za), (rb, zb) = grid[j], grid[j + 1]
        for i in range(n):
            faces.append((ra[i], ra[i + 1], rb[i + 1], rb[i]))
            uvs.append([(i / n, za / LEN), ((i + 1) / n, za / LEN), ((i + 1) / n, zb / LEN), (i / n, zb / LEN)])
    for (row, z), top in ((grid[0], False), (grid[-1], True)):
        if (top and close_top) or (not top and close_bottom):
            ci = len(verts)
            verts.append(wobble(z) + Vector((0, 0, z)))
            for i in range(n):
                f = (row[i], row[i + 1], ci) if top else (row[i + 1], row[i], ci)
                faces.append(f)
                uvs.append([(0.5, z / LEN)] * 3)
    return verts, faces, uvs


def section_texture():
    """Cut face: rounded cortex cells (loosely packed, small gaps) around the xylem strand."""
    n = 512
    f1, f2, cid = C.voronoi_cells(n, n, 260, 9, warp=0.01)
    rng = np.random.default_rng(3)
    tint = rng.uniform(-0.03, 0.03, 260)[cid]
    wall = np.clip(1 - (f2 - f1) / 0.012, 0, 1)
    gap = (f1 > 0.03) & ((f2 - f1) < 0.006)
    rgb = np.stack([0.93 + tint, 0.9 + tint, 0.78 + tint], axis=-1) * (1 - wall[..., None] * 0.25)
    rgb[gap] = rgb[gap] * 0.85
    h = 1 - wall * 0.7
    return C.save_texture("tex_root_cortex_cut", rgb), C.save_data_texture("tex_root_cortex_cut_n", C.normal_from_height(h, 3.0))


def planar_uvs(ob, scale):
    """Project (x, z) to UVs: the cut faces then show the cell texture at a fixed size."""
    me = ob.data
    uv = me.uv_layers.get("UVMap") or me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (co.x * scale + (co.y * scale if abs(poly.normal.y) < 0.5 else 0.0), co.z * scale)
    me.update()


def sector(r_in, r_out, z0, z1, a0, a1):
    """Annular sector that follows the root's wobble (so the cut section lines up with the body)."""
    v, f, fl = C.annular_sector(r_in, r_out, a0, a1, z0, z1, 40)
    return [p + wobble(p.z) for p in v], f, fl


def build():
    tex_c, tex_n = root_texture()
    m_root = C.make_material("MAT_Root_Surface", image=tex_c, roughness=0.55, coat=0.15, normal_image=tex_n, normal_strength=0.6)
    m_tip = C.make_material("MAT_Root_Tip", color="#f1e3b0", roughness=0.4, coat=0.3)
    m_hair = C.make_material("MAT_Root_Hair", color="#f4efe0", roughness=0.45, alpha=0.92)
    sec_c, sec_n = section_texture()
    m_cortex = C.make_material("MAT_Root_Cortex", image=sec_c, roughness=0.7, normal_image=sec_n, normal_strength=0.5)
    m_epi = C.make_material("MAT_Root_Epidermis_Cut", color="#d9cfa6", roughness=0.6)
    # V2.4 (DA-09): the same pale tan as the leaf vein's xylem (water-carrying xylem looks alike at every scale),
    # clearly unlike the saturated amber used for resin and gum
    m_xy = C.make_material("MAT_Root_Xylem", color="#c9b27a", roughness=0.55, coat=0.1)

    root = C.add_empty("Root", (0, 0, 0), "ROOT", size=0.2)
    C.tag(root, "root", "Root", asset="14_root")

    def add(name, parts_or_mesh, mat, coll, part, label, uvs=None, **extra):
        if uvs is not None:
            v, f = parts_or_mesh
            ob = C.mesh_object(name, v, f, coll, uvs=uvs, smooth=True)
        else:
            ob = C.join_meshes(name, parts_or_mesh, coll)
            C.recalc_normals(ob)
        C.assign(ob, mat)
        C.tag(ob, part, label, **extra)
        C.set_parent(ob, root)
        return ob

    # growing tip: a slightly swollen, hairless dome just over the body's end
    v, f, uv = lathe(0.0008, 0.16, 16, r_scale=1.06, close_bottom=True, close_top=True)
    add("Root_Tip", (v, f), m_tip, "ROOT_TIP", "root_cap", "Root tip (the growing end)", uvs=uv)

    # body up to the cut
    v, f, uv = lathe(0.1, CUT_Z, 90, close_bottom=True, close_top=True)
    add("Root_Body", (v, f), m_root, "ROOT_TIP", "root_epidermis", "Root", uvs=uv)

    # cut section: back half of epidermis + cortex, full central xylem strand
    r_top = radius(CUT_Z)
    add("Root_Section_Epidermis", [sector(r_top - 0.006, r_top, CUT_Z, CUT_TOP, 0.0, math.pi)], m_epi,
        "ROOT_TIP", "root_epidermis", "Root surface (epidermis)")
    cortex = add("Root_Section_Cortex", [sector(R_XY + 0.002, r_top - 0.006, CUT_Z, CUT_TOP, 0.0, math.pi)], m_cortex,
                 "ROOT_TIP", "root_cortex", "Inner root tissue")
    planar_uvs(cortex, 5.0)
    add("Root_Xylem", [sector(0.0, R_XY, CUT_Z - 0.02, LEN - 0.005, 0.0, 2 * math.pi)], m_xy,
        "ROOT_TIP", "root_xylem", "Root xylem (carries water upward)")
    # above the window the root continues whole
    v, f, uv = lathe(CUT_TOP, LEN, 18, close_bottom=True, close_top=True)
    add("Root_Body_Upper", (v, f), m_root, "ROOT_TIP", "root_epidermis", "Root", uvs=uv)

    # root hairs: each an outgrowth of one surface cell, longer with distance from the tip
    hairs = []
    hair_tips = []
    count = 640
    for k in range(count):
        z = HAIR_Z[0] + (HAIR_Z[1] - HAIR_Z[0]) * (k + RNG.random()) / count
        a = RNG.uniform(0, 2 * math.pi)
        grow = min(1.0, (z - HAIR_Z[0]) / 0.4)
        length = (0.025 + 0.15 * grow ** 0.8) * RNG.uniform(0.75, 1.15)
        if z > HAIR_Z[1] - 0.12:
            length *= 0.6 + 0.4 * (HAIR_Z[1] - z) / 0.12
        r0 = radius(z) * 0.97
        out = Vector((math.cos(a), math.sin(a), 0))
        side = Vector((-math.sin(a), math.cos(a), 0)) * RNG.uniform(-0.25, 0.25)
        base = wobble(z) + out * r0 + Vector((0, 0, z))
        pts = []
        steps = 6
        for s in range(steps + 1):
            t = s / steps
            d = out * (length * t) + side * (length * t * t) + Vector((0, 0, length * (0.15 * t - 0.25 * t * t)))
            pts.append(base + d)
        hairs.append(C.sweep_tube(pts, [0.0026] * steps + [0.0022], sides=5))
        hair_tips.append((pts[-1], a, z, length))
    add("Root_Hairs", hairs, m_hair, "ROOT_HAIRS", "root_hair", "Root hairs")

    # a long hair facing the camera (-Y) for anchors and the water path
    front = min(hair_tips, key=lambda h: abs(h[1] - 1.5 * math.pi) + abs(h[2] - 0.85) * 2 - h[3])
    tip, a, z, _ = front
    surf = wobble(z) + Vector((math.cos(a), math.sin(a), 0)) * radius(z) + Vector((0, 0, z))
    anchors = {
        "ANCHOR_RT_Tip": Vector((0, 0, 0.03)) + wobble(0.03),
        "ANCHOR_RT_Hair_Zone": wobble(0.8) + Vector((0.2, -0.08, 0.8)),
        "ANCHOR_RT_Hair": tip,
        "ANCHOR_RT_Surface": surf,
        "ANCHOR_RT_Cortex": wobble(1.6) + Vector((0.045, -0.002, 1.6)),
        "ANCHOR_RT_Xylem": wobble(1.7) + Vector((0, -0.02, 1.7)),
        "ANCHOR_RT_Soil": tip + Vector((0.08, -0.12, 0.05)),
        "ANCHOR_RT_Above": wobble(LEN) + Vector((0, 0, LEN + 0.15)),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, tuple(loc), parent=root, collection="ROOT_TIP")
    # water: soil → root hair → into the root → up the root xylem
    water = [anchors["ANCHOR_RT_Soil"], tip, surf, wobble(z) + Vector((0, 0, z)),
             wobble(CUT_Z) + Vector((0, -0.01, CUT_Z)), wobble(1.7) + Vector((0, -0.02, 1.7)),
             wobble(CUT_TOP) + Vector((0, -0.02, CUT_TOP))]
    for i, p in enumerate(C.catmull([tuple(p) for p in water], 3)):
        C.add_anchor(f"PATH_RT_Water_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="ROOT_TIP")
    # waste: from inside the root out into the soil (a separate, opposite direction)
    zw = 0.62
    out_dir = Vector((-0.8, -0.6, 0)).normalized()
    waste = [wobble(zw) + Vector((0, 0, zw)), wobble(zw) + out_dir * radius(zw) + Vector((0, 0, zw)),
             wobble(zw) + out_dir * 0.2 + Vector((0, 0, zw - 0.03)), wobble(zw) + out_dir * 0.36 + Vector((0, 0, zw - 0.08))]
    for i, p in enumerate(C.catmull([tuple(p) for p in waste], 3)):
        C.add_anchor(f"PATH_RT_Waste_{i:02d}", p, parent=root, size=0.01, display="PLAIN_AXES", collection="ROOT_TIP")

    cams = {
        "CAM_Root": ((0.35, -2.7, 1.05), (0.02, 0.0, 0.95)),
        "CAM_Root_Hairs": ((0.3, -0.95, 0.9), (0.03, 0.0, 0.8)),
        "CAM_Root_Section": ((0.3, -0.75, 1.7), (0.03, 0.0, 1.56)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("root built")
    return {"objects": len(C.descendants(root)), "hairs": count}
