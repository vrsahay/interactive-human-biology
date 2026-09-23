"""
06_plant_cell.glb: one leaf cell, cut open (micro scale). Includes the vacuole (the brief's 07).

Source: Class 9 Ch. 2: cell wall, the outer covering (p. 13); cell membrane (pp. 11-14);
jelly-like cytoplasm and a prominent nucleus (p. 14); chloroplasts (p. 18); one large
central vacuole surrounded by a single selectively permeable membrane, filled with cell sap,
storing water, minerals, sugars and waste material (p. 19). Class X p. 98: many plant waste
products are stored in cellular vacuoles.

Structures, and whether the lesson names them:
  cell wall (named) · cell membrane (named) · cytoplasm (named) · nucleus (named, in Explore)
  · nucleolus (shown, not named) · chloroplasts (named) · central vacuole (named) and its
  membrane (named as "the vacuole's membrane"; the term "tonoplast" is not in the source).
Neighbouring cells are ghosted for context. Mitochondria and other organelles are left out
(not needed for this lesson; documented simplification).

The layout keeps V1's geometry contract (vacuole centre and radii extras, anchors), so the
runtime's storage animation works unchanged. Front of the cell faces -Y.
"""

import math
import random

import bmesh
import numpy as np
from mathutils import Vector

import common as C

RNG = random.Random(5519)

CELL = Vector((1.0, 1.0, 2.1))
WALL = 0.07
MEMBRANE = 0.018
CUT_WALL_Y = -0.2
CUT_CYTO_Y = -0.16
VAC_C = Vector((0.04, 0.03, -0.04))
VAC_R = Vector((0.34, 0.33, 0.8))
NUC_C = Vector((-0.27, -0.1, 0.72))
NUC_R = 0.14


def part(bm, offset=Vector()):
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


def shell(name, outer, inner, radius, coll):
    """A rounded-box shell: outer box minus inner box."""
    ob = C.bmesh_to_object(name, C.rounded_box_bm(outer, radius, segments=3), coll)
    hole = C.bmesh_to_object(name + "_QA_Inner", C.rounded_box_bm(inner, max(0.02, radius - (outer.x - inner.x) / 2), 3), "QA")
    C.boolean_cut(ob, hole)
    remove_helper(hole)
    return ob


def textures():
    n = 512
    # cellulose wall: faint fibrous grain
    g = C.value_noise(n, n, 6, 11, octaves=4)
    fib = 0.5 + 0.5 * np.sin(np.linspace(0, 60 * np.pi, n)[None, :] + g * 8)
    wall_h = fib * 0.35 + C.value_noise(n, n, 30, 12, octaves=3) * 0.2
    # V2.1: cellulose is colourless; drawn pale cream (not green, which belongs to the chloroplasts)
    col = np.stack([0.84 + g * 0.06, 0.82 + g * 0.06, 0.68 + g * 0.05], axis=-1)
    # cytoplasm: fine granules
    gran = C.value_noise(n, n, 64, 13, octaves=2)
    return (C.save_texture("tex_cell_wall", col), C.save_data_texture("tex_cell_wall_n", C.normal_from_height(wall_h, 2.5)),
            C.save_data_texture("tex_cytoplasm_n", C.normal_from_height(gran, 3.0)))


