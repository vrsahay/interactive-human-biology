"""
Build the root/soil environment (root-soil.glb).

Lesson needs
------------
* Every plant shot stands on a calm, readable soil "diorama" – so the plant is
  grounded (no floating objects) without needing an endless ground plane.
* Stop 2 (water enters roots) and Stop 6 (wastes into soil) need to go
  BELOW GROUND: the soil is split along a vertical plane.  Soil_Front fades out
  in Three.js; Soil_Back keeps a cut face that shows soil layers behind the roots.
* The old leaf lands on Soil_Back, which never fades.
"""

import math
import random

import bmesh
import numpy as np
from mathutils import Vector

import common as C
import layout as L

RNG = random.Random(77)


def soil_textures():
    # top surface
    h = w = 512
    n1 = C.value_noise(h, w, 8, seed=3)
    n2 = C.value_noise(h, w, 64, seed=4, octaves=2)
    base = np.array([0.33, 0.23, 0.15])
    rgb = base[None, None, :] * (0.88 + 0.2 * n1[..., None]) * (0.92 + 0.14 * n2[..., None])
    specks = C.smoothstep(0.80, 0.86, C.value_noise(h, w, 160, seed=5, octaves=1))[..., None]
    rgb = rgb * (1 - specks * 0.35) + np.array([0.45, 0.34, 0.24]) * specks * 0.35
    top = C.save_texture("tex_soil_top", rgb)

    # vertical section: v = 1 at the surface, 0 at the bottom of the soil
    h, w = 512, 1024
    v = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
    wob = C.value_noise(h, w, 10, seed=6)
    depth = 1.0 - v + (wob - 0.5) * 0.06
    humus = np.array([0.22, 0.15, 0.10])
    topsoil = np.array([0.36, 0.25, 0.16])
    subsoil = np.array([0.52, 0.39, 0.25])
    f1 = C.smoothstep(0.08, 0.16, depth)[..., None]
    f2 = C.smoothstep(0.45, 0.62, depth)[..., None]
    rgb = humus * (1 - f1) + topsoil * f1
    rgb = rgb * (1 - f2) + subsoil * f2
    grain = C.value_noise(h, w, 96, seed=7, octaves=2)[..., None]
    rgb = rgb * (0.9 + 0.18 * grain)
    stones = C.value_noise(h, w, 120, seed=8, octaves=1)
    stone_mask = C.smoothstep(0.86, 0.9, stones)[..., None] * (0.3 + 0.7 * f2)
    rgb = rgb * (1 - stone_mask * 0.6) + np.array([0.60, 0.54, 0.46]) * stone_mask * 0.6
    section = C.save_texture("tex_soil_section", rgb)
    return top, section


def region_solid(name, x0, x1, y_lo, y_hi, nx, ny, collection, mats):
    """Closed solid: bumpy soil top over the region x∈[x0,x1], y∈[y_lo(x), y_hi(x)]."""
    zb = -L.SOIL_DEPTH
    verts, faces, uvs, mat_ids = [], [], [], []
    top_idx, bot_idx = {}, {}
    R = L.SOIL_RADIUS
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        lo, hi = y_lo(x), y_hi(x)
        for j in range(ny + 1):
            y = lo + (hi - lo) * j / ny
            top_idx[i, j] = len(verts)
            verts.append(Vector((x, y, L.soil_height(x, y))))
            bot_idx[i, j] = len(verts)
            verts.append(Vector((x, y, zb)))

    def top_uv(k):
        p = verts[k]
        return (p.x / R * 0.5 + 0.5, p.y / R * 0.5 + 0.5)

    for i in range(nx):
        for j in range(ny):
            a, b, c, d = top_idx[i, j], top_idx[i + 1, j], top_idx[i + 1, j + 1], top_idx[i, j + 1]
            faces.append((a, b, c, d)); uvs.append([top_uv(k) for k in (a, b, c, d)]); mat_ids.append(0)
            a, b, c, d = bot_idx[i, j], bot_idx[i, j + 1], bot_idx[i + 1, j + 1], bot_idx[i + 1, j]
            faces.append((a, b, c, d)); uvs.append([top_uv(k) for k in (a, b, c, d)]); mat_ids.append(2)

    # boundary loop (counter-clockwise seen from above): j=0 edge, i=nx edge, j=ny edge reversed, i=0 reversed
    loop = [(i, 0) for i in range(nx + 1)] + [(nx, j) for j in range(1, ny + 1)] \
        + [(i, ny) for i in range(nx - 1, -1, -1)] + [(0, j) for j in range(ny - 1, 0, -1)]
    run = 0.0
    for k in range(len(loop)):
        p, q = loop[k], loop[(k + 1) % len(loop)]
        tp, tq = top_idx[p], top_idx[q]
        bp, bq = bot_idx[p], bot_idx[q]
        seg = (verts[tq].xy - verts[tp].xy).length
        if seg < 1e-7:
            continue
        u0, u1 = run / (2 * R), (run + seg) / (2 * R)
        run += seg
        vt_p = (verts[tp].z - zb) / L.SOIL_DEPTH
        vt_q = (verts[tq].z - zb) / L.SOIL_DEPTH
        faces.append((bp, bq, tq, tp))
        uvs.append([(u0, 0.0), (u1, 0.0), (u1, vt_q), (u0, vt_p)])
        mat_ids.append(1)

    ob = C.mesh_object(name, verts, faces, collection, uvs=uvs, smooth=False)
    C.assign(ob, *mats)          # assign first: clearing slots resets material indices
    ob.data.polygons.foreach_set("material_index", mat_ids)
    # collapse the zero-width columns at the ends of the region
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-7, edges=bm.edges)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(ob.data)
    bm.free()
    # smooth only the top surface
    smooth = [p.material_index == 0 for p in ob.data.polygons]
    ob.data.polygons.foreach_set("use_smooth", smooth)
    ob.data.update()
    return ob


