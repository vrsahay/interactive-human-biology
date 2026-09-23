"""
08_chloroplast.glb: one chloroplast, cut open (subcellular scale).

Source: Class 9 Ch. 2 p. 18: chloroplasts are double-membrane-bound organelles; inside is
a semi-fluid substance, the stroma; within the stroma are disc-shaped membrane structures
that contain chlorophyll, which absorbs sunlight. Class X p. 82: chloroplasts contain
chlorophyll; p. 81: photosynthesis makes food from carbon dioxide and water in sunlight;
p. 98: oxygen is generated during photosynthesis.

Modelled: outer and inner membrane (the double membrane, visible at the cut edge), stroma
(translucent), stacks of disc-shaped membranes joined by thin connecting sheets. The front
half is cut away. Terms "thylakoid" and "granum" are NOT used on the learner surface
(not in the source); the lesson says "stacks of disc-shaped membranes".

Units: about 2 long (X). Cut face at y = 0 faces the camera (-Y).
"""

import math
import random

import bmesh
from mathutils import Vector

import common as C

RNG = random.Random(18)
R = Vector((1.0, 0.56, 0.46))


def remove_helper(ob):
    me = ob.data
    C.bpy.data.objects.remove(ob, do_unlink=True)
    C.bpy.data.meshes.remove(me)


def cutter(name, y_max=0.0, size=6.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size, v.co.y * size + y_max - size / 2, v.co.z * size))
    return C.bmesh_to_object(name, bm, "QA", smooth=False)


def half_shell(name, outer, inner, coll):
    ob = C.bmesh_to_object(name, C.ellipsoid_bm(tuple(outer), subdiv=4, noise=0.01, seed=2), coll)
    hole = C.bmesh_to_object(name + "_QA_In", C.ellipsoid_bm(tuple(inner), subdiv=4, noise=0.01, seed=2), "QA")
    C.boolean_cut(ob, hole)
    remove_helper(hole)
    cut = cutter(name + "_QA_Cut", 0.019)   # off the equator vertex ring (a coplanar cut leaves stray caps)
    C.boolean_cut(ob, cut)
    remove_helper(cut)
    return ob


