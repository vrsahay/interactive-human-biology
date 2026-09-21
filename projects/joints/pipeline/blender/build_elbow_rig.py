"""Step 6 (Option B): build the right-elbow 1-DOF Empty rig with controller 0 = TRUE EXTENSION.

Run with Joints_Working.blend (Step-5 state, identical to v001) open in background Blender.

Inputs: qa/reports/elbow_r.pivot_fit.json (fitted axis), qa/reports/elbow_r.neutral_offset.json (ISB neutral offset).
Frames (Blender world):
  X      = fitted flexion axis (medial -> lateral for the right arm; +rotation = flexion)
  Y_ext  = ISB humerus long axis (glenohumeral centre -> epicondyle midpoint) projected perpendicular to X
           = forearm direction at true extension
  Z_ext  = X x Y_ext (direction the forearm travels in flexion)
  elbow_r__pivot  world = [X, Y_ext, Z_ext] at the fitted pivot point        <- the neutral offset lives here, explicitly
  elbow_r__ctrl   local rotation X = flexion from true extension (0-145 deg), the only driven transform
  Driven children parent inverse = (pivot_world @ Rx(offset))^-1, so the anatomy is exactly at its source position when
  flexion == offset (source pose) and rotated by -offset (true extension) at flexion 0. Mesh data is never edited.
Creates: elbow_r__root > elbow_r__seg_prox > elbow_r__pivot > elbow_r__ctrl (+ 1 Limit Rotation) and 4 QA objects.
Saves ONLY blender/Joints_Working.step6_candidate.blend (the working file is promoted after validation passes).
"""
import datetime
import hashlib
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import guard  # noqa: E402

JOINT = "elbow_r"


def load_hash_helpers():
    path = os.path.join(HERE, "extract_joint.py")
    source = open(path, encoding="utf-8").read().replace("REPORT_SUMMARY = main()", "")
    ns = {"__file__": path, "__name__": "extract_helpers"}
    exec(compile(source, path, "exec"), ns)
    return ns


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def is_identity(m, tol):
    return all(abs(m[i][j] - (1.0 if i == j else 0.0)) < tol for i in range(4) for j in range(4))


def rot_about(axis, point, deg):
    return Matrix.Translation(point) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-point)


