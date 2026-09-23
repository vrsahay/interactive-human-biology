"""
Leaf tissue + simplified plant cell  →  plant-cell.glb

Lesson need (Process 3, storage in cellular vacuoles):
  WHOLE PLANT → LEAF → TISSUE → CELL → VACUOLE, then back out.

* A small block of LEAF TISSUE seen in section: a flat top and bottom skin
  layer, tall column-shaped cells under the top, rounder loosely packed cells
  below. It reads as "a leaf is made of many cells" without naming layers
  (layer names are not part of NCERT 5.5.2).
* One HERO CELL at the front is cut open so the learner can see inside:
  cell wall (cell boundary), cytoplasm, a LARGE VACUOLE, a nucleus and a few
  chloroplasts (they link back to photosynthesis/oxygen in Process 1).
* The vacuole is its own translucent volume so the runtime can move wastes
  into it and show them STORED.

Coordinates: hero cell centred on the origin, front of the tissue faces −Y.
"""

import math
import random

import bmesh
from mathutils import Vector

import common as C

RNG = random.Random(5502)

CELL = Vector((1.0, 1.0, 2.1))     # palisade-like column cell (x, y, z)
WALL = 0.07
CUT_WALL_Y = -0.2                  # the hero cell's front is removed in front of this plane
CUT_CYTO_Y = -0.16
PITCH_X = 1.06
VAC_C = Vector((0.04, 0.03, -0.04))
VAC_R = Vector((0.34, 0.33, 0.8))
NUC_C = Vector((-0.27, -0.1, 0.72))
NUC_R = 0.14


