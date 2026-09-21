"""Blender pose reference for the runtime pose cross-check (READ-ONLY; never saves any .blend).

Opens the working file (background Blender), drives the rig controller exactly as the rig validators do
(ctrl.rotation_euler X = flexion) and records, per pose, in glTF space (Y-up, metres):
  - world translation of every exported anchor,
  - world matrix (column-major, glTF order) of every structure node,
  - world bounding box of every structure mesh (evaluated vertices),
  - controller / pivot world matrices and the overlay forearm direction.
This is the Blender side of the runtime pose-consistency check. It is NOT a landmark definition file:
formal Gate 3 landmark validation needs approved qa/<joint>.poses.json, which this script does not create.

Usage: blender -b blender/Joints_Working.blend --python-expr "runpy..." -- --joint elbow_r [--poses 0,45,90,145]
Writes qa/reports/<joint>.blender_pose_reference.json
"""
import datetime
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import guard  # noqa: E402

# Blender Z-up -> glTF Y-up: (x, y, z) -> (x, z, -y)
C = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
C_INV = C.inverted()


def yup(v):
    return [v[0], v[2], -v[1]]


def gltf_matrix(m):
    g = C @ m @ C_INV
    return [g[r][c] for c in range(4) for r in range(4)]


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    joint = argv[argv.index("--joint") + 1] if "--joint" in argv else "elbow_r"
    poses = [float(p) for p in argv[argv.index("--poses") + 1].split(",")] if "--poses" in argv else [0.0, 45.0, 90.0, 145.0]

    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    working = os.path.join(guard.ROOT, config["working"]["path"]) if isinstance(config.get("working"), dict) else bpy.data.filepath
    if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(os.path.abspath(working)):
        raise RuntimeError("open file is not the working file: {}".format(bpy.data.filepath))
    sha_before = guard.file_sha256(bpy.data.filepath)
    manifest = json.load(open(os.path.join(guard.ROOT, "public", "assets", "joints", joint, "joint-manifest.json"), encoding="utf-8"))

    objs = bpy.data.objects
    ctrl = objs[manifest["controller"]["node"]]
    pivot = objs[manifest["pivot"]["node"]]
    rest_euler = tuple(ctrl.rotation_euler)
    if ctrl.rotation_mode != "XYZ" or any(abs(v) > 1e-9 for v in rest_euler):
        raise RuntimeError("controller not at rest XYZ euler: {} {}".format(ctrl.rotation_mode, rest_euler))
    forearm = objs[manifest["motion"]["forearmObject"]]
    depsgraph = bpy.context.evaluated_depsgraph_get()

    out_poses = {}
    for deg in poses:
        ctrl.rotation_euler = (math.radians(deg), 0.0, 0.0)
        bpy.context.view_layer.update()
        anchors = {a["anchorId"]: yup(objs[a["nodeName"]].matrix_world.translation) for a in manifest["anchors"]}
        structures = {}
        for s in manifest["structures"]:
            ob = objs[s["nodeName"]]
            ev = ob.evaluated_get(depsgraph)
            mw = ob.matrix_world
            pts = [yup(mw @ v.co) for v in ev.data.vertices]
            structures[s["structureId"]] = {
                "worldMatrix": gltf_matrix(mw),
                "worldBBox": {"min": [min(p[i] for p in pts) for i in range(3)], "max": [max(p[i] for p in pts) for i in range(3)]},
            }
        fw = forearm.matrix_world.to_3x3() @ Vector((0.0, 1.0, 0.0))
        out_poses[str(int(deg)) if deg.is_integer() else str(deg)] = {
            "flexionDeg": deg,
            "controllerWorldMatrix": gltf_matrix(ctrl.matrix_world),
            "pivotWorldMatrix": gltf_matrix(pivot.matrix_world),
            "forearmDirectionWorld": yup(fw.normalized()),
            "anchors": anchors,
            "structures": structures,
        }
    ctrl.rotation_euler = rest_euler
    bpy.context.view_layer.update()

    sha_after = guard.file_sha256(bpy.data.filepath)
    if sha_after != sha_before:
        raise RuntimeError("working file changed during reference export")
    result = {
        "kind": "blender_pose_reference",
        "jointId": joint,
        "note": "Runtime pose-consistency reference generated from the working .blend rig. Not an approved landmark definition set.",
        "space": "glTF (Y-up, metres); matrices column-major",
        "controllerDrive": "ctrl.rotation_euler = (radians(flexion), 0, 0)",
        "blenderVersion": bpy.app.version_string,
        "workingFile": os.path.relpath(bpy.data.filepath, guard.ROOT).replace("\\", "/"),
        "workingFileSha256": sha_before,
        "workingFileUnchanged": sha_after == sha_before,
        "manifestSha256": guard.file_sha256(os.path.join(guard.ROOT, "public", "assets", "joints", joint, "joint-manifest.json")),
        "masterSha256Ok": env["master_sha256_ok"],
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "poses": out_poses,
    }
    path = os.path.join(guard.ROOT, "qa", "reports", joint + ".blender_pose_reference.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1)
    return {"written": path, "poses": list(out_poses), "anchors": len(manifest["anchors"]), "structures": len(manifest["structures"]), "working_unchanged": sha_after == sha_before}


REPORT_SUMMARY = main()
