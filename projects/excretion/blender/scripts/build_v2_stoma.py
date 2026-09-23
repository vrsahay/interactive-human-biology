"""
03_stoma.glb: a patch of leaf epidermis with one stoma (micro scale).

Source: Class X p. 83 (stomata are tiny pores on the leaf surface; gas exchange and
water loss happen through them; two guard cells swell when water flows in, opening
the pore, and shrink to close it); Class 9 Ch. 3 p. 32 (the leaf epidermis contains
stomata; transpiration is evaporation of water vapour through them).

What is modelled, and why
* Pavement (epidermal) cells: jigsaw-shaped, gently domed, with a waxy cuticle.
  They give the stoma a believable setting. Not named in the lesson.
* Hero stoma: two kidney-shaped guard cells around a pore. Base shape = CLOSED;
  shape key "Open" bows them apart (the runtime blends it to open or close the pore).
* Guard-cell chloroplasts are visible through the wall (real, not narrated).
* Substomatal air space: a dark cavity under the pore with mesophyll cells deep
  inside, which links to 05_leaf_internal.
* Two smaller stomata nearby, for context (stomata occur in numbers).

Units: the patch is 1.3 x 1.3 (about 150 micrometres across). The surface faces +Z.
"""

import math
import random

import bmesh
import bpy
import numpy as np
from mathutils import Vector

import common as C

RNG = random.Random(83)
SIZE = 1.3
GRID = 118
N_CELLS = 46
SEED = 830
PORE = Vector((0.0, 0.0, 0.0))
GC_LEN = 0.235         # guard-cell pair: half-length along Y (pole to pole)
GC_R = 0.074           # guard-cell radius at its widest
OPEN_BOW = 0.100       # centre-line bow at the middle when open (pore about 0.12 wide)
CLOSED_BOW = 0.034     # closed: the inner walls meet
DIP_A, DIP_B = 0.24, 0.34     # the epidermis dips gently where the guard cells sit


def cell_field(u, v, seed=SEED, n=N_CELLS, warp=0.07):
    """Periodic jigsaw Voronoi field on arbitrary coordinate arrays in [0,1)."""
    rng = np.random.default_rng(seed)
    pts = rng.random((n, 2))
    # low-frequency bend + small high-frequency lobes = the jigsaw outline of pavement cells
    lo_u = np.sin(v * 2 * np.pi * 3 + 1.3) * 0.018 + np.sin(u * 2 * np.pi * 2 + 0.4) * 0.01
    lo_v = np.sin(u * 2 * np.pi * 3 + 2.1) * 0.018 + np.sin(v * 2 * np.pi * 2 + 1.7) * 0.01
    hi_u = np.sin(v * 2 * np.pi * 14 + np.sin(u * 2 * np.pi * 5) * 1.5) * 0.009
    hi_v = np.sin(u * 2 * np.pi * 14 + np.sin(v * 2 * np.pi * 5) * 1.5) * 0.009
    uu = u + lo_u + hi_u
    vv = v + lo_v + hi_v
    f1 = np.full(u.shape, 9.0)
    f2 = np.full(u.shape, 9.0)
    cid = np.zeros(u.shape, np.int32)
    for i, (px, py) in enumerate(pts):
        du = np.abs(uu - px)
        du = np.minimum(du, 1 - du)
        dv = np.abs(vv - py)
        dv = np.minimum(dv, 1 - dv)
        d = np.sqrt(du * du + dv * dv)
        closer = d < f1
        f2 = np.where(closer, f1, np.minimum(f2, d))
        cid = np.where(closer, i, cid)
        f1 = np.where(closer, d, f1)
    return f1, f2, cid