def box_parts(size, radius, offset, segments=2):
    bm = C.rounded_box_bm(size, radius, segments=segments)
    verts = [v.co + offset for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def blob_parts(radii, offset, seed, subdiv=2, noise=0.05):
    bm = C.ellipsoid_bm(radii, subdiv=subdiv, noise=noise, seed=seed)
    verts = [v.co + offset for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return verts, faces, []


def cutter(name, y_max, size=6.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size, v.co.y * size + y_max - size / 2, v.co.z * size))
    ob = C.bmesh_to_object(name, bm, "QA", smooth=False)
    ob.hide_render = True
    return ob


def remove_helper(ob):
    me = ob.data
    C.bpy.data.objects.remove(ob, do_unlink=True)
    C.bpy.data.meshes.remove(me)


def build():
    m_epi = C.make_material("MAT_Leaf_Skin", color="#cfe9b4", roughness=0.45)
    m_col = C.make_material("MAT_Leaf_Cells_Column", color="#8fca6f", roughness=0.55)
    m_round = C.make_material("MAT_Leaf_Cells_Round", color="#a8d88a", roughness=0.6)
    m_wall = C.make_material("MAT_Cell_Wall", color="#4f9a3c", roughness=0.4)
    m_cyto = C.make_material("MAT_Cytoplasm", color="#e4f2cf", roughness=0.7)
    m_vac = C.make_material("MAT_Vacuole", color="#63bddc", roughness=0.2, alpha=0.5)
    m_nuc = C.make_material("MAT_Nucleus", color="#6a7cb8", roughness=0.45)
    m_chl = C.make_material("MAT_Chloroplast", color="#3f9b3a", roughness=0.5)

    root = C.add_empty("PlantCell", (0, 0, 0), "CELL", size=0.5)
    C.tag(root, "cell", "Plant cell", asset="plant-cell")

    # ---------------- leaf tissue ----------------
    top_z = CELL.z / 2 + 0.06
    columns, skin_top, skin_bottom, rounds = [], [], [], []
    for row, y0 in enumerate((0.0, 1.06)):
        for i in range(-4, 5):
            x = i * PITCH_X + (0.5 if row else 0.0)
            if row == 0 and i == 0:
                continue  # hero cell slot
            size = Vector((CELL.x + RNG.uniform(-0.06, 0.02), CELL.y + RNG.uniform(-0.05, 0.02),
                           CELL.z + RNG.uniform(-0.12, 0.04)))
            columns.append(box_parts(size, 0.17, Vector((x, y0 + RNG.uniform(-0.02, 0.02), RNG.uniform(-0.04, 0.04)))))
        for i in range(-5, 5):
            x = (i + 0.5) * PITCH_X + (0.5 if row else 0.0)
            skin_top.append(box_parts(Vector((1.02, 0.98, 0.42)), 0.12, Vector((x, y0, top_z + 0.24))))
            skin_bottom.append(box_parts(Vector((1.02, 0.98, 0.4)), 0.12, Vector((x, y0, -CELL.z / 2 - 1.95))))
    # rounder, loosely packed cells with air spaces between them
    for row, y0 in enumerate((0.0, 1.06)):
        for i in range(-5, 5):
            for k in range(2):
                x = (i + 0.5 * k + (0.25 if row else 0.0)) * PITCH_X + RNG.uniform(-0.1, 0.1)
                z = -CELL.z / 2 - 0.5 - k * 0.78 + RNG.uniform(-0.08, 0.08)
                r = Vector((RNG.uniform(0.36, 0.44), RNG.uniform(0.36, 0.44), RNG.uniform(0.3, 0.38)))
                rounds.append(blob_parts(r, Vector((x, y0 + RNG.uniform(-0.05, 0.05), z)), seed=len(rounds) + 7))

    for name, parts, mat, label in (
        ("Tissue_Column_Cells", columns, m_col, "Leaf tissue (many cells)"),
        ("Tissue_Round_Cells", rounds, m_round, "Leaf tissue (many cells)"),
        ("Tissue_Skin_Top", skin_top, m_epi, "Leaf surface"),
        ("Tissue_Skin_Bottom", skin_bottom, m_epi, "Leaf surface"),
    ):
        ob = C.join_meshes(name, parts, "CELL")
        C.recalc_normals(ob)
        C.assign(ob, mat)
        C.tag(ob, "tissue", label)
        C.set_parent(ob, root)

    # ---------------- hero cell (cutaway) ----------------
    hero = C.add_empty("Cell_Hero", (0, 0, 0), "CELL", size=0.4)
    C.tag(hero, "cell", "Plant cell")
    C.set_parent(hero, root)

    wall = C.bmesh_to_object("Cell_Wall", C.rounded_box_bm(CELL, 0.2, segments=3), "CELL_BOUNDARY")
    inner = C.bmesh_to_object("QA_Wall_Inner", C.rounded_box_bm(CELL - Vector((2 * WALL,) * 3), 0.15, 3), "QA")
    cut_w = cutter("QA_Cutter_Wall", CUT_WALL_Y)
    C.boolean_cut(wall, inner)
    C.boolean_cut(wall, cut_w)
    C.assign(wall, m_wall)
    C.tag(wall, "cell_wall", "Cell wall (cell boundary)")
    C.set_parent(wall, hero)

    cyto = C.bmesh_to_object("Cytoplasm", C.rounded_box_bm(CELL - Vector((2 * WALL + 0.014,) * 3), 0.14, 3),
                             "CYTOPLASM")
    cut_c = cutter("QA_Cutter_Cyto", CUT_CYTO_Y)
    C.boolean_cut(cyto, cut_c)
    C.assign(cyto, m_cyto)
    C.tag(cyto, "cytoplasm", "Cytoplasm")
    C.set_parent(cyto, hero)
    for helper in (inner, cut_w, cut_c):
        remove_helper(helper)

    vac = C.bmesh_to_object("Vacuole", C.ellipsoid_bm(tuple(VAC_R), subdiv=4, noise=0.025, seed=3), "VACUOLE")
    vac.location = VAC_C
    C.apply_transform(vac)
    C.assign(vac, m_vac)
    # geometry facts the runtime uses to keep stored wastes inside the visible part of the vacuole
    C.tag(vac, "vacuole", "Large vacuole",
          center_three=[VAC_C.x, VAC_C.z, -VAC_C.y], radii_three=[VAC_R.x, VAC_R.z, VAC_R.y],
          cut_z_three=-CUT_CYTO_Y)
    C.set_parent(vac, hero)

    nuc = C.bmesh_to_object("Nucleus", C.ellipsoid_bm((NUC_R, NUC_R * 0.95, NUC_R), subdiv=3, noise=0.02, seed=9),
                            "NUCLEUS")
    nuc.location = NUC_C
    C.apply_transform(nuc)
    C.assign(nuc, m_nuc)
    C.tag(nuc, "nucleus", "Nucleus")
    C.set_parent(nuc, hero)

    # chloroplasts: small discs along the walls, clear of the vacuole and nucleus
    chl_parts = []
    spots = []
    for z in (-0.85, -0.55, -0.25, 0.05, 0.35):
        spots.append(Vector((-0.39, CUT_CYTO_Y - 0.01, z)))
        spots.append(Vector((0.39, CUT_CYTO_Y - 0.01, z + 0.12)))
    spots += [Vector((0.2, CUT_CYTO_Y - 0.01, 0.88)), Vector((0.02, CUT_CYTO_Y - 0.01, -0.95)),
              Vector((0.25, CUT_CYTO_Y - 0.01, -0.93))]
    for i, p in enumerate(spots):
        chl_parts.append(blob_parts((0.07, 0.045, 0.11), p + Vector((0, 0.015, 0)), seed=40 + i, subdiv=2, noise=0.02))
    chl = C.join_meshes("Chloroplasts", chl_parts, "CYTOPLASM")
    C.recalc_normals(chl)
    C.assign(chl, m_chl)
    C.tag(chl, "chloroplast", "Chloroplasts")
    C.set_parent(chl, hero)

    # ---------------- anchors & camera references ----------------
    anchors = {
        "ANCHOR_Vacuole": VAC_C,
        "ANCHOR_Vacuole_Front": Vector((VAC_C.x, CUT_CYTO_Y - 0.12, VAC_C.z)),
        "ANCHOR_Nucleus": NUC_C,
        "ANCHOR_Cell_Wall": Vector((0.47, CUT_WALL_Y, 0.9)),
        "ANCHOR_Cytoplasm": Vector((-0.34, CUT_CYTO_Y, -0.72)),
        "ANCHOR_Cyto_Waste_Zone": Vector((-0.3, CUT_CYTO_Y - 0.03, -0.45)),
        "ANCHOR_Chloroplast": spots[3],
        "ANCHOR_Tissue_Center": Vector((0.0, 0.5, -0.6)),
        "ANCHOR_Tissue_Top": Vector((0.0, -0.3, top_z + 0.3)),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, size=0.05)

    cams = {
        "CAM_Tissue_Far": ((0.8, -19.0, 1.4), (0.0, 0.4, -0.6)),
        "CAM_Tissue_Wide": ((2.2, -10.5, 1.6), (0.0, 0.3, -0.5)),
        "CAM_Cell": ((1.2, -4.6, 0.8), (0.0, -0.1, -0.02)),
        "CAM_Vacuole": ((0.6, -2.3, 0.25), (0.04, -0.2, -0.05)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)

    C.log("cell built")
    return {"objects": len(C.descendants(root)), "chloroplasts": len(spots)}
