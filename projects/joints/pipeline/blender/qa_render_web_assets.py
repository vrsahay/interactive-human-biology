"""Visual + round-trip QA of the OPTIMISED web assets (never saves any .blend).

Imports the three optimised GLBs into an empty in-memory session, applies the runtime attach contract (manifest attachTo:
re-parent keeping world transform), poses through the imported controller node, and
  - checks imported world bounding boxes against the manifest (Y-up -> Blender Z-up), tolerance 0.1 mm,
  - checks schematic band endpoint distances against the Blender rig validation (0/45/90/145), tolerance 0.05 mm,
  - checks no QA nodes were imported,
  - renders Workbench (texture colour) previews to qa/visual/step9/.
Usage (background Blender):  --python-expr runpy ... with sys.argv = [..., "--", "--assets", <dir>]
"""
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import guard  # noqa: E402

JOINT = "elbow_r"


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    assets = argv[argv.index("--assets") + 1]
    manifest = json.load(open(os.path.join(assets, "joint-manifest.json"), encoding="utf-8"))
    reports = os.path.join(guard.ROOT, "qa", "reports")
    rig_val = json.load(open(os.path.join(reports, "elbow_r.rig_validation.step8_final.json"), encoding="utf-8"))
    ov_val = json.load(open(os.path.join(reports, "elbow_r.overlay_validation.step8_final.json"), encoding="utf-8"))
    out_dir = os.path.join(guard.ROOT, "qa", "visual", "step9")
    os.makedirs(out_dir, exist_ok=True)

    bpy.ops.wm.read_homefile(use_factory_startup=True, use_empty=True)
    scene = bpy.context.scene
    tier_objects = {}
    for tier in ("core", "detail", "context"):
        before = set(bpy.data.objects.keys())
        bpy.ops.import_scene.gltf(filepath=os.path.join(assets, manifest["tiers"][tier]["url"]))
        tier_objects[tier] = sorted(set(bpy.data.objects.keys()) - before)
    objs = bpy.data.objects
    problems = []

    qa_imported = [o.name for o in objs if o.get("qa") is True or "__qa__" in o.name]
    if qa_imported:
        problems.append("QA nodes imported: {}".format(qa_imported))
    expected_names = set().union(*[set(manifest["tiers"][t]["nodes"]) for t in manifest["tiers"]])
    missing = sorted(n for n in expected_names if n not in objs)
    if missing:
        problems.append("nodes missing after import (name collision?): {}".format(missing))

    # runtime attach contract
    bpy.context.view_layer.update()
    attached = []
    for s in manifest["structures"]:
        if s["attachTo"]:
            child, parent = objs[s["nodeName"]], objs[s["attachTo"]]
            world = child.matrix_world.copy()
            child.parent = parent
            child.matrix_parent_inverse = parent.matrix_world.inverted()
            child.matrix_basis = Matrix.Identity(4)
            child.matrix_world = world
            attached.append(s["structureId"])
    bpy.context.view_layer.update()

    # bbox round trip (manifest Y-up -> Z-up: (x, y, z)_gltf -> (x, -z, y))
    def zup(v):
        return Vector((v[0], -v[2], v[1]))

    bbox_dev = 0.0
    for s in manifest["structures"]:
        node = objs[s["nodeName"]]
        meshes = [c for c in node.children if c.type == "MESH"]
        if len(meshes) != 1:
            problems.append("{}: expected one mesh carrier child, found {}".format(s["structureId"], len(meshes)))
            continue
        m = meshes[0]
        pts = [m.matrix_world @ v.co for v in m.data.vertices]
        mn = Vector([min(p[i] for p in pts) for i in range(3)])
        mx = Vector([max(p[i] for p in pts) for i in range(3)])
        e_min, e_max = zup(s["neutralWorldBBox"]["min"]), zup(s["neutralWorldBBox"]["max"])
        # Z-up conversion swaps min/max on the negated axis
        exp_min = Vector((e_min.x, min(e_min.y, e_max.y), e_min.z))
        exp_max = Vector((e_max.x, max(e_min.y, e_max.y), e_max.z))
        dev = max(max(abs(mn[i] - exp_min[i]), abs(mx[i] - exp_max[i])) for i in range(3))
        bbox_dev = max(bbox_dev, dev)
    if bbox_dev > 0.0001:
        problems.append("imported bbox deviation {:.4f} mm".format(bbox_dev * 1000))

    ctrl = objs[manifest["controller"]["node"]]
    ctrl.rotation_mode = "QUATERNION"
    rest_q = ctrl.rotation_quaternion.copy()

    def pose(deg):
        ctrl.rotation_quaternion = rest_q @ Quaternion((1.0, 0.0, 0.0), math.radians(deg))
        bpy.context.view_layer.update()

    bands = {}
    for deg in (0, 45, 90, 145):
        pose(deg)
        for b in manifest["bands"]:
            p = objs[next(a["nodeName"] for a in manifest["anchors"] if a["anchorId"] == b["proximalAnchorId"])].matrix_world.translation
            d = objs[next(a["nodeName"] for a in manifest["anchors"] if a["anchorId"] == b["distalAnchorId"])].matrix_world.translation
            length = (d - p).length * 1000
            expected = ov_val["band_lengths_mm"][str(deg)][b["bandId"]]
            bands.setdefault(b["bandId"], {})[str(deg)] = {"imported_mm": round(length, 3), "blender_mm": expected, "diff_mm": round(abs(length - expected), 4)}
            if abs(length - expected) > 0.05:
                problems.append("{} at {} deg: {:.3f} mm vs {:.3f} mm".format(b["bandId"], deg, length, expected))

    # ---- renders ----
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "TEXTURE"
    scene.render.resolution_x, scene.render.resolution_y = 1000, 1000
    scene.render.image_settings.file_format = "PNG"
    cam_data = bpy.data.cameras.new("qa_tmp_cam")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("qa_tmp_cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam
    pivot = objs[manifest["pivot"]["node"]]

    marker_objs = []

    def marker(loc, color, radius=0.0025):
        import bmesh
        me = bpy.data.meshes.new("qa_tmp_marker")
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=radius)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new("qa_tmp_marker", me)
        ob.location = loc
        mat = bpy.data.materials.new("qa_tmp_mat")
        mat.diffuse_color = color
        me.materials.append(mat)
        scene.collection.objects.link(ob)
        marker_objs.append(ob)

    def set_visible(tiers):
        for t, names in tier_objects.items():
            for n in names:
                o = objs[n]
                o.hide_render = t not in tiers
                for c in o.children_recursive:
                    if c.name in tier_objects[t]:
                        c.hide_render = t not in tiers

    written = []
    shots = [("core", ("core",), "lateral", None), ("detail", ("core", "detail"), "lateral", 0.20), ("context", ("core", "context"), "lateral", None)]
    for label, tiers, view, close in shots:
        for deg in (0, 90, 145):
            for m in marker_objs:
                bpy.data.objects.remove(m, do_unlink=True)
            marker_objs.clear()
            set_visible(tiers)
            pose(deg)
            if label == "core":
                for a in manifest["anchors"]:
                    if a["tier"] == "core" and a["anchorType"] != "band_attachment":
                        marker(objs[a["nodeName"]].matrix_world.translation.copy(), (1.0, 1.0, 1.0, 1.0), 0.003)
            if label == "detail":
                for a in manifest["anchors"]:
                    if a["anchorType"] == "band_attachment":
                        marker(objs[a["nodeName"]].matrix_world.translation.copy(), (0.85, 0.1, 0.1, 1.0) if a["attachmentSide"] == "proximal" else (0.1, 0.25, 0.9, 1.0), 0.0022)
            bpy.context.view_layer.update()
            lateral = pivot.matrix_world.to_3x3().col[0].normalized()
            visible = [o for o in bpy.data.objects if o.type == "MESH" and not o.hide_render and not o.name.startswith("qa_tmp")]
            pts = [o.matrix_world @ Vector(c) for o in visible for c in o.bound_box]
            bb_min = Vector([min(p[i] for p in pts) for i in range(3)]); bb_max = Vector([max(p[i] for p in pts) for i in range(3)])
            centre = pivot.matrix_world.translation.copy() if close else (bb_min + bb_max) / 2
            extent = close if close else max(bb_max[i] - bb_min[i] for i in range(3)) * 1.08
            cam_data.ortho_scale = extent
            sign = 1.0 if view == "lateral" else -1.0
            cam.location = centre + lateral * sign * 1.0
            cam.rotation_mode = "QUATERNION"
            cam.rotation_quaternion = (centre - cam.location).normalized().to_track_quat("-Z", "Y")
            path = os.path.join(out_dir, "elbow_r_{}_{:03d}.png".format(label, deg))
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            written.append(path)
    # medial close-up for the UCL band at 90 deg
    for m in marker_objs:
        bpy.data.objects.remove(m, do_unlink=True)
    marker_objs.clear()
    set_visible(("core", "detail"))
    pose(90)
    for a in manifest["anchors"]:
        if a["anchorType"] == "band_attachment":
            marker(objs[a["nodeName"]].matrix_world.translation.copy(), (0.85, 0.1, 0.1, 1.0) if a["attachmentSide"] == "proximal" else (0.1, 0.25, 0.9, 1.0), 0.0022)
    lateral = pivot.matrix_world.to_3x3().col[0].normalized()
    centre = pivot.matrix_world.translation.copy()
    cam_data.ortho_scale = 0.20
    cam.location = centre - lateral
    cam.rotation_quaternion = (centre - cam.location).normalized().to_track_quat("-Z", "Y")
    path = os.path.join(out_dir, "elbow_r_detail_medial_090.png")
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    written.append(path)

    images = sorted({img.name: (img.file_format, tuple(img.size)) for img in bpy.data.images if img.size[0]}.items())
    result = {"imported": {t: len(v) for t, v in tier_objects.items()}, "attached": len(attached), "qa_imported": qa_imported, "missing_nodes": missing,
              "bbox_max_deviation_mm": round(bbox_dev * 1000, 5), "bands": bands, "images": images, "renders": written, "problems": problems, "passed": not problems}
    json.dump(result, open(os.path.join(reports, "elbow_r.step9_visual_roundtrip.json"), "w", encoding="utf-8"), indent=1)
    return result


REPORT_SUMMARY = main()