def build():
    top_tex, section_tex = soil_textures()
    m_top = C.make_material("MAT_Soil_Top", image=top_tex, roughness=0.95)
    m_section = C.make_material("MAT_Soil_Section", image=section_tex, roughness=0.95)
    m_bottom = C.make_material("MAT_Soil_Bottom", color="#2a1d14", roughness=1.0)
    m_base = C.make_material("MAT_Diorama_Base", color="#39414a", roughness=0.55)
    m_pebble = C.make_material("MAT_Pebble", color="#9a8f82", roughness=0.8)

    root = C.add_empty("RootSoil", (0, 0, 0), "SOIL", size=0.2)
    C.tag(root, "soil", "Soil", asset="16_soil")

    R, cy = L.SOIL_RADIUS, L.CUT_Y
    xc = math.sqrt(R * R - cy * cy)
    back = region_solid("Soil_Back", -xc, xc, lambda x: cy,
                        lambda x: math.sqrt(max(R * R - x * x, 0.0)), 44, 10, "SOIL", (m_top, m_section, m_bottom))
    C.tag(back, "soil", "Soil")
    C.set_parent(back, root)

    front = region_solid("Soil_Front", -R, R, lambda x: -math.sqrt(max(R * R - x * x, 0.0)),
                         lambda x: min(cy, math.sqrt(max(R * R - x * x, 0.0))), 48, 14, "SOIL",
                         (m_top, m_section, m_bottom))
    C.tag(front, "soil", "Soil", role="front", fadeable=1)
    C.set_parent(front, root)

    # display plinth
    bv, bf, bflat = C.annular_sector(0.0, R + 0.035, 0.0, 2 * math.pi, -L.SOIL_DEPTH - L.BASE_THICKNESS,
                                     -L.SOIL_DEPTH + 0.002, 64)
    base = C.mesh_object("Diorama_Base", bv, bf, "SOIL", smooth=True, flat_faces=bflat)
    C.recalc_normals(base)
    C.assign(base, m_base)
    C.tag(base, "base", "Display base")
    C.set_parent(base, root)

    # pebbles – only on the back half (the front half fades away)
    parts = []
    for k in range(14):
        on_face = k < 8
        if on_face:
            x = RNG.uniform(-0.6, 0.6)
            z = RNG.uniform(-0.55, -0.08)
            y = cy + RNG.uniform(0.004, 0.012)
            s = RNG.uniform(0.014, 0.028)
        else:
            ang = RNG.uniform(0.25, math.pi - 0.25)
            rr = RNG.uniform(0.25, 0.62)
            x, y = rr * math.cos(ang), cy + rr * math.sin(ang) * 0.9
            z = L.soil_height(x, y) - 0.004
            s = RNG.uniform(0.012, 0.022)
        bm = C.ellipsoid_bm((s * 1.3, s, s * 0.8), subdiv=1, noise=0.12, seed=k)
        verts = [v.co.copy() + Vector((x, y, z)) for v in bm.verts]
        faces = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        parts.append((verts, faces, []))
    pebbles = C.join_meshes("Soil_Pebbles", parts, "SOIL")
    C.recalc_normals(pebbles)
    C.assign(pebbles, m_pebble)
    C.tag(pebbles, "soil", "Soil")
    C.set_parent(pebbles, root)

    C.add_anchor("ANCHOR_Soil_Cut_Face", (0, cy, -0.3), parent=root, size=0.04)
    C.log("soil built")
    return root
