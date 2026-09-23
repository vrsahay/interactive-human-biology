"""
02_leaf.glb: one leaf (meso scale).

Source: Class X p. 94 (leaves are the chlorophyll-containing organs), p. 83 (stomata are tiny
pores on the surface of leaves); Class 9 Ch. 3 p. 32 (leaf epidermis with stomata).

Modelled: a simple dicot leaf, an ovate blade with a pointed tip, a raised midrib and
secondary veins joined by a fine net (all from textures + a real midrib ridge underneath),
and a leaf stalk. The upper surface is darker and waxy; the lower surface is paler and
carries a faint stomata pattern that bridges into 03_stoma. Blade thickness and
curvature are exaggerated slightly for readability (documented simplification).

Units: blade about 1.6 long along +Y (base at y = 0), about 0.72 wide. Upper surface faces +Z.
"""

import math

import numpy as np
from mathutils import Vector

import common as C

L = 1.6
W = 0.36          # half-width at the widest point
NU, NT = 36, 72   # grid across and along the blade
THICK = 0.012
STALK = 0.42


def half_width(t):
    """Ovate outline with a drawn-out (acuminate) tip, rounded base."""
    base = math.sin(math.pi * min(1.0, t ** 0.85)) ** 0.85
    tip = 1.0 - 0.55 * max(0.0, t - 0.6) / 0.4
    return W * max(0.0, base * tip)


def surface(u, t):
    """Point on the blade mid-surface: gentle arch along the leaf, slight cupping across it."""
    y = t * L
    x = u * half_width(t)
    z = 0.10 * math.sin(math.pi * t) - 0.16 * t * t          # arches up, then droops to the tip
    z += 0.05 * (u * u) * math.sin(math.pi * min(1, t * 1.2))  # cupped towards the edges
    x += 0.02 * math.sin(t * 5.0) * (1 - abs(u))              # a little asymmetry
    return Vector((x, y, z))


def vein_maps(n=1024, seed=21):
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float64)
    u = xs / (n - 1) * 2 - 1           # across the blade
    t = ys / (n - 1)                   # along the blade
    au = np.abs(u)
    mid = np.clip(1 - au / 0.025, 0, 1)
    sec = np.zeros_like(u)
    for k in range(10):
        tk = 0.06 + k * 0.088
        line = tk + 0.36 * au ** 1.1
        width = 0.016 * (1 - 0.55 * au)
        sec = np.maximum(sec, np.clip(1 - np.abs(t - line) / width, 0, 1) * np.clip(1 - au / 0.95, 0, 1) * (t > tk))
    f1, f2, _ = C.voronoi_cells(n, n, 700, seed, warp=0.01)
    net = np.clip(1 - (f2 - f1) / 0.012, 0, 1) ** 2 * 0.16
    veins = np.clip(np.maximum(np.maximum(mid * 1.0, sec * 0.85), net), 0, 1)
    for _ in range(2):   # soften: veins are rounded ridges, not cracks
        veins = (veins + np.roll(veins, 1, 0) + np.roll(veins, -1, 0) + np.roll(veins, 1, 1) + np.roll(veins, -1, 1)) / 5
    return u, t, veins


def build_textures():
    u, t, veins = vein_maps()
    n = veins.shape[0]
    grain = C.value_noise(n, n, 40, 7, octaves=3)
    shade = C.value_noise(n, n, 5, 8, octaves=3)
    # upper: deep glossy green, veins slightly lighter and sunk in
    top = np.stack([0.20 + shade * 0.06, 0.45 + shade * 0.1, 0.16 + shade * 0.04], axis=-1)
    top = top * (1 - veins[..., None] * 0.35) + np.array([0.52, 0.72, 0.38]) * (veins[..., None] * 0.35)
    # lower: paler, veins raised and lighter; faint stomata specks
    rng = np.random.default_rng(4)
    specks = (rng.random((n, n)) > 0.9965).astype(float)
    bot = np.stack([0.42 + shade * 0.05, 0.62 + shade * 0.06, 0.34 + shade * 0.04], axis=-1)
    bot = bot * (1 - veins[..., None] * 0.45) + np.array([0.74, 0.86, 0.6]) * (veins[..., None] * 0.45)
    bot = bot * (1 - specks[..., None] * 0.25)
    h_top = 1 - veins * 0.7 + grain * 0.05
    h_bot = veins + grain * 0.05 + specks * 0.15
    return (C.save_texture("tex_leaf2_top", top), C.save_data_texture("tex_leaf2_top_n", C.normal_from_height(h_top, 2.2)),
            C.save_texture("tex_leaf2_bottom", bot), C.save_data_texture("tex_leaf2_bottom_n", C.normal_from_height(h_bot, 3.0)))


