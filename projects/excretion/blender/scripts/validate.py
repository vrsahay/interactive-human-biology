"""
Geometry / naming / placement validation for all exported assets.

Checks
------
* naming: no default Blender names (Cube.001, Sphere.014 …), no ".###" suffixes
* hierarchy: every exported object descends from its asset root
* geometry: loose verts, degenerate faces, non-manifold edges on solids
* materials: every mesh has materials, no empty slots
* placement ("no floating objects / no clipping" checks that matter for the lesson):
    - stem base is embedded in the soil
    - roots stay inside the soil volume and in front of the cut plane
    - every leaf petiole starts on a stem/branch
    - vacuole & nucleus sit inside the hero cell
    - resin deposits sit inside the old-xylem ring
Writes docs/qa/blender-validation.json
"""

import json
import math
import os
import re

import bmesh
import bpy
from mathutils import Vector
from mathutils.bvhtree import BVHTree

import common as C
import layout as L

# V2: reusable scale-specific production GLBs (numbering follows docs/v2-plan.md)
ASSET_ROOTS = {
    "Plant": "01_plant.glb",
    "Leaf": "02_leaf.glb",
    "Stoma": "03_stoma.glb",
    "LeafInternal": "05_leaf_internal.glb",
    "PlantCell": "06_plant_cell.glb",
    "Chloroplast": "08_chloroplast.glb",
    "StemSection": "10_stem_cross_section.glb",
    "Xylem": "11_xylem.glb",
    "Root": "14_root.glb",
    "RootHairs": "15_root_hairs.glb",
    "RootSoil": "16_soil.glb",
    "WasteVisuals": "17_waste_visuals.glb",
}

# every mesh must live in the collection that matches its lesson part
PART_COLLECTION = {
    # whole plant
    "stem": {"PLANT_STEM"}, "branch": {"BRANCHES"}, "leaf": {"LEAVES", "LEAF_BLADE"}, "roots": {"ROOTS"},
    "soil": {"SOIL"}, "base": {"SOIL"},
    # leaf, stoma, leaf interior
    "leaf_vein": {"LEAF_BLADE", "LEAF_INTERNAL"}, "leaf_stalk": {"LEAF_BLADE"},
    "epidermis": {"EPIDERMIS", "LEAF_INTERNAL"}, "cuticle": {"EPIDERMIS", "LEAF_INTERNAL"},
    "guard_cell": {"GUARD_CELLS", "LEAF_INTERNAL"}, "stoma_pore": {"EPIDERMIS", "LEAF_INTERNAL"},
    "air_space": {"EPIDERMIS", "LEAF_INTERNAL"}, "mesophyll": {"EPIDERMIS", "LEAF_INTERNAL"},
    "palisade": {"LEAF_INTERNAL"}, "vein_xylem": {"LEAF_INTERNAL"}, "vein_phloem": {"LEAF_INTERNAL"},
    # cell, vacuole, chloroplast
    "tissue": {"CELL"}, "cell_wall": {"CELL_BOUNDARY"}, "cell_membrane": {"CELL_BOUNDARY"},
    "cytoplasm": {"CYTOPLASM"}, "chloroplast": {"CYTOPLASM", "CHLOROPLAST", "LEAF_INTERNAL", "GUARD_CELLS"},
    "vacuole": {"VACUOLE"}, "vacuole_membrane": {"VACUOLE"}, "nucleus": {"NUCLEUS"},
    "chloroplast_membrane": {"CHLOROPLAST"}, "stroma": {"CHLOROPLAST"}, "thylakoid": {"CHLOROPLAST"},
    # stem, xylem
    "bark": {"STEM_CROSS_SECTION"}, "phloem": {"STEM_CROSS_SECTION"}, "pith": {"STEM_CROSS_SECTION"},
    "stem_cover": {"STEM_CROSS_SECTION"}, "xylem": {"XYLEM", "STEM_CROSS_SECTION"}, "old_xylem": {"XYLEM", "STEM_CROSS_SECTION"},
    "vessel": {"XYLEM"}, "tracheid": {"XYLEM"}, "xylem_parenchyma": {"XYLEM"}, "xylem_fibre": {"XYLEM"},
    # roots
    "root_tip": {"ROOT_TIP"}, "root_cap": {"ROOT_TIP"}, "root_hair": {"ROOT_HAIRS"}, "root_epidermis": {"ROOT_HAIRS", "ROOT_TIP"}, "root_cortex": {"ROOT_TIP", "ROOT_HAIRS"}, "root_xylem": {"ROOT_TIP", "XYLEM"},
    "soil_particle": {"SOIL", "ROOT_HAIRS"}, "soil_water": {"SOIL", "ROOT_HAIRS"},
    # symbols
    "oxygen": {"OXYGEN"}, "carbon_dioxide": {"CARBON_DIOXIDE"}, "water": {"WATER"}, "water_vapour": {"WATER"},
    "waste": {"STORED_WASTE"}, "resin": {"RESIN_GUM", "XYLEM"}, "soil_waste": {"SOIL_EXCRETION"},
}

