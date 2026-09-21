"""Step 7 validation: anchors, overlay registry, motion data, spec agreement (READ-ONLY; never saves).

Run with the Step-7 candidate or promoted working file open. Writes qa/reports/elbow_r.overlay_validation[.<label>].json
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
import elbow_anchors  # noqa: E402
import guard  # noqa: E402

JOINT = "elbow_r"
POSES = [0, 45, 90, 145]
FINE = list(range(0, 146, 5))
ORIGINAL_ANATOMY_KEYS = {"structureId", "jointId", "role", "tier", "side", "label", "src_object", "src_mesh", "src_file_sha256"}


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    label = sys.argv[sys.argv.index("--label") + 1] if "--label" in sys.argv else "candidate"
    path = os.path.join(HERE, "extract_joint.py")
    helpers = {"__file__": path, "__name__": "helpers"}
    exec(compile(open(path, encoding="utf-8").read().replace("REPORT_SUMMARY = main()", ""), path, "exec"), helpers)

    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    reports = os.path.join(guard.ROOT, config["reports"])
    spec = json.load(open(os.path.join(guard.ROOT, "pipeline", "specs", JOINT + ".json"), encoding="utf-8"))
    applied = json.load(open(os.path.join(reports, JOINT + ".extract_apply.json"), encoding="utf-8"))
    rig_build = json.load(open(os.path.join(reports, JOINT + ".rig_build.json"), encoding="utf-8"))
    ext_hash = {r["structureId"]: r["extended_sha256"] for r in applied["structures"]}
    failures = []
    fail = failures.append

    objs = {o.name: o for o in bpy.data.objects}
    by_id = {o.get("structureId"): o for o in bpy.data.objects if o.get("role") not in ("anchor",) and o.get("structureId")}
    root, seg, pivot, ctrl = (objs[JOINT + s] for s in ("__root", "__seg_prox", "__pivot", "__ctrl"))
    overlay_col, qa_col = bpy.data.collections[JOINT + "__overlay"], bpy.data.collections[JOINT + "__qa"]
    role = {s["structureId"]: s["role"] for s in spec["structures"]}
    behaviour = spec["overlay"]["registry"]["motionBehaviorByRole"]

    # ---- inventory ----
    anchor_names = ["{}__anchor__{}".format(JOINT, a["key"]) for a in spec["overlay"]["anchors"]]
    band_specs = [b for b in spec["overlay"].get("bandAnchors", []) if isinstance(b, dict)]
    band_names = ["{}__anchor__{}".format(JOINT, b["key"]) for b in band_specs]
    overlay_expected = set(anchor_names) | set(band_names) | {JOINT + "__overlay__registry", JOINT + "__overlay__axis", JOINT + "__overlay__forearm"}
    anatomy_names = {o.name for o in by_id.values()}
    rig_names = {JOINT + s for s in ("__root", "__seg_prox", "__pivot", "__ctrl")}
    qa_expected = {JOINT + "__qa__" + n for n in ("pivot_marker", "hinge_axis", "neutral_ref", "endpoint_145")}
    expected_all = anatomy_names | rig_names | qa_expected | overlay_expected
    actual_all = set(objs)
    inventory = {"objects": len(objs), "expected_objects": len(expected_all), "unexpected": sorted(actual_all - expected_all), "missing": sorted(expected_all - actual_all),
                 "overlay": len(overlay_col.objects), "collections": len(bpy.data.collections), "meshes": len(bpy.data.meshes),
                 "materials": len(bpy.data.materials), "images": len(bpy.data.images)}
    if inventory["unexpected"] or inventory["missing"] or len(by_id) != 49 or inventory["collections"] != 11:
        fail("inventory: {}".format(inventory))
    if {o.name for o in overlay_col.objects} != overlay_expected or any(o.type != "EMPTY" for o in overlay_col.objects):
        fail("overlay collection content")
    if inventory["meshes"] != 49 + 3 or inventory["materials"] != 4 or inventory["images"] != 6:
        fail("new geometry/material contamination: {}".format(inventory))

    # ---- tags ----
    qa_tags_ok = all(o.get("qa") is True and o.get("export") is False for o in qa_col.objects)
    overlay_tags_ok = all(o.get("qa") is False and o.get("export") is True and str(o.get("role", "")).startswith(("anchor", "overlay_")) for o in overlay_col.objects)
    if not qa_tags_ok:
        fail("QA objects must be qa=true export=false")
    if not overlay_tags_ok:
        fail("overlay objects must be qa=false export=true with anchor/overlay role")

    # ---- anatomy + rig untouched ----
    hashes = sum(1 for s, o in by_id.items() if helpers["extended_mesh_hash"](o.data) == ext_hash[s] and o.data.users == 1)
    if hashes != 49:
        fail("mesh hashes {}/49".format(hashes))
    props_changed = [s for s, o in by_id.items() if set(o.keys()) != ORIGINAL_ANATOMY_KEYS]
    if props_changed:
        fail("anatomy custom properties changed: {}".format(props_changed))
    pw = pivot.matrix_world
    pivot_err = max(abs(pw[i][j] - rig_build["pivot_world_matrix"][i][j]) for i in range(4) for j in range(4))
    if pivot_err > 1e-6:
        fail("pivot matrix changed ({})".format(pivot_err))
    if json.loads(ctrl["semantics"]) != spec["rig"]["semantics"] or json.loads(ctrl["dofs"]) != spec["rig"]["dofs"]:
        fail("controller metadata disagrees with spec")
    if pivot["neutral_offset_deg"] != spec["rig"]["semantics"]["neutral_offset_deg"]:
        fail("pivot neutral offset disagrees with spec")
    constraints = {o.name: [c.type for c in o.constraints] for o in objs.values() if o.constraints}
    if constraints != {ctrl.name: ["LIMIT_ROTATION"]} or any(o.animation_data for o in objs.values()) or bpy.data.actions:
        fail("constraints/animation changed: {}".format(constraints))

    # ---- anchor determinism + parenting ----
    recomputed = elbow_anchors.compute(spec, by_id, pivot)
    sanity = elbow_anchors.sanity(recomputed, spec)
    if sanity:
        fail("anchor plausibility: {}".format(sanity))
    anchors = {}
    for a in spec["overlay"]["anchors"]:
        ob = objs["{}__anchor__{}".format(JOINT, a["key"])]
        r = recomputed[a["key"]]
        is_joint = a["method"]["kind"] == "joint_pivot"
        expected_parent = pivot.name if is_joint else by_id[a["structureId"]].name
        stored = [float(v) for v in ob["localPosition"]]
        row = {"anchorId": ob["anchorId"], "parent": ob.parent.name if ob.parent else None, "vertexIndex": ob["vertexIndex"],
               "deterministic": ob["vertexIndex"] == r["vertexIndex"] and max(abs(a_ - b_) for a_, b_ in zip(stored, r["localPosition"])) < 1e-9,
               "parent_ok": ob.parent is not None and ob.parent.name == expected_parent and r["parent"] == expected_parent,
               "id_ok": ob["anchorId"] == a["anchorId"] and ob["structureId"] == a["structureId"],
               "motion_behavior": ob["motionBehavior"],
               "behavior_ok": ob["motionBehavior"] == ("stationary_joint_center" if is_joint else behaviour[role[a["structureId"]]]),
               "local_matrix_ok": max(abs(ob.matrix_basis[i][j] - Matrix.Translation(Vector(stored))[i][j]) for i in range(4) for j in range(4)) < 1e-9
               and max(abs(ob.matrix_parent_inverse[i][j] - (1.0 if i == j else 0.0)) for i in range(4) for j in range(4)) < 1e-12,
               "diagnostics": r["diagnostics"]}
        for k in ("deterministic", "parent_ok", "id_ok", "behavior_ok", "local_matrix_ok"):
            if row[k] is not True:
                fail("anchor {}: {}".format(a["key"], k))
        anchors[a["key"]] = row

    # ---- band anchors: determinism, parenting, tags, schematic flags ----
    band_rows = {}
    anchor_empty_count = sum(1 for o in objs.values() if o.get("role") == "anchor")
    if anchor_empty_count != len(spec["overlay"]["anchors"]) + len(band_specs):
        fail("anchor empties {} != {}".format(anchor_empty_count, len(spec["overlay"]["anchors"]) + len(band_specs)))
    if len({o.get("anchorId") for o in objs.values() if o.get("role") == "anchor"}) != anchor_empty_count:
        fail("duplicate anchorIds")
    if band_specs:
        band_computed = elbow_anchors.compute_band_anchors(spec, by_id, pivot)
        band_sanity = elbow_anchors.band_sanity(band_computed, spec)
        if band_sanity:
            fail("band plausibility: {}".format(band_sanity))
        driven_inverse = by_id["ulna_r"].matrix_parent_inverse
        rep = spec["overlay"]["anchorConventions"]["bandRepresentation"]
        for b in band_specs:
            ob = objs["{}__anchor__{}".format(JOINT, b["key"])]
            c = band_computed[b["key"]]
            stored = [float(v) for v in ob["localPosition"]]
            exp_inverse = Matrix.Identity(4) if b["parentInverse"] == "identity" else driven_inverse
            row = {
                "anchorId": ob.get("anchorId"), "parent": ob.parent.name if ob.parent else None, "attachedBone": ob.get("attachedBone"),
                "deterministic": c["localPosition"] == b["localPosition"] == stored and c["snapFaceIndex"] == b["snapFaceIndex"] == ob["snapFaceIndex"] and c["snapBone"] == b["attachedBone"],
                "parent_ok": ob.parent is not None and ob.parent.name == b["parent"] and b["parent"] == (JOINT + "__seg_prox" if b["attachmentSide"] == "proximal" else JOINT + "__ctrl"),
                "parent_inverse_ok": max(abs(ob.matrix_parent_inverse[i][j] - exp_inverse[i][j]) for i in range(4) for j in range(4)) < 1e-9,
                "basis_ok": max(abs(ob.matrix_basis[i][j] - Matrix.Translation(Vector(stored))[i][j]) for i in range(4) for j in range(4)) < 1e-12,
                "tags_ok": ob.get("qa") is False and ob.get("export") is True and ob.get("role") == "anchor" and [c_.name for c_ in ob.users_collection] == [overlay_col.name],
                "schematic_ok": ob.get("representation") == "schematic" and ob.get("deformationSimulation") is False and json.loads(ob["band"]) == b["band"] and ob.get("contentLabel") == rep["contentLabel"],
                "ids_ok": ob.get("anchorId") == b["anchorId"] and ob.get("structureId") == b["structureId"] and ob.get("motionBehavior") == b["motionBehavior"] and ob.get("attachmentSide") == b["attachmentSide"],
                "fields_ok": all(k in ob for k in ("anchorId", "structureId", "jointId", "label", "anchorType", "precision", "displayCategory", "motionBehavior",
                                                    "localPosition", "labelDirectionLocal", "leaderOriginLocal", "labelTargetLocal", "vertexNormalLocal", "visibility", "method")),
                "diagnostics": c["diagnostics"],
            }
            for k in ("deterministic", "parent_ok", "parent_inverse_ok", "basis_ok", "tags_ok", "schematic_ok", "ids_ok", "fields_ok"):
                if row[k] is not True:
                    fail("band anchor {}: {}".format(b["key"], k))
            band_rows[b["key"]] = row
        reg_bands = json.loads(objs[JOINT + "__overlay__registry"]["registry"]).get("bands", {})
        for b in band_specs:
            entry = reg_bands.get(b["band"]["bandId"], {})
            if entry.get(b["attachmentSide"] + "AnchorId") != b["anchorId"] or entry.get("representation") != "schematic" or entry.get("deformationSimulation") is not False:
                fail("registry band entry for " + b["key"])
    bone_bvh = {s: elbow_anchors.local_bvh(by_id[s]) for s in {b["attachedBone"] for b in band_specs}}

    # ---- pose stability ----
    def set_flexion(deg):
        ctrl.rotation_euler = (math.radians(deg), 0.0, 0.0)
        bpy.context.view_layer.update()

    axis_ob, fore_ob = objs[JOINT + "__overlay__axis"], objs[JOINT + "__overlay__forearm"]
    reg_ob = objs[JOINT + "__overlay__registry"]
    point = Vector(pw.translation)
    x = pw.to_3x3().col[0].normalized()
    set_flexion(0)
    rest = {k: objs["{}__anchor__{}".format(JOINT, k)].matrix_world.translation.copy() for k in anchors}
    band_rest = {b["key"]: objs["{}__anchor__{}".format(JOINT, b["key"])].matrix_world.translation.copy() for b in band_specs}
    ligament_rest = {s: by_id[s].matrix_world.copy() for s in {b["structureId"] for b in band_specs}}
    band_errors = {"proximal_moved_mm": 0.0, "distal_vs_rotation_mm": 0.0, "off_bone_surface_mm": 0.0, "ligament_mesh_moved": 0.0, "jump_excess_mm": 0.0}
    band_lengths = {}
    band_prev = None
    rest_axis, rest_reg = axis_ob.matrix_world.copy(), reg_ob.matrix_world.copy()
    pose_rows, previous = {}, None
    max_err = {"on_vertex_mm": 0.0, "stationary_mm": 0.0, "moving_vs_rotation_mm": 0.0, "axis_overlay": 0.0, "forearm_overlay": 0.0, "jump_excess_mm": 0.0}
    for deg in FINE:
        set_flexion(deg)
        rot = Matrix.Translation(point) @ Matrix.Rotation(math.radians(deg), 4, x) @ Matrix.Translation(-point)
        positions = {}
        for a in spec["overlay"]["anchors"]:
            ob = objs["{}__anchor__{}".format(JOINT, a["key"])]
            p = ob.matrix_world.translation.copy()
            positions[a["key"]] = p
            if a["method"]["kind"] == "joint_pivot":
                max_err["stationary_mm"] = max(max_err["stationary_mm"], (p - rest[a["key"]]).length * 1000)
                continue
            host = by_id[a["structureId"]]
            on_vertex = (p - host.matrix_world @ host.data.vertices[ob["vertexIndex"]].co).length * 1000
            max_err["on_vertex_mm"] = max(max_err["on_vertex_mm"], on_vertex)
            if role[a["structureId"]] in elbow_anchors.MOVING_ROLES:
                max_err["moving_vs_rotation_mm"] = max(max_err["moving_vs_rotation_mm"], (p - rot @ rest[a["key"]]).length * 1000)
            else:
                max_err["stationary_mm"] = max(max_err["stationary_mm"], (p - rest[a["key"]]).length * 1000)
        # overlay motion data
        max_err["axis_overlay"] = max(max_err["axis_overlay"], max(abs(axis_ob.matrix_world[i][j] - rest_axis[i][j]) for i in range(4) for j in range(4)),
                                      max(abs(reg_ob.matrix_world[i][j] - rest_reg[i][j]) for i in range(4) for j in range(4)))
        expected_fore = pw @ Matrix.Rotation(math.radians(deg), 4, "X")
        max_err["forearm_overlay"] = max(max_err["forearm_overlay"], max(abs(fore_ob.matrix_world[i][j] - expected_fore[i][j]) for i in range(4) for j in range(4)))
        # continuity: displacement between consecutive samples bounded by the arc length about the axis
        if previous is not None:
            for k, p in positions.items():
                v = previous[k] - point
                radius = (v - v.dot(x) * x).length
                allowed = radius * math.radians(5) * 1.0001 + 1e-9
                max_err["jump_excess_mm"] = max(max_err["jump_excess_mm"], max(0.0, (p - previous[k]).length - allowed) * 1000)
        previous = positions
        # band anchors at this pose
        band_pos = {}
        for b in band_specs:
            ob = objs["{}__anchor__{}".format(JOINT, b["key"])]
            p = ob.matrix_world.translation.copy()
            band_pos[b["key"]] = p
            if b["attachmentSide"] == "proximal":
                band_errors["proximal_moved_mm"] = max(band_errors["proximal_moved_mm"], (p - band_rest[b["key"]]).length * 1000)
            else:
                band_errors["distal_vs_rotation_mm"] = max(band_errors["distal_vs_rotation_mm"], (p - rot @ band_rest[b["key"]]).length * 1000)
            bone = by_id[b["attachedBone"]]
            local = bone.matrix_world.inverted() @ p
            surf = bone_bvh[b["attachedBone"]].find_nearest(local, 0.01)
            band_errors["off_bone_surface_mm"] = max(band_errors["off_bone_surface_mm"], (surf[3] if surf[0] is not None else 10.0) * 1000)
        for s, m0 in ligament_rest.items():
            band_errors["ligament_mesh_moved"] = max(band_errors["ligament_mesh_moved"], max(abs(by_id[s].matrix_world[i][j] - m0[i][j]) for i in range(4) for j in range(4)))
        lengths = {}
        for b in band_specs:
            if b["attachmentSide"] == "proximal":
                other = next(x for x in band_specs if x["anchorId"] == b["band"]["pairedAnchorId"])
                lengths[b["band"]["bandId"]] = round((band_pos[other["key"]] - band_pos[b["key"]]).length * 1000, 3)
        band_lengths[str(deg)] = lengths
        if band_prev is not None:
            for k, p in band_pos.items():
                v = band_prev[k] - point
                allowed = (v - v.dot(x) * x).length * math.radians(5) * 1.0001 + 1e-9
                band_errors["jump_excess_mm"] = max(band_errors["jump_excess_mm"], max(0.0, (p - band_prev[k]).length - allowed) * 1000)
        band_prev = band_pos
        if deg in POSES:
            fore_dir = fore_ob.matrix_world.to_3x3().col[1].normalized()
            motion_dir = fore_ob.matrix_world.to_3x3().col[2].normalized()
            neutral_dir = axis_ob.matrix_world.to_3x3().col[1].normalized()
            pose_rows[str(deg)] = {
                "anchor_world_mm": {k: [round(c * 1000, 2) for c in p] for k, p in positions.items()},
                "moved_from_0_mm": {k: round((p - rest[k]).length * 1000, 2) for k, p in positions.items()},
                "forearm_vs_neutral_deg": round(math.degrees(fore_dir.angle(neutral_dir)), 4),
                "motion_dir_perp_axis": round(abs(motion_dir.dot(x)), 9), "motion_dir_perp_forearm": round(abs(motion_dir.dot(fore_dir)), 9),
            }
            if abs(pose_rows[str(deg)]["forearm_vs_neutral_deg"] - deg) > 1e-3:
                fail("forearm overlay angle at {}".format(deg))
    set_flexion(0)
    tol = {"on_vertex_mm": 1e-3, "stationary_mm": 1e-3, "moving_vs_rotation_mm": 1e-3, "axis_overlay": 1e-6, "forearm_overlay": 1e-6, "jump_excess_mm": 1e-3}
    for k, t in tol.items():
        if max_err[k] > t:
            fail("pose stability {} = {}".format(k, max_err[k]))
    band_tol = {"proximal_moved_mm": 1e-3, "distal_vs_rotation_mm": 1e-3, "off_bone_surface_mm": 1e-3, "ligament_mesh_moved": 0.0, "jump_excess_mm": 1e-3}
    for k, t in band_tol.items():
        if band_errors[k] > t:
            fail("band stability {} = {}".format(k, band_errors[k]))

    registry = json.loads(reg_ob["registry"])
    if set(registry["structures"]) != set(role) or any(registry["structures"][s]["motionBehavior"] != behaviour[role[s]] for s in role):
        fail("registry structures/motion behaviour")
    classification = {b: sorted(s for s in role if behaviour[role[s]] == b) for b in sorted(set(behaviour.values()))}

    result = {"joint": JOINT, "label": label, "validated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
              "file": bpy.data.filepath, "file_sha256": file_sha256(bpy.data.filepath), "inventory": inventory, "mesh_hashes_passed": hashes,
              "qa_tags_ok": qa_tags_ok, "overlay_tags_ok": overlay_tags_ok, "pivot_matrix_error": pivot_err, "anchors": anchors,
              "pose_stability_max_errors": max_err, "poses": pose_rows, "registry_groups": {g: len(v) for g, v in registry["groups"].items()},
              "classification": {k: len(v) for k, v in classification.items()}, "classification_detail": classification,
              "anchor_empties": anchor_empty_count, "band_anchors": band_rows, "band_stability_max_errors": band_errors,
              "band_lengths_mm": band_lengths,
              "failures": failures, "passed": not failures}
    name = JOINT + ".overlay_validation" + ("" if label == "candidate" else "." + label) + ".json"
    with open(os.path.join(reports, name), "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, default=str)
    return result


REPORT_SUMMARY = main()