def disc(r, h, centre, tilt, sides=20):
    """A flattened disc (one membrane sac of a stack)."""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=sides, radius1=r, radius2=r, depth=h)
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=h * 0.45, segments=2, affect="EDGES", clamp_overlap=True)
    verts = []
    ct, st = math.cos(tilt), math.sin(tilt)
    for v in bm.verts:
        x, y, z = v.co
        verts.append(Vector((x * ct - z * st, y, x * st + z * ct)) + centre)
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def build():
    m_out = C.make_material("MAT_CP_Outer_Membrane", color="#7fcf6d", roughness=0.3, coat=0.5)
    m_in = C.make_material("MAT_CP_Inner_Membrane", color="#5fb050", roughness=0.35, coat=0.3)
    m_stroma = C.make_material("MAT_CP_Stroma", color="#b9dd8e", roughness=0.7, double_sided=True)
    m_disc = C.make_material("MAT_CP_Discs", color="#1f7a26", roughness=0.35, coat=0.4)
    m_lam = C.make_material("MAT_CP_Connecting_Sheets", color="#3b9a3a", roughness=0.45)

    root = C.add_empty("Chloroplast", (0, 0, 0), "CHLOROPLAST", size=0.4)
    C.tag(root, "chloroplast", "Chloroplast", asset="08_chloroplast")

    outer = half_shell("CP_Outer_Membrane", R, R - Vector((0.03,) * 3), "CHLOROPLAST")
    C.assign(outer, m_out)
    C.tag(outer, "chloroplast_membrane", "Outer membrane")
    C.set_parent(outer, root)
    inner = half_shell("CP_Inner_Membrane", R - Vector((0.06,) * 3), R - Vector((0.085,) * 3), "CHLOROPLAST")
    C.assign(inner, m_in)
    C.tag(inner, "chloroplast_membrane", "Inner membrane")
    C.set_parent(inner, root)

    # stroma: the inside of the chloroplast, an open bowl behind the discs (no cap, so nothing hides them)
    bm = C.ellipsoid_bm(tuple(R - Vector((0.09,) * 3)), subdiv=4, noise=0.01, seed=2)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < 0.019], context="VERTS")
    bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    stroma = C.bmesh_to_object("CP_Stroma", bm, "CHLOROPLAST")
    C.assign(stroma, m_stroma)
    C.tag(stroma, "stroma", "Stroma", open_surface=1)
    C.set_parent(stroma, root)

    # stacks of discs, standing in the stroma just behind the cut face
    stacks, sheets = [], []
    centres = []
    for i in range(13):
        for _ in range(40):
            x = RNG.uniform(-0.72, 0.72)
            z = RNG.uniform(-0.26, 0.26)
            if (x / 0.78) ** 2 + (z / 0.33) ** 2 > 1:
                continue
            if all(abs(x - cx) > 0.2 or abs(z - cz) > 0.24 for cx, cz, _ in centres):
                centres.append((x, z, RNG.uniform(0.06, 0.12)))
                break
    for (x, z, y) in centres:
        n = RNG.randint(6, 10)
        r = RNG.uniform(0.075, 0.095)
        h = 0.016
        tilt = RNG.uniform(-0.15, 0.15)
        z0 = z - (n - 1) * (h + 0.006) / 2
        for k in range(n):
            stacks.append(disc(r, h, Vector((x, y + 0.04, z0 + k * (h + 0.006))), tilt))
    # thin connecting sheets between neighbouring stacks
    for i, (x, z, y) in enumerate(centres):
        others = sorted(centres, key=lambda c: (c[0] - x) ** 2 + (c[1] - z) ** 2)[1:3]
        for (x2, z2, y2) in others:
            mid = Vector(((x + x2) / 2, (y + y2) / 2 + 0.02, (z + z2) / 2))
            length = math.hypot(x2 - x, z2 - z)
            ang = math.atan2(z2 - z, x2 - x)
            bm = C.rounded_box_bm(Vector((length, 0.1, 0.008)), 0.003, 1)
            verts = [Vector((v.co.x * math.cos(ang) - v.co.z * math.sin(ang), v.co.y, v.co.x * math.sin(ang) + v.co.z * math.cos(ang))) + mid for v in bm.verts]
            faces = [tuple(v.index for v in f.verts) for f in bm.faces]
            bm.free()
            sheets.append((verts, faces, []))
    ob = C.join_meshes("CP_Disc_Stacks", stacks, "CHLOROPLAST")
    C.recalc_normals(ob)
    C.assign(ob, m_disc)
    C.tag(ob, "thylakoid", "Stacks of disc-shaped membranes (contain chlorophyll)")
    C.set_parent(ob, root)
    ob = C.join_meshes("CP_Connecting_Sheets", sheets, "CHLOROPLAST")
    C.recalc_normals(ob)
    C.assign(ob, m_lam)
    C.tag(ob, "thylakoid", "Stacks of disc-shaped membranes (contain chlorophyll)")
    C.set_parent(ob, root)

    cx, cz, cy = centres[len(centres) // 2]
    anchors = {
        "ANCHOR_CP_Outer_Membrane": (0.55, 0.0, R.z * 0.83),
        "ANCHOR_CP_Inner_Membrane": (-0.6, 0.0, -(R.z - 0.07) * 0.78),
        "ANCHOR_CP_Stroma": (-0.45, 0.02, 0.18),
        "ANCHOR_CP_Discs": (cx, 0.0, cz),
        "ANCHOR_CP_Surface": (0.2, -0.05, R.z + 0.02),
        "ANCHOR_CP_Out": (0.35, -0.3, R.z + 0.55),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, collection="CHLOROPLAST")
    cams = {
        "CAM_Chloroplast": ((0.25, -3.4, 0.55), (0.0, 0.1, 0.0)),
        "CAM_Chloroplast_Close": ((cx + 0.2, -1.3, cz + 0.2), (cx, 0.05, cz)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("chloroplast built", len(centres), "stacks")
    return {"objects": len(C.descendants(root)), "stacks": len(centres)}