def surface_height(x, y):
    """Height of the epidermis at world (x, y): domed cells, grooves between them,
    a gentle dip around the stoma."""
    u = (x / SIZE + 0.5) % 1.0
    v = (y / SIZE + 0.5) % 1.0
    f1, f2, _ = cell_field(u, v)
    e = np.clip((f2 - f1) / 0.05, 0, 1)
    dome = (1 - (1 - e) ** 3) * 0.013                   # rounded cell tops, soft grooves between
    r = np.sqrt((x / DIP_A) ** 2 + (y / DIP_B) ** 2)
    dip = -0.045 * np.exp(-(r ** 2) * 1.6)              # the stoma sits a little below the surface
    dome = dome * np.clip((r - 0.7) / 0.5, 0, 1)        # no cell relief under the guard cells
    edge_fade = np.clip((SIZE / 2 - np.maximum(np.abs(x), np.abs(y))) / 0.07, 0, 1)
    return (dome + dip) * edge_fade


def textures():
    n = 1024
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float64)
    u, v = xs / n, ys / n
    f1, f2, cid = cell_field(u, v)
    edge = np.clip((f2 - f1) / 0.05, 0, 1)
    # colour: pale translucent green-white cells, darker borders, slight per-cell variation
    rng = np.random.default_rng(3)
    tint = rng.uniform(-0.04, 0.04, N_CELLS)[cid]
    base = np.stack([0.78 + tint, 0.88 + tint, 0.70 + tint * 0.5], axis=-1)
    border = np.stack([0.42, 0.58, 0.36], axis=-1)
    k = ((1 - edge) ** 2)[..., None]
    rgb = base * (1 - k * 0.7) + border * (k * 0.7)
    # faint cuticle texture (micro-relief only)
    grain = C.value_noise(n, n, 48, 5, octaves=3)
    h = (1 - (1 - edge) ** 3) * 0.6 + grain * 0.04
    return C.save_texture("tex_epidermis_color", rgb[::-1]), C.save_data_texture("tex_epidermis_normal", C.normal_from_height(h[::-1], 3.0))


def epidermis(root, m_epi):
    """The epidermis as a closed slab: height-field top, flat bottom, straight sides."""
    n = GRID
    xs = np.linspace(-SIZE / 2, SIZE / 2, n + 1)
    X, Y = np.meshgrid(xs, xs)
    Z = surface_height(X, Y)
    depth = -0.09
    verts, faces, uvs = [], [], []
    idx = lambda i, j: j * (n + 1) + i
    for j in range(n + 1):
        for i in range(n + 1):
            verts.append((X[j, i], Y[j, i], Z[j, i]))
    for j in range(n):
        for i in range(n):
            faces.append((idx(i, j), idx(i + 1, j), idx(i + 1, j + 1), idx(i, j + 1)))
            uvs.append([(i / n, j / n), ((i + 1) / n, j / n), ((i + 1) / n, (j + 1) / n), (i / n, (j + 1) / n)])
    # border ring, walked round the edge, dropped to the bottom
    ring = [idx(i, 0) for i in range(n)] + [idx(n, j) for j in range(n)] + \
           [idx(i, n) for i in range(n, 0, -1)] + [idx(0, j) for j in range(n, 0, -1)]
    base = len(verts)
    for k in ring:
        x, y, _ = verts[k]
        verts.append((x, y, depth))
    m = len(ring)
    for k in range(m):
        a0, a1 = ring[k], ring[(k + 1) % m]
        b0, b1 = base + k, base + (k + 1) % m
        faces.append((a1, a0, b0, b1))
        uvs.append([(0, 0), (0, 0), (0, 0), (0, 0)])
    # bottom: a triangle fan (a single huge n-gon shades badly), facing down
    centre = len(verts)
    verts.append((0.0, 0.0, depth))
    for k in range(m):
        faces.append((base + (k + 1) % m, base + k, centre))
        uvs.append([(0, 0)] * 3)
    ob = C.mesh_object("Epidermis_Surface", verts, faces, "EPIDERMIS", uvs=uvs, smooth=True)   # winding set explicitly
    C.assign(ob, m_epi)
    C.tag(ob, "epidermis", "Leaf surface (epidermis)")
    C.set_parent(ob, root)
    return ob