def build():
    wall_col, wall_n, cyto_n = textures()
    m_wall = C.make_material("MAT_Cell_Wall", image=wall_col, roughness=0.45, normal_image=wall_n, normal_strength=0.6)
    m_mem = C.make_material("MAT_Cell_Membrane", color="#e6d98a", roughness=0.35, coat=0.3)
    m_cyto = C.make_material("MAT_Cytoplasm", color="#e8f2d2", roughness=0.6, alpha=0.62, normal_image=cyto_n, normal_strength=0.5)
    m_sap = C.make_material("MAT_Cell_Sap", color="#7cc6e6", roughness=0.1, alpha=0.38)
    m_vmem = C.make_material("MAT_Vacuole_Membrane", color="#a9dcf2", roughness=0.15, coat=0.6, alpha=0.5)
    m_nuc = C.make_material("MAT_Nucleus", color="#6f79b8", roughness=0.45, coat=0.2)
    m_nol = C.make_material("MAT_Nucleolus", color="#3c3f86", roughness=0.5)
    m_chl = C.make_material("MAT_Chloroplast", color="#2f8f33", roughness=0.4, coat=0.3)
    m_ghost = C.make_material("MAT_Neighbour_Cell", color="#8cc27a", roughness=0.5, alpha=0.35)

    root = C.add_empty("PlantCell", (0, 0, 0), "CELL", size=0.5)
    C.tag(root, "cell", "Plant cell", asset="06_plant_cell")

    # neighbouring cells, ghosted: a leaf is many cells packed together
    parts = []
    for dx, dy in ((-1.06, 0.0), (1.06, 0.0), (-0.53, 1.06), (0.53, 1.06), (0.0, 1.06)):
        if dx == 0.0 and dy == 1.06:
            continue
        size = Vector((CELL.x - 0.04, CELL.y - 0.04, CELL.z - RNG.uniform(0.0, 0.15)))
        parts.append(part(C.rounded_box_bm(size, 0.2, 3), Vector((dx, dy, RNG.uniform(-0.05, 0.05)))))
    ghost = C.join_meshes("Neighbour_Cells", parts, "CELL")
    C.recalc_normals(ghost)
    C.assign(ghost, m_ghost)
    C.tag(ghost, "tissue", "Neighbouring cells")
    C.set_parent(ghost, root)

    hero = C.add_empty("Cell_Hero", (0, 0, 0), "CELL", size=0.4)
    C.tag(hero, "cell", "Plant cell")
    C.set_parent(hero, root)

    # cell wall (cut open at the front)
    wall = shell("Cell_Wall", CELL, CELL - Vector((2 * WALL,) * 3), 0.2, "CELL_BOUNDARY")
    cut = cutter("QA_Cutter_Wall", CUT_WALL_Y)
    C.boolean_cut(wall, cut)
    remove_helper(cut)
    C.assign(wall, m_wall)
    C.tag(wall, "cell_wall", "Cell wall")
    C.set_parent(wall, hero)

    # cell membrane: a thin layer pressed against the inside of the wall
    inner = CELL - Vector((2 * WALL,) * 3)
    mem = shell("Cell_Membrane", inner, inner - Vector((2 * MEMBRANE,) * 3), 0.15, "CELL_BOUNDARY")
    cut = cutter("QA_Cutter_Membrane", CUT_WALL_Y + 0.02)
    C.boolean_cut(mem, cut)
    remove_helper(cut)
    C.assign(mem, m_mem)
    C.tag(mem, "cell_membrane", "Cell membrane")
    C.set_parent(mem, hero)

    # cytoplasm (translucent, cut a little further back)
    cyto = C.bmesh_to_object("Cytoplasm", C.rounded_box_bm(inner - Vector((2 * MEMBRANE + 0.004,) * 3), 0.13, 3), "CYTOPLASM")
    cut = cutter("QA_Cutter_Cyto", CUT_CYTO_Y)
    C.boolean_cut(cyto, cut)
    remove_helper(cut)
    C.assign(cyto, m_cyto)
    C.tag(cyto, "cytoplasm", "Cytoplasm")
    C.set_parent(cyto, hero)

    # central vacuole: cell sap, and its own membrane around it
    vac = C.bmesh_to_object("Vacuole", C.ellipsoid_bm(tuple(VAC_R), subdiv=4, noise=0.025, seed=3), "VACUOLE")
    vac.location = VAC_C
    C.apply_transform(vac)
    C.assign(vac, m_sap)
    C.tag(vac, "vacuole", "Central vacuole (cell sap)",
          center_three=[VAC_C.x, VAC_C.z, -VAC_C.y], radii_three=[VAC_R.x, VAC_R.z, VAC_R.y],
          cut_z_three=-CUT_CYTO_Y)
    C.set_parent(vac, hero)
    vm = C.bmesh_to_object("Vacuole_Membrane", C.ellipsoid_bm(tuple(VAC_R + Vector((0.014,) * 3)), subdiv=4, noise=0.025, seed=3), "VACUOLE")
    vm.location = VAC_C
    C.apply_transform(vm)
    C.assign(vm, m_vmem)
    C.tag(vm, "vacuole_membrane", "The vacuole's membrane")
    C.set_parent(vm, hero)

    # nucleus with a nucleolus
    nuc = C.bmesh_to_object("Nucleus", C.ellipsoid_bm((NUC_R, NUC_R * 0.95, NUC_R), subdiv=3, noise=0.02, seed=9), "NUCLEUS")
    nuc.location = NUC_C
    C.apply_transform(nuc)
    C.assign(nuc, m_nuc)
    C.tag(nuc, "nucleus", "Nucleus")
    C.set_parent(nuc, hero)
    nol = C.bmesh_to_object("Nucleolus", C.ellipsoid_bm((0.05, 0.05, 0.05), subdiv=2, noise=0.05, seed=10), "NUCLEUS")
    nol.location = NUC_C + Vector((0.03, -0.1, 0.02))
    C.apply_transform(nol)
    C.assign(nol, m_nol)
    C.tag(nol, "nucleus", "Nucleus")
    C.set_parent(nol, hero)

    # chloroplasts: flattened lenses lining the side and back walls, clear of vacuole and nucleus
    spots = []
    half = inner / 2 - Vector((MEMBRANE + 0.06,) * 3)
    for k in range(9):
        z = -0.88 + k * 0.21
        spots.append((Vector((-half.x, RNG.uniform(-0.1, 0.25), z)), "x"))
        spots.append((Vector((half.x, RNG.uniform(-0.1, 0.25), z + 0.1)), "x"))
    # V2.1: no chloroplasts on the back wall. They sat right behind the translucent vacuole and read
    # as if stored INSIDE it; chloroplasts belong to the cytoplasm, the vacuole holds the stored wastes.
    spots.append((Vector((0.2, CUT_CYTO_Y + 0.02, 0.9)), "y"))
    spots.append((Vector((0.05, CUT_CYTO_Y + 0.02, -0.95)), "y"))
    parts, first_front = [], None
    for i, (p, axis) in enumerate(spots):
        if (p - NUC_C).length < NUC_R + 0.12:
            continue
        radii = (0.03, 0.075, 0.11) if axis == "x" else (0.075, 0.03, 0.11)
        parts.append(part(C.ellipsoid_bm(radii, subdiv=2, noise=0.02, seed=40 + i), p))
        if axis == "y" and first_front is None and p.y < 0:
            first_front = p
    chl = C.join_meshes("Chloroplasts", parts, "CYTOPLASM")
    C.recalc_normals(chl)
    C.assign(chl, m_chl)
    C.tag(chl, "chloroplast", "Chloroplasts")
    C.set_parent(chl, hero)

    anchors = {
        "ANCHOR_Vacuole": VAC_C,
        "ANCHOR_Vacuole_Front": Vector((VAC_C.x, CUT_CYTO_Y - 0.12, VAC_C.z)),
        "ANCHOR_Vacuole_Membrane": Vector((VAC_C.x + VAC_R.x * 0.95, CUT_CYTO_Y - 0.05, VAC_C.z + 0.3)),
        "ANCHOR_Nucleus": NUC_C,
        "ANCHOR_Cell_Wall": Vector((0.47, CUT_WALL_Y, 0.9)),
        "ANCHOR_Cell_Membrane": Vector((-0.42, CUT_WALL_Y + 0.02, 0.55)),
        "ANCHOR_Cytoplasm": Vector((-0.34, CUT_CYTO_Y, -0.72)),
        "ANCHOR_Cyto_Waste_Zone": Vector((-0.3, CUT_CYTO_Y - 0.03, -0.45)),
        "ANCHOR_Chloroplast": first_front or Vector((0.2, CUT_CYTO_Y, 0.9)),
    }
    for name, loc in anchors.items():
        C.add_anchor(name, loc, parent=root, size=0.05)

    cams = {
        "CAM_Cell_Far": ((0.5, -8.5, 0.5), (0.0, 0.0, 0.0)),
        "CAM_Cell": ((1.2, -4.6, 0.8), (0.0, -0.1, -0.02)),
        "CAM_Vacuole": ((0.6, -2.3, 0.25), (0.04, -0.2, -0.05)),
    }
    for name, (loc, tgt) in cams.items():
        C.add_camera_ref(name, loc, tgt, parent=root)
    C.log("cell built")
    return {"objects": len(C.descendants(root))}