def blade():
    """Closed blade: upper grid, lower grid, joined round the margin."""
    verts, faces, uvs, mats = [], [], [], []
    idx = {}
    for side, dz in ((0, THICK / 2), (1, -THICK / 2)):
        for j in range(NT + 1):
            t = j / NT
            for i in range(NU + 1):
                u = i / NU * 2 - 1
                p = surface(u, t)
                edge = 1 - abs(u)
                idx[(side, i, j)] = len(verts)
                verts.append(p + Vector((0, 0, dz * (0.4 + 0.6 * math.sqrt(max(edge, 0))))))
    for side in (0, 1):
        for j in range(NT):
            for i in range(NU):
                a, b = idx[(side, i, j)], idx[(side, i + 1, j)]
                c, d = idx[(side, i + 1, j + 1)], idx[(side, i, j + 1)]
                f = (a, b, c, d) if side == 0 else (d, c, b, a)
                faces.append(f)
                uv = [(i / NU, j / NT), ((i + 1) / NU, j / NT), ((i + 1) / NU, (j + 1) / NT), (i / NU, (j + 1) / NT)]
                uvs.append(uv if side == 0 else list(reversed(uv)))
                mats.append(side)
    # margin: join the upper and lower edges all the way round
    ring = [(i, 0) for i in range(NU)] + [(NU, j) for j in range(NT)] + [(i, NT) for i in range(NU, 0, -1)] + [(0, j) for j in range(NT, 0, -1)]
    for k in range(len(ring)):
        (i0, j0), (i1, j1) = ring[k], ring[(k + 1) % len(ring)]
        faces.append((idx[(0, i1, j1)], idx[(0, i0, j0)], idx[(1, i0, j0)], idx[(1, i1, j1)]))
        uvs.append([(0.5, 0.5)] * 4)
        mats.append(0)
    return verts, faces, uvs, mats


def build():
    top_c, top_n, bot_c, bot_n = build_textures()
    m_top = C.make_material("MAT_Leaf2_Upper", image=top_c, roughness=0.32, coat=0.35, normal_image=top_n, normal_strength=0.6)
    m_bot = C.make_material("MAT_Leaf2_Lower", image=bot_c, roughness=0.62, normal_image=bot_n, normal_strength=0.8)
    m_rib = C.make_material("MAT_Leaf2_Midrib", color="#8fbf62", roughness=0.5)
    m_stalk = C.make_material("MAT_Leaf2_Stalk", color="#6f9f45", roughness=0.5, coat=0.2)

    root = C.add_empty("Leaf", (0, 0, 0), "LEAF", size=0.3)
    C.tag(root, "leaf", "Leaf", asset="02_leaf")

    verts, faces, uvs, mats = blade()
    ob = C.mesh_object("Leaf_Blade", verts, faces, "LEAF_BLADE", uvs=uvs, smooth=True)
    ob.data.materials.append(m_top)
    ob.data.materials.append(m_bot)
    ob.data.polygons.foreach_set("material_index", mats)
    ob.data.update()
    C.tag(ob, "leaf", "Leaf blade")
    C.set_parent(ob, root)

    # midrib ridge under the blade, tapering to the tip
    pts, radii = [], []
    for k in range(40):
        t = k / 39 * 0.97
        pts.append(surface(0, t) + Vector((0, 0, -THICK * 0.5)))
        radii.append(0.018 * (1 - t) ** 0.8 + 0.002)
    v, f, fl = C.sweep_tube(pts, radii, sides=10)
    rib = C.mesh_object("Leaf_Midrib", v, f, "LEAF_BLADE", smooth=True, flat_faces=fl)
    C.assign(rib, m_rib)
    C.tag(rib, "leaf_vein", "Midrib (main vein)")
    C.set_parent(rib, root)

    # leaf stalk, slightly swollen at its base where it joins the stem
    pts = [Vector((0, -STALK * (1 - k / 16), -0.05 * (1 - k / 16) ** 2)) for k in range(17)]
    radii = [0.022 + 0.012 * max(0.0, 1 - k / 4) for k in range(17)]
    v, f, fl = C.sweep_tube(pts, radii, sides=12)
    stalk = C.mesh_object("Leaf_Stalk", v, f, "LEAF_BLADE", smooth=True, flat_faces=fl)
    C.assign(stalk, m_stalk)
    C.tag(stalk, "leaf_stalk", "Leaf stalk")
    C.set_parent(stalk, root)

    lower_spot = surface(0.35, 0.45) + Vector((0, 0, -THICK))
    anchors = {
        "ANCHOR_Leaf2_Tip": surface(0, 1.0),
        "ANCHOR_Leaf2_Base": Vector((0, 0, 0)),
        "ANCHOR_Leaf2_Stalk_Base": Vector((0, -STALK, -0.05)),
        "ANCHOR_Leaf2_Midrib": surface(0, 0.35) + Vector((0, 0, THICK)),
        "ANCHOR_Leaf2_Vein": surface(0.5, 0.52) + Vector((0, 0, THICK)),
        "ANCHOR_Leaf2_Upper": surface(-0.4, 0.55) + Vector((0, 0, THICK)),
        "ANCHOR_Leaf2_Lower": lower_spot,
        "ANCHOR_Leaf2_Above": surface(0, 0.5) + Vector((0, 0, 0.45)),
        "ANCHOR_Leaf2_Below": lower_spot + Vector((0, 0, -0.4)),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, collection="LEAF_BLADE")
    cams = {
        "CAM_Leaf2": ((0.9, -0.2, 1.45), (0.0, 0.8, 0.0)),
        "CAM_Leaf2_Under": ((0.75, 0.2, -0.9), (0.1, 0.8, -0.02)),
        "CAM_Leaf2_Surface": (tuple(lower_spot + Vector((0.05, -0.08, -0.24))), tuple(lower_spot)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("leaf built")
    return {"objects": len(C.descendants(root))}
