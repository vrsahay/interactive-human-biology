"""
Optimise the scene for WebGL before export, without changing how anything looks.

* duplicate materials (".001" copies) are merged into the original
* textures are capped at 1024 px (JPEG in the GLB)
* orphan data-blocks are purged so nothing unused is saved or exported
* triangle counts are checked against a per-asset budget sized for phones
Writes docs/qa/blender-optimise.json
"""

import json
import os
import re

import bpy

import common as C
from validate import ASSET_ROOTS

# triangles per GLB: the whole lesson must stay light enough for a mid-range phone
BUDGET = {           # V2: assets load per stage, so each is budgeted on its own (1-3 on screen at once)
    "01_plant.glb": 30000,
    "02_leaf.glb": 16000,
    "03_stoma.glb": 40000,
    "05_leaf_internal.glb": 60000,
    "06_plant_cell.glb": 20000,
    "08_chloroplast.glb": 60000,
    "10_stem_cross_section.glb": 20000,
    "11_xylem.glb": 30000,
    "14_root.glb": 60000,
    "15_root_hairs.glb": 60000,
    "16_soil.glb": 12000,
    "17_waste_visuals.glb": 6000,
}
MAX_TEXTURE = 1024


def _tris(ob):
    return sum(len(p.vertices) - 2 for p in ob.data.polygons)


def run():
    out = dict(materials_merged=[], textures=[], purged=0, triangles={}, over_budget=[], unused_slots=[])

    for m in list(bpy.data.materials):
        base = re.sub(r"\.\d{3}$", "", m.name)
        if base != m.name and bpy.data.materials.get(base):
            m.user_remap(bpy.data.materials[base])
            bpy.data.materials.remove(m)
            out["materials_merged"].append(base)

    for img in bpy.data.images:
        w, h = img.size[:]
        if max(w, h) > MAX_TEXTURE:
            k = MAX_TEXTURE / max(w, h)
            img.scale(max(1, int(w * k)), max(1, int(h * k)))
            if img.packed_file:
                img.pack()
            out["textures"].append(dict(name=img.name, was=[w, h], now=list(img.size[:])))
        else:
            out["textures"].append(dict(name=img.name, size=[w, h]))

    for ob in bpy.data.objects:
        if ob.type != "MESH" or len(ob.data.materials) < 2:
            continue
        used = {p.material_index for p in ob.data.polygons}
        idle = [i for i in range(len(ob.data.materials)) if i not in used]
        if idle:
            out["unused_slots"].append(dict(object=ob.name, slots=idle))

    try:
        out["purged"] = bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    except Exception as exc:  # older/newer API shapes
        out["purged"] = f"not available: {exc}"

    for root_name, glb in ASSET_ROOTS.items():
        root = bpy.data.objects.get(root_name)
        if root is None:
            continue
        tris = sum(_tris(o) for o in C.descendants(root) if o.type == "MESH")
        out["triangles"][glb] = dict(triangles=tris, budget=BUDGET.get(glb, 20000))
        if tris > BUDGET.get(glb, 20000):
            out["over_budget"].append(glb)

    path = os.path.join(C.PROJECT_DIR, "docs", "qa", "blender-optimise.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)
    C.log("optimise:", json.dumps({k: out[k] for k in ("materials_merged", "purged", "over_budget")}))
    return out
