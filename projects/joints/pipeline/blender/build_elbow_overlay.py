"""Step 7: build the elbow_r anchor + overlay/motion data foundation (run with Joints_Working.blend = v002 open).

Creates in elbow_r__overlay (data empties only; no geometry, no materials, no anatomy changes):
  13 anchors   elbow_r__anchor__<key>   parented to their structure object (joint anchor: elbow_r__pivot)
  registry     elbow_r__overlay__registry  (parent elbow_r__root)  structure groups / motion behaviour / capabilities
  axis         elbow_r__overlay__axis      (parent elbow_r__pivot, identity)  hinge axis +X, neutral +Y, travel +Z
  forearm      elbow_r__overlay__forearm   (parent elbow_r__ctrl, identity)   current forearm +Y, motion direction +Z
Also mirrors spec rig.semantics onto elbow_r__ctrl["semantics"] (metadata only).
Saves ONLY blender/Joints_Working.step7_candidate.blend.
"""
import datetime
import hashlib
import json
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import elbow_anchors  # noqa: E402
import guard  # noqa: E402

JOINT = "elbow_r"
ORIGINAL_ANATOMY_KEYS = {"structureId", "jointId", "role", "tier", "side", "label", "src_object", "src_mesh", "src_file_sha256"}


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    root_dir = guard.ROOT
    reports = os.path.join(root_dir, config["reports"])
    working = os.path.normpath(os.path.join(root_dir, config["working"]["path"]))
    v002 = working.replace(".blend", ".v002.blend")
    candidate = working.replace(".blend", ".step7_candidate.blend")

    def stop(msg):
        raise RuntimeError("STEP 7 STOPPED (nothing saved): " + msg)

    if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(working):
        stop("open file is not the working file")
    if file_sha256(working) != file_sha256(v002):
        stop("working file is not identical to v002")
    if os.path.exists(candidate):
        stop("candidate exists already")
    spec = json.load(open(os.path.join(root_dir, "pipeline", "specs", JOINT + ".json"), encoding="utf-8"))
    overlay_col = bpy.data.collections[JOINT + "__overlay"]
    if overlay_col.objects or len(bpy.data.objects) != 57:
        stop("file is not in the validated Step-6 state")

    objs = {o.name: o for o in bpy.data.objects}
    by_id = {o.get("structureId"): o for o in bpy.data.objects if o.get("structureId")}
    root, pivot, ctrl = objs[JOINT + "__root"], objs[JOINT + "__pivot"], objs[JOINT + "__ctrl"]
    if any(abs(v) > 1e-9 for v in ctrl.rotation_euler):
        stop("controller is not at flexion 0")

    results = elbow_anchors.compute(spec, by_id, pivot)
    problems = elbow_anchors.sanity(results, spec)
    if problems:
        stop("anchor plausibility: " + "; ".join(problems))

    role = {s["structureId"]: s["role"] for s in spec["structures"]}
    behaviour = spec["overlay"]["registry"]["motionBehaviorByRole"]
    anchors_by_structure = {}
    created = []

    def new_empty(name, parent, basis, size, display="PLAIN_AXES"):
        ob = bpy.data.objects.new(name, None)
        ob.empty_display_type, ob.empty_display_size = display, size
        overlay_col.objects.link(ob)
        ob.parent, ob.matrix_parent_inverse = parent, Matrix.Identity(4)
        ob.matrix_basis = basis
        ob.hide_render = True
        created.append(ob.name)
        return ob

    for a in spec["overlay"]["anchors"]:
        r = results[a["key"]]
        parent = objs[r["parent"]]
        ob = new_empty("{}__anchor__{}".format(JOINT, a["key"]), parent, Matrix.Translation(Vector(r["localPosition"])), 0.0015, "SPHERE")
        is_joint = a["method"]["kind"] == "joint_pivot"
        motion = "stationary_joint_center" if is_joint else behaviour[role[a["structureId"]]]
        props = {
            "jointId": JOINT, "side": spec["side"], "role": "anchor", "qa": False, "export": a["export"],
            "anchorId": a["anchorId"], "anchorKey": a["key"], "structureId": a["structureId"], "label": a["label"],
            "anchorType": a["anchorType"], "precision": spec["overlay"]["anchorConventions"]["precisionClasses"][a["anchorType"]],
            "displayCategory": a["displayCategory"], "motionBehavior": motion, "parentObject": parent.name,
            "method": json.dumps(a["method"]), "vertexIndex": r["vertexIndex"],
            "localPosition": r["localPosition"], "vertexNormalLocal": r["vertexNormalLocal"],
            "labelDirectionLocal": r["labelDirectionLocal"], "labelOffsetMm": spec["overlay"]["anchorConventions"]["labelOffsetMm"],
            "leaderOriginLocal": r["localPosition"],
            "labelTargetLocal": r.get("labelTargetLocal", [0.0, 0.0, spec["overlay"]["anchorConventions"]["labelOffsetMm"] / 1000]),
            "visibility": json.dumps(a["visibility"]),
        }
        for k, v in props.items():
            ob[k] = v
        anchors_by_structure.setdefault(a["structureId"], []).append(a["anchorId"])

    groups = {g: sorted(s for s, rl in role.items() if rl in d["roles"]) for g, d in spec["overlay"]["registry"]["groups"].items()}
    registry = {
        "jointId": JOINT, "capabilities": spec["overlay"]["registry"]["capabilities"], "groups": groups,
        "structures": {s["structureId"]: {"label": s["label"], "role": s["role"], "tier": s["tier"], "motionBehavior": behaviour[s["role"]],
                                          "group": next(g for g, ids in groups.items() if s["structureId"] in ids),
                                          "anchors": anchors_by_structure.get(s["structureId"], []),
                                          "highlightable": True, "isolatable": True, "visibilityToggle": True}
                       for s in spec["structures"]},
        "jointAnchors": anchors_by_structure.get("elbow_joint_r", []),
    }
    reg = new_empty(JOINT + "__overlay__registry", root, Matrix.Identity(4), 0.004)
    for k, v in {"jointId": JOINT, "role": "overlay_registry", "qa": False, "export": True, "registry": json.dumps(registry)}.items():
        reg[k] = v

    motion = spec["overlay"]["motion"]
    dof = spec["rig"]["dofs"][0]
    axis = new_empty(JOINT + "__overlay__axis", pivot, Matrix.Identity(4), 0.006)
    for k, v in {"jointId": JOINT, "role": "overlay_axis", "qa": False, "export": True,
                 "hingeAxisLocal": [1.0, 0.0, 0.0], "neutralDirectionLocal": [0.0, 1.0, 0.0], "flexionTravelAtNeutralLocal": [0.0, 0.0, 1.0],
                 "minFlexionDeg": dof["min"], "maxFlexionDeg": dof["max"], "neutralDefinition": spec["rig"]["semantics"]["neutral_definition"],
                 "currentFlexionSource": motion["currentFlexionSource"], "axisLengthMm": motion["axisLengthMm"],
                 "arcRadiusMm": motion["arcRadiusMm"], "arcTickDeg": motion["arcTickDeg"], "controller": ctrl.name}.items():
        axis[k] = v
    fore = new_empty(JOINT + "__overlay__forearm", ctrl, Matrix.Identity(4), 0.006)
    for k, v in {"jointId": JOINT, "role": "overlay_forearm", "qa": False, "export": True,
                 "forearmDirectionLocal": [0.0, 1.0, 0.0], "motionDirectionLocal": [0.0, 0.0, 1.0], "hingeAxisLocal": [1.0, 0.0, 0.0],
                 "note": "rotates with elbow_r__ctrl; +Y = current forearm direction, +Z = current flexion motion direction"}.items():
        fore[k] = v

    ctrl["semantics"] = json.dumps(spec["rig"]["semantics"], sort_keys=True)
    bpy.context.view_layer.update()

    # Pre-save: anatomy objects untouched (no new props), counts, anchors sit on their vertices.
    errors = []
    for sid, ob in by_id.items():
        if set(ob.keys()) != ORIGINAL_ANATOMY_KEYS:
            errors.append(sid + " custom properties changed")
    if len(bpy.data.objects) != 57 + 16 or len(overlay_col.objects) != 16:
        errors.append("object counts {} / overlay {}".format(len(bpy.data.objects), len(overlay_col.objects)))
    for a in spec["overlay"]["anchors"]:
        ob = objs.get("{}__anchor__{}".format(JOINT, a["key"])) or bpy.data.objects["{}__anchor__{}".format(JOINT, a["key"])]
        r = results[a["key"]]
        if r["vertexIndex"] >= 0:
            host = bpy.data.objects[r["parent"]]
            expected = host.matrix_world @ host.data.vertices[r["vertexIndex"]].co
            if (ob.matrix_world.translation - expected).length > 1e-6:
                errors.append(a["key"] + " anchor not on its vertex")
    if errors:
        stop("; ".join(errors))

    bpy.ops.wm.save_as_mainfile(filepath=candidate, check_existing=False, copy=True)
    report = {"joint": JOINT, "step": 7, "generated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
              "created": created, "anchors": results, "registry_groups": {g: len(v) for g, v in groups.items()},
              "candidate": candidate, "candidate_sha256": file_sha256(candidate), "v002_sha256": file_sha256(v002)}
    with open(os.path.join(reports, JOINT + ".overlay_build.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    return {"created": len(created), "candidate": candidate, "candidate_sha256": report["candidate_sha256"],
            "anchors": {k: {"parent": v["parent"], "vertexIndex": v["vertexIndex"], "diagnostics": v["diagnostics"]} for k, v in results.items()},
            "registry_groups": report["registry_groups"]}


REPORT_SUMMARY = main()