def main():
    helpers = load_hash_helpers()
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    reports = os.path.join(guard.ROOT, config["reports"])
    working = os.path.normpath(os.path.join(guard.ROOT, config["working"]["path"]))
    checkpoint = working.replace(".blend", ".v001.blend")
    candidate = working.replace(".blend", ".step6_candidate.blend")

    def stop(msg):
        raise RuntimeError("STEP 6 STOPPED (nothing saved): " + msg)

    if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(working):
        stop("open file is not the working file")
    if file_sha256(checkpoint) != file_sha256(working):
        stop("working file on disk is not identical to v001")
    if os.path.exists(candidate):
        stop("candidate already exists: " + candidate)
    spec = json.load(open(os.path.join(guard.ROOT, "pipeline", "specs", JOINT + ".json"), encoding="utf-8"))
    dry = json.load(open(os.path.join(reports, JOINT + ".extract_dryrun.json"), encoding="utf-8"))
    fit = json.load(open(os.path.join(reports, JOINT + ".pivot_fit.json"), encoding="utf-8"))
    neutral = json.load(open(os.path.join(reports, JOINT + ".neutral_offset.json"), encoding="utf-8"))

    rig_col, qa_col = bpy.data.collections[JOINT + "__rig"], bpy.data.collections[JOINT + "__qa"]
    if rig_col.objects or qa_col.objects or len(bpy.data.objects) != 49 or any(o.type != "MESH" for o in bpy.data.objects):
        stop("file is not in the Step-5 state")
    by_id = {o.get("structureId"): o for o in bpy.data.objects if o.get("jointId") == JOINT}
    hashes_before = {sid: helpers["extended_mesh_hash"](o.data) for sid, o in by_id.items()}

    point = Vector(fit["final"]["point"])
    x_axis = Vector(fit["final"]["flexion_axis_world"]).normalized()
    offset = float(neutral["neutral_offset_deg"])
    lm = neutral["landmarks"]
    hum_isb = Vector(lm["epicondyle_midpoint"]) - Vector(lm["glenohumeral_centre"])
    y_ext = (hum_isb - hum_isb.dot(x_axis) * x_axis).normalized()
    z_ext = x_axis.cross(y_ext).normalized()
    pivot_world = Matrix(((x_axis.x, y_ext.x, z_ext.x, point.x), (x_axis.y, y_ext.y, z_ext.y, point.y),
                          (x_axis.z, y_ext.z, z_ext.z, point.z), (0.0, 0.0, 0.0, 1.0)))
    if abs(pivot_world.to_3x3().determinant() - 1.0) > 1e-6:
        stop("pivot frame is not a proper rotation")
    # Consistency: the source forearm (ISB) direction must equal Y_ext rotated by +offset about X.
    fore_src = Vector(lm["ulnar_styloid"]) - Vector(lm["epicondyle_midpoint"])
    fore_src_p = (fore_src - fore_src.dot(x_axis) * x_axis).normalized()
    predicted = (Matrix.Rotation(math.radians(offset), 3, x_axis) @ y_ext).normalized()
    consistency_deg = math.degrees(predicted.angle(fore_src_p))
    if consistency_deg > 1e-3:
        stop("neutral offset inconsistent with frame ({} deg)".format(consistency_deg))
    if z_ext.y >= 0:
        stop("flexion does not carry the forearm anteriorly")

    def add_empty(name, display, size, parent, basis, props, collection):
        ob = bpy.data.objects.new(name, None)
        ob.empty_display_type, ob.empty_display_size = display, size
        collection.objects.link(ob)
        if parent is not None:
            ob.parent, ob.matrix_parent_inverse = parent, Matrix.Identity(4)
        ob.matrix_basis = basis
        for k, v in props.items():
            ob[k] = v
        return ob

    common = {"jointId": JOINT, "side": spec["side"]}
    fin = fit["final"]
    root = add_empty(JOINT + "__root", "PLAIN_AXES", 0.02, None, Matrix.Identity(4),
                     common | {"rigId": JOINT + "__root", "role": "rig_root", "jointType": spec["jointType"]}, rig_col)
    seg = add_empty(JOINT + "__seg_prox", "PLAIN_AXES", 0.015, root, Matrix.Identity(4),
                    common | {"rigId": JOINT + "__seg_prox", "role": "segment_proximal"}, rig_col)
    pivot = add_empty(JOINT + "__pivot", "ARROWS", 0.03, seg, pivot_world, common | {
        "rigId": JOINT + "__pivot", "role": "pivot",
        "pivot_method": "functional congruence fit (Nelder-Mead) from distal-band start; qa/reports/elbow_r.pivot_fit.json",
        "pivot_point_blender": list(fin["point"]), "flexion_axis_world": list(fin["flexion_axis_world"]),
        "fit_vs_epicondylar_deg": fin["vs_epicondylar_deg"], "fit_gap_std_median_mm": fin["sweep"]["gap_std_median_mm"],
        "orientation_semantics": "+X flexion axis (medial->lateral, +rotation = flexion); +Y forearm direction at TRUE EXTENSION (ISB humerus long axis projected); +Z flexion travel",
        "neutral_offset_deg": offset,
        "neutral_offset_definition": "ISB long axes: humerus GH centre->epicondyle midpoint; forearm epicondyle midpoint->ulnar styloid; signed angle in the plane perpendicular to the flexion axis",
        "source_pose_flexion_deg": offset,
        "status": "fitted; pending anatomical expert review",
    }, rig_col)
    dof = spec["rig"]["dofs"][0]
    ctrl = add_empty(JOINT + "__ctrl", "ARROWS", 0.04, pivot, Matrix.Identity(4), common | {
        "rigId": JOINT + "__ctrl", "role": "controller", "jointType": spec["jointType"],
        "dofs": json.dumps(spec["rig"]["dofs"]),
        "dof_id": dof["id"], "dof_axis": dof["axis"], "dof_min_deg": dof["min"], "dof_max_deg": dof["max"],
        "dof_neutral_deg": dof["neutral"], "dof_unit": dof["unit"], "dof_range_status": dof["rangeStatus"],
        "neutral_semantics": "flexion 0 = true anatomical extension (not the source pose)",
        "source_pose_flexion_deg": offset,
        "source_pose_note": "The source anatomy was supplied flexed; initial shaft-based estimate 25.97 deg, final ISB-based value stored here. The source pose is reproduced exactly at flexion = source_pose_flexion_deg.",
        "neutral_offset_location": JOINT + "__pivot orientation (+Y = true extension); driven children parent inverse encodes the source pose",
        "range_note": "145 deg maximum is approximate, pending a cited anatomical reference",
    }, rig_col)
    ctrl.rotation_mode = "XYZ"
    ctrl.lock_location, ctrl.lock_rotation, ctrl.lock_scale = (True, True, True), (False, True, True), (True, True, True)
    limit = ctrl.constraints.new("LIMIT_ROTATION")
    limit.name, limit.owner_space = "dof_flexion_limit", "LOCAL"
    limit.use_limit_x, limit.min_x, limit.max_x = True, math.radians(dof["min"]), math.radians(dof["max"])
    limit.use_limit_y, limit.min_y, limit.max_y = True, 0.0, 0.0
    limit.use_limit_z, limit.min_z, limit.max_z = True, 0.0, 0.0

    ctrl_at_source_world = pivot_world @ Matrix.Rotation(math.radians(offset), 4, "X")
    child_inverse = ctrl_at_source_world.inverted()
    moving_roles = {"bone_moving", "follow", "attached_soft"}
    assignments = {"seg_prox": [], "ctrl": [], "root": []}
    for d in dry["structures"]:
        ob = by_id[d["structureId"]]
        if d["role"] == "bone_fixed":
            ob.parent, ob.matrix_parent_inverse = seg, Matrix.Identity(4)
            assignments["seg_prox"].append(d["structureId"])
        elif d["role"] in moving_roles:
            ob.parent, ob.matrix_parent_inverse = ctrl, child_inverse
            assignments["ctrl"].append(d["structureId"])
        else:
            ob.parent, ob.matrix_parent_inverse = root, Matrix.Identity(4)
            assignments["root"].append(d["structureId"])
    ctrl["drives"] = json.dumps(sorted(assignments["ctrl"]))

    # QA objects (not anatomy; never exported)
    qa_props = common | {"qa": True, "export": False, "role": "qa"}
    marker = add_empty(JOINT + "__qa__pivot_marker", "SPHERE", 0.003, None, Matrix.Translation(point), qa_props | {"qaId": "pivot_marker"}, qa_col)
    marker.hide_render = True

    def edge(name, a, b, extra):
        me = bpy.data.meshes.new(name + "__mesh")
        me.from_pydata([tuple(a), tuple(b)], [(0, 1)], [])
        ob = bpy.data.objects.new(name, me)
        qa_col.objects.link(ob)
        ob.hide_render = True
        for k, v in (qa_props | extra).items():
            ob[k] = v
        return ob

    y_145 = Matrix.Rotation(math.radians(145.0), 3, x_axis) @ y_ext
    qa = [marker,
          edge(JOINT + "__qa__hinge_axis", point - 0.045 * x_axis, point + 0.045 * x_axis, {"qaId": "hinge_axis", "note": "fitted flexion axis, 90 mm, centred on the pivot"}),
          edge(JOINT + "__qa__neutral_ref", point, point + 0.08 * y_ext, {"qaId": "neutral_ref", "note": "forearm direction at TRUE EXTENSION (flexion 0), stationary"}),
          edge(JOINT + "__qa__endpoint_145", point, point + 0.08 * y_145, {"qaId": "endpoint_145", "note": "forearm direction at flexion 145 deg, stationary"})]

    # Pre-save checks: exact source reproduction at flexion = offset, expected rotation at 0, meshes untouched.
    errors = []
    ctrl.rotation_euler = (math.radians(offset), 0.0, 0.0)
    bpy.context.view_layer.update()
    source_err = max(max(abs(by_id[s].matrix_world[i][j] - (1.0 if i == j else 0.0)) for i in range(4) for j in range(4)) for s in by_id)
    if source_err > 1e-5:
        errors.append("source pose not reproduced at flexion=offset (err {})".format(source_err))
    ctrl.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    expected0 = rot_about(x_axis, point, -offset)
    ext_err = max(max(abs(by_id[s].matrix_world[i][j] - expected0[i][j]) for i in range(4) for j in range(4)) for s in assignments["ctrl"])
    if ext_err > 1e-5:
        errors.append("true-extension transform error {}".format(ext_err))
    for sid, ob in by_id.items():
        if helpers["extended_mesh_hash"](ob.data) != hashes_before[sid] or ob.data.users != 1:
            errors.append(sid + " mesh changed or shared")
    for sid in assignments["seg_prox"] + assignments["root"]:
        if not is_identity(by_id[sid].matrix_world, 1e-6):
            errors.append(sid + " stationary object moved")
    if len(bpy.data.objects) != 49 + 4 + 4:
        errors.append("object count {}".format(len(bpy.data.objects)))
    if errors:
        stop("; ".join(errors[:10]))

    bpy.ops.wm.save_as_mainfile(filepath=candidate, check_existing=False, copy=True)
    report = {
        "joint": JOINT, "step": "6B", "generated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
        "neutral_offset_deg": offset, "consistency_deg": consistency_deg, "source_reproduction_error": source_err, "true_extension_transform_error": ext_err,
        "pivot_world_matrix": [list(r) for r in pivot_world], "x_axis": list(x_axis), "y_true_extension": list(y_ext), "z_flexion_travel": list(z_ext),
        "assignments": assignments, "rig_objects": [root.name, seg.name, pivot.name, ctrl.name], "qa_objects": [o.name for o in qa],
        "candidate": candidate, "candidate_bytes": os.path.getsize(candidate), "candidate_sha256": file_sha256(candidate),
        "v001_sha256": file_sha256(checkpoint), "working_sha256_unchanged": file_sha256(working) == file_sha256(checkpoint),
    }
    with open(os.path.join(reports, JOINT + ".rig_build.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    return {k: report[k] for k in ("neutral_offset_deg", "consistency_deg", "source_reproduction_error", "true_extension_transform_error", "x_axis",
                                   "y_true_extension", "z_flexion_travel", "rig_objects", "qa_objects", "candidate", "candidate_bytes",
                                   "candidate_sha256", "working_sha256_unchanged")} | {"counts": {k: len(v) for k, v in assignments.items()}}


REPORT_SUMMARY = main()