DEFAULT_NAME = re.compile(r"^(Cube|Sphere|Cylinder|Plane|Icosphere|Circle|Cone|Torus|Empty|Camera|Light|Mesh|"
                          r"Object|Suzanne|Curve|BezierCurve|NurbsPath|Point|Sun|Area|Spot)(\.\d+)?$")
SUFFIX = re.compile(r"\.\d{3}$")


def mesh_stats(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    loose = sum(1 for v in bm.verts if not v.link_faces)
    degenerate = sum(1 for f in bm.faces if f.calc_area() < 1e-10)
    non_manifold = sum(1 for e in bm.edges if not e.is_manifold)
    tris = sum(len(f.verts) - 2 for f in bm.faces)
    bm.free()
    return dict(tris=tris, loose_verts=loose, degenerate_faces=degenerate, non_manifold_edges=non_manifold)


def bvh_for(ob):
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bm.transform(ob.matrix_world)
    tree = BVHTree.FromBMesh(bm)
    bm.free()
    return tree


def keyed_points(ob, w, key="Open"):
    """World-space vertex positions of a mesh with its shape key blended to w (0..1)."""
    keys = ob.data.shape_keys
    mw = ob.matrix_world
    if keys is None or key not in keys.key_blocks:
        return [mw @ v.co for v in ob.data.vertices]
    basis, kb = keys.key_blocks[0], keys.key_blocks[key]
    return [mw @ (b.co + (o.co - b.co) * w) for b, o in zip(basis.data, kb.data)]


def check_structure(issues, warnings):
    """Scene organisation: the collection tree is exactly the agreed one, every object
    sits in exactly one collection, and meshes are filed by what they are."""
    scene_coll = bpy.context.scene.collection
    want = C.COLLECTION_TREE
    have_top = [c.name for c in scene_coll.children]
    extra_top = sorted(set(have_top) - set(want))
    missing = []
    for top, children in want.items():
        top_c = bpy.data.collections.get(top)
        if top_c is None or top_c.name not in have_top:
            missing.append(top)
            continue
        kids = [c.name for c in top_c.children]
        missing += [f"{top}/{k}" for k in children if k not in kids]
        extra_top += [f"{top}/{k}" for k in kids if k not in children]
    if missing:
        issues.append(f"collections missing: {missing}")
    if extra_top:
        issues.append(f"collections not in the agreed tree: {extra_top}")
    loose = [o.name for o in scene_coll.objects]
    if loose:
        issues.append(f"objects outside any collection: {loose}")
    multi = [o.name for o in bpy.data.objects if len(o.users_collection) > 1]
    if multi:
        issues.append(f"objects linked to several collections: {multi}")
    misfiled = []
    for o in bpy.data.objects:
        part = o.get("part")
        if o.type != "MESH" or part not in PART_COLLECTION or not o.users_collection:
            continue
        if o.users_collection[0].name not in PART_COLLECTION[part]:
            misfiled.append(f"{o.name} ({part}) in {o.users_collection[0].name}")
    if misfiled:
        issues.append(f"meshes in the wrong collection: {misfiled}")
    per_collection = {c.name: len(c.objects) for c in bpy.data.collections}
    return dict(top_level=have_top, objects_per_collection=per_collection)


def check_transforms(exported, issues, warnings):
    """Transforms that break a glTF export or confuse Three.js: zero/negative/NaN scale,
    non-uniform scale on a parent (skews its children), un-applied scale on meshes."""
    report = dict(checked=0, unapplied_scale=[], non_uniform_parents=[])
    for name in sorted(exported):
        o = bpy.data.objects[name]
        report["checked"] += 1
        s = o.scale
        if any(not math.isfinite(v) for v in (*o.location, *s)):
            issues.append(f"{name}: non-finite transform")
            continue
        if min(s) <= 0:
            issues.append(f"{name}: zero or negative scale {tuple(round(v, 3) for v in s)}")
        if o.children and (abs(s.x - s.y) > 1e-4 or abs(s.y - s.z) > 1e-4):
            report["non_uniform_parents"].append(name)
            issues.append(f"{name}: non-uniform scale on a parent")
        if o.type == "MESH" and any(abs(v - 1) > 1e-4 for v in s) and not name.endswith(("_Molecule", "_Droplet", "_Puff", "_Crystal", "_Drop", "_Particle")):
            report["unapplied_scale"].append(name)
            warnings.append(f"{name}: scale not applied ({tuple(round(v, 3) for v in s)})")
    return report


def check_cameras(exported, issues, warnings):
    """Lesson camera references: each CAM_ has a TGT_ it looks at, travels with its asset, and frames something."""
    cams = [o for o in bpy.data.objects if o.name.startswith("CAM_")]
    out = {}
    for cam in cams:
        tgt_name = cam.get("target")
        tgt = bpy.data.objects.get(tgt_name) if tgt_name else None
        if tgt is None:
            issues.append(f"{cam.name}: no target empty")
            continue
        d = (tgt.matrix_world.translation - cam.matrix_world.translation).length
        fwd = cam.matrix_world.to_quaternion() @ Vector((0, 0, -1))
        facing = fwd.dot((tgt.matrix_world.translation - cam.matrix_world.translation).normalized())
        out[cam.name] = dict(distance=round(d, 3), facing=round(facing, 3), exported=cam.name in exported)
        if not (0.02 < d < 40):
            issues.append(f"{cam.name}: target distance {d:.3f} out of range")
        if facing < 0.98:
            issues.append(f"{cam.name}: does not look at {tgt.name} (dot {facing:.2f})")
        if cam.name not in exported or tgt.name not in exported:
            issues.append(f"{cam.name}: camera or target not parented to an exported asset")
    return out


def run(report_path=None, partial=False):
    issues, warnings = [], []
    assets = {}
    exported = set()

    for root_name, glb in ASSET_ROOTS.items():
        root = bpy.data.objects.get(root_name)
        if root is None:
            if not partial:
                issues.append(f"missing asset root {root_name}")
            continue
        objs = C.descendants(root)
        exported.update(o.name for o in objs)
        tri_total, meshes = 0, 0
        per_object = {}
        for ob in objs:
            if DEFAULT_NAME.match(ob.name) or SUFFIX.search(ob.name):
                issues.append(f"{ob.name}: default/suffixed name")
            if ob.type == "MESH":
                meshes += 1
                st = mesh_stats(ob)
                tri_total += st["tris"]
                per_object[ob.name] = st
                if not ob.data.materials or any(m is None for m in ob.data.materials):
                    issues.append(f"{ob.name}: missing material")
                if st["loose_verts"]:
                    issues.append(f"{ob.name}: {st['loose_verts']} loose verts")
                if st["degenerate_faces"]:
                    warnings.append(f"{ob.name}: {st['degenerate_faces']} near-degenerate faces")
                is_open = bool(ob.get("open_surface", 0))
                if st["non_manifold_edges"] and not is_open:
                    issues.append(f"{ob.name}: {st['non_manifold_edges']} non-manifold edges on a solid")
                if "part" not in ob.keys():
                    issues.append(f"{ob.name}: missing 'part' metadata")
        assets[glb] = dict(root=root_name, objects=len(objs), meshes=meshes, triangles=tri_total,
                           per_object=per_object)

    # objects that are not part of any export and not helpers
    for ob in bpy.data.objects:
        if ob.name in exported:
            continue
        if ob.users_collection and ob.users_collection[0].name in ("LIGHTS", "QA"):
            continue
        warnings.append(f"{ob.name}: not part of any exported asset")

    # ---------------- placement checks (world space, assets at origin) ----------------
    placement = {}
    stem = bpy.data.objects.get("Stem_Main")
    if stem:
        zs = [(stem.matrix_world @ v.co).z for v in stem.data.vertices]
        ok = min(zs) < L.soil_height(0, 0) - 0.03
        placement["stem_embedded_in_soil"] = ok
        if not ok:
            issues.append("Stem_Main does not reach into the soil (floating plant)")

    roots = bpy.data.objects.get("Roots")
    if roots:
        bad = 0
        for v in roots.data.vertices:
            p = roots.matrix_world @ v.co
            if p.z > L.soil_height(p.x, p.y) + 0.03 or p.z < -L.SOIL_DEPTH or math.hypot(p.x, p.y) > L.SOIL_RADIUS \
                    or p.y > L.CUT_Y:
                bad += 1
        placement["roots_outside_soil_vertices"] = bad
        if bad:
            issues.append(f"Roots: {bad} vertices outside the soil volume / behind cut plane")

    supports = [o for o in bpy.data.objects if o.type == "MESH" and o.get("part") in ("stem", "branch")
                and o.name in exported]
    trees = [bvh_for(o) for o in supports]
    worst = 0.0

    def gap(tree, p):
        loc, normal, _i, dist = tree.find_nearest(p)
        if loc is None:
            return 1.0
        return 0.0 if (p - loc).dot(normal) < 0 else dist   # inside the stem/branch → attached

    for ob in bpy.data.objects:
        if ob.type == "MESH" and ob.get("part") == "leaf" and any(c.name == "LEAVES" for c in ob.users_collection):
            origin = ob.matrix_world.translation
            d = min((gap(t, origin) for t in trees), default=1.0)
            worst = max(worst, d)
            if d > 0.012:
                issues.append(f"{ob.name}: petiole starts {d:.3f} away from stem/branch (floating leaf)")
    placement["max_leaf_attach_gap"] = round(worst, 4)

    vac, nuc, wall = (bpy.data.objects.get(n) for n in ("Vacuole", "Nucleus", "Cell_Wall"))
    if vac and nuc and wall:
        cell_inv = bpy.data.objects["PlantCell"].matrix_world.inverted()

        def local_bounds(o):
            pts = [cell_inv @ o.matrix_world @ Vector(c) for c in o.bound_box]
            return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])

        wmin, wmax = local_bounds(wall)
        inside = True
        for o in (vac, nuc):
            omin, omax = local_bounds(o)
            for i in (0, 2):
                if omin[i] < wmin[i] + 0.04 or omax[i] > wmax[i] - 0.04:
                    inside = False
            if omax[1] > wmax[1] - 0.04:
                inside = False
        placement["organelles_inside_cell"] = inside
        if not inside:
            issues.append("Vacuole/Nucleus poke through the cell wall")
        # vacuole vs nucleus overlap
        tv, tn = bvh_for(vac), bvh_for(nuc)
        overlap = bool(tv.overlap(tn))
        placement["vacuole_nucleus_overlap"] = overlap
        if overlap:
            issues.append("Vacuole intersects Nucleus")

    sec_root = bpy.data.objects.get("StemSection")
    if sec_root:
        inv = sec_root.matrix_world.inverted()
        bad = []
        for ob in bpy.data.objects:
            if ob.get("part") == "resin" and ob.name.startswith("Resin_") and ob.name[6:].isdigit():
                p = inv @ ob.matrix_world.translation
                r = math.hypot(p.x, p.y)
                if not (0.07 <= r <= 0.30):
                    bad.append(ob.name)
        placement["resin_outside_old_xylem"] = bad
        if bad:
            issues.append(f"Resin deposits outside old xylem: {bad}")

    # V2.4 (DA-01): guard-cell chloroplasts stay inside their guard cell at every opening
    for side in ("L", "R"):
        gc = bpy.data.objects.get(f"Guard_Cell_{side}")
        ch = bpy.data.objects.get(f"Guard_Cell_{side}_Chloroplasts")
        if gc is None or ch is None:
            continue
        worst = {}
        for w in (0.0, 0.25, 0.5, 0.75, 1.0):
            g_pts = keyed_points(gc, w)
            bm = bmesh.new()
            for p in g_pts:
                bm.verts.new(p)
            bm.verts.ensure_lookup_table()
            for poly in gc.data.polygons:
                bm.faces.new([bm.verts[i] for i in poly.vertices])
            bm.normal_update()
            tree = BVHTree.FromBMesh(bm)
            bm.free()
            outside, min_gap = 0, 9.0
            for p in keyed_points(ch, w):
                loc, nrm, _, dist = tree.find_nearest(p)
                if loc is None or (p - loc).dot(nrm) > 0:
                    outside += 1
                else:
                    min_gap = min(min_gap, dist)
            worst[w] = (outside, round(min_gap, 4))
            if outside or min_gap < 0.002:
                issues.append(f"{ch.name} at Open={w}: {outside} vertices outside the guard cell, min gap {min_gap:.4f}")
        placement[f"guard_cell_{side}_chloroplasts_inside"] = worst

    structure = check_structure(issues, warnings)
    transforms = check_transforms(exported, issues, warnings)
    cameras = check_cameras(exported, issues, warnings)

    report = dict(blender=bpy.app.version_string, ok=not issues, partial=partial, issues=issues, warnings=warnings,
                  placement=placement, structure=structure, transforms=transforms, cameras=cameras, assets=assets)
    if report_path is None:
        report_path = os.path.join(C.PROJECT_DIR, "docs", "qa", "blender-validation.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)
    C.log("validation:", "PASS" if not issues else "FAIL", f"{len(issues)} issues, {len(warnings)} warnings")
    for i in issues:
        C.log("  ISSUE:", i)
    for w in warnings[:20]:
        C.log("  warn:", w)
    for glb, a in assets.items():
        C.log(f"  {glb}: {a['meshes']} meshes, {a['triangles']} tris")
    return report