def pole_offset(t):
    """Distance of a guard cell's centre line from the stoma's midline. V2.1: small at the poles, so
    the two cells overlap there and stay JOINED at both ends in every state; only the middle bows
    apart (the pore). V2 used a constant 0.45·GC_R, which left a notch at each pole."""
    return GC_R * (0.1 + 0.35 * math.sin(math.pi * t) ** 0.6)


def gc_radius(t):
    return GC_R * (0.62 + 0.38 * math.sin(math.pi * t) ** 0.7)


def guard_cell_points(side, bow, n=26):
    """Centre line of one guard cell: an arc from the top pole to the bottom pole."""
    pts = []
    for k in range(n):
        t = k / (n - 1)
        y = GC_LEN * math.cos(math.pi * t)                # +len → −len
        x = side * (bow * math.sin(math.pi * t) + pole_offset(t))   # the poles stay put and overlap
        pts.append(Vector((x, y, -0.006)))
    # V2.4 (DA-05): each end runs on a little past the midline, so the two cells' ends overlap and the
    # pair is JOINED at both poles by its own shape (no separate bead covering a gap)
    ext = pole_offset(0.0) + 0.006
    pts.insert(0, pts[0] + (pts[0] - pts[1]).normalized() * ext)
    pts.append(pts[-1] + (pts[-1] - pts[-2]).normalized() * ext)
    return pts


def guard_cell_radii(n=26):
    r = [gc_radius(k / (n - 1)) for k in range(n)]
    return [r[0]] + r + [r[-1]]


def pole_joint_parts(scale=1.0, xform=None):
    """V2.1: the shared end walls. The two guard cells are joined at both poles; the poles do not
    move when the stoma opens (only the middles bow apart), so this joint is static geometry that
    overlaps both cells' ends and hides any seam between them."""
    # V2.4 (DA-05): no longer a round bead that bulged past the cells (it read as extra cells). It is now
    # only the thin shared wall where the two guard cells meet: a flat disc across the pole, smaller than
    # the cells' ends, so the pair reads as two kidney-shaped cells joined at both ends.
    parts = []
    for sy in (1, -1):
        r_end = gc_radius(0.0) * scale
        bm = C.ellipsoid_bm((0.005 * scale, r_end * 0.86, r_end * 0.82 * 0.86), subdiv=3)
        c = Vector((0.0, sy * GC_LEN * scale, -0.006 * 0.82))
        verts = [v.co + c for v in bm.verts]
        if xform:
            verts = [xform(v) for v in verts]
        faces = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        parts.append((verts, faces, []))
    return parts


def guard_cell(name, side, m_gc):
    n = 26
    radii = guard_cell_radii(n)
    v_closed, faces, flat = C.sweep_tube(guard_cell_points(side, CLOSED_BOW, n), radii, sides=18)
    v_open, _, _ = C.sweep_tube(guard_cell_points(side, OPEN_BOW, n), radii, sides=18)
    # flatten a little (guard cells are deeper than wide) and thicken the pore-side wall visually
    def shape(vs, bow):
        out = []
        for p in vs:
            q = Vector((p.x, p.y, p.z * 0.82))
            out.append(q)
        return out
    ob = C.mesh_object(name, shape(v_closed, CLOSED_BOW), faces, "GUARD_CELLS", smooth=True)
    ob.shape_key_add(name="Basis")
    sk = ob.shape_key_add(name="Open")
    for i, p in enumerate(shape(v_open, OPEN_BOW)):
        sk.data[i].co = p
    C.assign(ob, m_gc)
    return ob


