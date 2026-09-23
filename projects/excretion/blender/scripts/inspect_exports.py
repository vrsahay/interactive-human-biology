"""
Read every exported GLB back into Blender and compare it with the source asset.

The export is what the learner actually gets, so it is checked on its own terms:
same meshes, same triangle count, lesson metadata (glTF extras) intact, camera
references present, and the asset root at the origin. The import happens in a
throw-away scene and every data-block it created is removed afterwards.
Writes docs/qa/export-inspection.json
"""

import json
import os
import re

import bpy

import common as C
from validate import ASSET_ROOTS

BASE = re.compile(r"\.\d{3}$")


def _source(root_name):
    root = bpy.data.objects[root_name]
    objs = C.descendants(root)
    meshes = [o for o in objs if o.type == "MESH"]
    return dict(
        objects=len(objs),
        meshes=len(meshes),
        triangles=sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes),
        cameras=sorted(o.name for o in objs if o.type == "CAMERA"),
        names={o.name for o in objs},
    )


def _snapshot():
    return {k: set(getattr(bpy.data, k)) for k in ("objects", "meshes", "materials", "images", "cameras", "collections")}


def _cleanup(before):
    for k, old in before.items():
        data = getattr(bpy.data, k)
        for block in list(data):
            if block not in old:
                try:
                    data.remove(block)
                except Exception:
                    pass


def inspect(root_name, filename, tmp_scene):
    path = os.path.join(C.WEB_MODELS_DIR, filename)
    src = _source(root_name)
    before = _snapshot()
    with bpy.context.temp_override(scene=tmp_scene, view_layer=tmp_scene.view_layers[0]):
        bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before["objects"]]
    meshes = [o for o in new if o.type == "MESH"]
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
    names = {BASE.sub("", o.name) for o in new}
    root = next((o for o in new if BASE.sub("", o.name) == root_name), None)
    no_part = sorted(BASE.sub("", o.name) for o in meshes if "part" not in o.keys())
    cams = sorted(BASE.sub("", o.name) for o in new if o.name.startswith("CAM_"))
    at_origin = root is not None and root.matrix_world.translation.length < 1e-4 \
        and all(abs(v - 1) < 1e-4 for v in root.matrix_world.to_scale())
    result = dict(
        file=filename,
        bytes=os.path.getsize(path),
        objects=len(new),
        meshes=len(meshes),
        triangles=tris,
        source_meshes=src["meshes"],
        source_triangles=src["triangles"],
        missing_nodes=sorted(n for n in src["names"] if n not in names)[:20],
        meshes_without_part=no_part[:20],
        cameras=len(cams),
        source_cameras=len(src["cameras"]),
        root_at_origin=at_origin,
        materials=sorted({BASE.sub("", m.name) for o in meshes for m in o.data.materials if m}),
    )
    problems = []
    if result["meshes"] != src["meshes"]:
        problems.append(f"{result['meshes']} meshes exported, {src['meshes']} in the source")
    if abs(tris - src["triangles"]) > max(8, src["triangles"] * 0.002):
        problems.append(f"{tris} triangles exported, {src['triangles']} in the source")
    if result["missing_nodes"]:
        problems.append(f"nodes missing after export: {result['missing_nodes']}")
    if no_part:
        problems.append(f"meshes without lesson metadata: {no_part}")
    if result["cameras"] != result["source_cameras"]:
        problems.append("camera references lost")
    if not at_origin:
        problems.append("asset root is not at the origin")
    result["problems"] = problems
    _cleanup(before)
    return result


def run():
    tmp = bpy.data.scenes.new("QA_ImportCheck")
    report = {}
    try:
        for root_name, filename in ASSET_ROOTS.items():
            if bpy.data.objects.get(root_name) is None:
                continue
            report[filename] = inspect(root_name, filename, tmp)
    finally:
        bpy.data.scenes.remove(tmp)
    ok = all(not r["problems"] for r in report.values())
    out = dict(ok=ok, assets=report)
    path = os.path.join(C.PROJECT_DIR, "docs", "qa", "export-inspection.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(out, fh, indent=2)
    C.log("export inspection:", "PASS" if ok else "FAIL")
    return out