def chloroplasts_in_guard_cell(side, m_chl, name):
    """V2.4 (DA-01): the chloroplasts ride with their guard cell. Each one is placed relative to the
    cell's centre line and radius, so Basis = closed and the shape key "Open" = open, exactly like the
    guard cell itself; in every state they stay well inside the wall (checked in validate)."""
    n = 7
    jitter = [(RNG.uniform(-0.06, 0.06), RNG.uniform(-0.05, 0.05)) for _ in range(n)]
    blobs = []
    for k in range(n):
        bm = C.ellipsoid_bm((0.014, 0.02, 0.01), subdiv=2, noise=0.05, seed=k + (10 if side > 0 else 30))
        blobs.append(([v.co.copy() for v in bm.verts], [tuple(v.index for v in f.verts) for f in bm.faces]))
        bm.free()

    def placed(bow):
        parts = []
        for k, (local, faces) in enumerate(blobs):
            t = 0.18 + 0.64 * k / (n - 1)
            r = gc_radius(t)
            y = GC_LEN * math.cos(math.pi * t)
            cx = side * (bow * math.sin(math.pi * t) + pole_offset(t))
            # outer half of the cell (away from the pore), upper side (seen from above), inside the wall
            dx = side * r * (0.3 + jitter[k][0])
            dz = 0.82 * r * (0.3 + jitter[k][1])
            c = Vector((cx + dx, y, -0.006 * 0.82 + dz))
            parts.append(([p + c for p in local], faces, []))
        return parts

    ob = C.join_meshes(name, placed(CLOSED_BOW), "GUARD_CELLS")
    C.recalc_normals(ob)
    ob.shape_key_add(name="Basis")
    sk = ob.shape_key_add(name="Open")
    opened = [v for verts, _, _ in placed(OPEN_BOW) for v in verts]
    for i, p in enumerate(opened):
        sk.data[i].co = p
    C.assign(ob, m_chl)
    return ob


def small_stoma(tag, cx, cy, scale, rot, m_gc, root, m_cav):
    """A smaller, open stoma for context (static)."""
    parts = []
    for side in (-1, 1):
        pts = [Vector((p.x * scale, p.y * scale, p.z)) for p in guard_cell_points(side, OPEN_BOW * 0.9)]
        radii = [r * scale for r in guard_cell_radii()]
        verts, faces, flat = C.sweep_tube(pts, radii, sides=12)
        c, s = math.cos(rot), math.sin(rot)
        verts = [Vector((cx + v.x * c - v.y * s, cy + v.x * s + v.y * c, v.z + 0.004)) for v in verts]
        parts.append((verts, faces, flat))
    c, s = math.cos(rot), math.sin(rot)
    parts += pole_joint_parts(scale, lambda v: Vector((cx + v.x * c - v.y * s, cy + v.x * s + v.y * c, v.z + 0.004)))
    ob = C.join_meshes(f"Stoma_Context_{tag}", parts, "GUARD_CELLS")
    C.assign(ob, m_gc)
    C.tag(ob, "guard_cell", "Guard cells")
    C.set_parent(ob, root)
    # dark pore behind it
    bm = C.ellipsoid_bm((0.035 * scale / 0.6, 0.11 * scale / 0.6, 0.02), subdiv=2)
    verts = [Vector((cx + v.co.x, cy + v.co.y, v.co.z - 0.01)) for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    pore = C.mesh_object(f"Stoma_Context_{tag}_Pore", verts, faces, "EPIDERMIS")
    C.assign(pore, m_cav)
    C.tag(pore, "stoma_pore", "Pore")
    C.set_parent(pore, root)


def build():
    col, nrm = textures()
    m_epi = C.make_material("MAT_Epidermis", image=col, roughness=0.46, coat=0.3, normal_image=nrm, normal_strength=0.7)
    m_gc = C.make_material("MAT_Guard_Cell", color="#d6ecc0", roughness=0.3, coat=0.5, alpha=0.72)
    m_chl = C.make_material("MAT_Chloroplast_GC", color="#2f8a2c", roughness=0.5)
    m_cav = C.make_material("MAT_Air_Space_Dark", color="#0e1a10", roughness=0.9, double_sided=True)
    m_meso = C.make_material("MAT_Mesophyll_Deep", color="#2f6b2a", roughness=0.7)

    root = C.add_empty("Stoma", (0, 0, 0), "STOMA", size=0.3)
    C.tag(root, "stoma", "Stoma", asset="03_stoma")

    epidermis(root, m_epi)

    # the two guard cells of the hero stoma, with the pore between them
    gcs = []
    for side, nm in ((-1, "Guard_Cell_L"), (1, "Guard_Cell_R")):
        g = guard_cell(nm, side, m_gc)
        C.tag(g, "guard_cell", "Guard cell", morph="Open")
        C.set_parent(g, root)
        gcs.append(g)
        ch = chloroplasts_in_guard_cell(side, m_chl, nm + "_Chloroplasts")
        C.tag(ch, "guard_cell", "Guard cell", morph="Open")
        C.set_parent(ch, g)

    joint = C.join_meshes("Guard_Cell_Poles", pole_joint_parts(), "GUARD_CELLS")
    C.recalc_normals(joint)
    C.assign(joint, m_gc)
    C.tag(joint, "guard_cell", "Guard cells (joined at both ends)")
    C.set_parent(joint, root)

    # the pore: a dark lens between the guard cells' inner walls, opening with them
    def pore_ring(bow):
        pts = []
        for k in range(24):
            t = k / 23
            y = (GC_LEN * 0.82) * math.cos(math.pi * t)
            half = max(0.002, bow * math.sin(math.pi * t) + pole_offset(t) - gc_radius(t) * 0.98)
            pts.append((half, y))
        left = [(-x, y) for x, y in reversed(pts)]
        return pts + left
    closed, opened = pore_ring(CLOSED_BOW), pore_ring(OPEN_BOW)
    verts = [(x, y, -0.03) for x, y in closed] + [(0.0, 0.0, -0.06)]
    centre = len(verts) - 1
    faces = [(k, (k + 1) % len(closed), centre) for k in range(len(closed))]
    pore = C.mesh_object("Stoma_Pore", verts, faces, "EPIDERMIS", smooth=True)
    pore.shape_key_add(name="Basis")
    sk = pore.shape_key_add(name="Open")
    for k, (x, y) in enumerate(opened):
        sk.data[k].co = (x, y, -0.03)
    sk.data[centre].co = (0.0, 0.0, -0.08)
    C.assign(pore, m_cav)
    C.tag(pore, "stoma_pore", "Stomatal pore", morph="Open", open_surface=1)
    C.set_parent(pore, root)

    for tag, cx, cy, sc, rot in (("A", -0.46, 0.40, 0.55, 0.6), ("B", 0.44, -0.42, 0.5, -0.4)):
        small_stoma(tag, cx, cy, sc, rot, m_gc, root, m_cav)

    anchors = {
        "ANCHOR_Stoma_Pore": (0.0, 0.0, 0.02),
        "ANCHOR_Stoma_Air_Space": (0.0, 0.0, -0.08),
        "ANCHOR_Guard_Cell_L": (-(OPEN_BOW + GC_R), 0.0, 0.03),
        "ANCHOR_Guard_Cell_R": (OPEN_BOW + GC_R, 0.0, 0.03),
        "ANCHOR_Epidermis": (0.4, 0.15, 0.03),
        "ANCHOR_Stoma_Above": (0.0, 0.0, 0.35),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, collection="STOMA")
    # the way out: air space → pore → air above the leaf
    for i in range(10):
        t = i / 9
        C.add_anchor(f"PATH_Stoma_Out_{i:02d}", (0.0, 0.0, -0.2 + t * 0.62), parent=root, size=0.01,
                     display="PLAIN_AXES", collection="STOMA")

    cams = {
        "CAM_Stoma_Surface": ((0.0, -1.55, 1.25), (0.0, 0.05, 0.0)),
        "CAM_Stoma": ((0.0, -0.78, 0.62), (0.0, 0.0, -0.02)),
        "CAM_Stoma_Top": ((0.02, -0.08, 1.05), (0.0, 0.0, 0.0)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("stoma built")
    return {"objects": len(C.descendants(root))}
