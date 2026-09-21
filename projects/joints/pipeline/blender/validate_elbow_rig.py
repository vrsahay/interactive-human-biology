"""Step 6 (Option B) validation of the right-elbow rig (READ-ONLY; never saves).

Run with the candidate or the promoted working file open. Semantics: controller flexion 0 = true extension,
source pose reproduced at flexion = pivot["neutral_offset_deg"].

Per sampled pose (0..145 step 5; reference poses 0/45/90/145):
  - stationary structures, rig parents and QA objects unchanged
  - driven structures == analytic rotation about the fitted axis by (flexion - offset); pivot point fixed
  - radius/ulna/hand relative transforms constant
  - measured anatomical flexion (ISB long axes, from evaluated world matrices) and shaft-based flexion
  - bone overlap (signed distance to surface) of radius, ulna and hand bones against humerus, scapula, clavicle,
    with the deepest contact classified by region (ulna: olecranon/coronoid; radius: head; humerus: fossae)
Also: mesh hashes, hierarchy, controller metadata, limit clamping, landmark-definition availability.
Writes qa/reports/elbow_r.rig_validation[.<label>].json
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
import fits  # noqa: E402
import guard  # noqa: E402

JOINT = "elbow_r"
SWEEP = list(range(0, 146, 5))
REFERENCE = [0, 45, 90, 145]
OVERLAP_LIMIT_MM = 2.0


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def mdiff(a, b):
    return max(abs(a[i][j] - b[i][j]) for i in range(4) for j in range(4))


def main():
    label = sys.argv[sys.argv.index("--label") + 1] if "--label" in sys.argv else "candidate"
    path = os.path.join(HERE, "extract_joint.py")
    helpers = {"__file__": path, "__name__": "helpers"}
    exec(compile(open(path, encoding="utf-8").read().replace("REPORT_SUMMARY = main()", ""), path, "exec"), helpers)

    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    reports = os.path.join(guard.ROOT, config["reports"])
    dry = json.load(open(os.path.join(reports, JOINT + ".extract_dryrun.json"), encoding="utf-8"))
    applied = json.load(open(os.path.join(reports, JOINT + ".extract_apply.json"), encoding="utf-8"))
    fit = json.load(open(os.path.join(reports, JOINT + ".pivot_fit.json"), encoding="utf-8"))
    neutral = json.load(open(os.path.join(reports, JOINT + ".neutral_offset.json"), encoding="utf-8"))
    spec = json.load(open(os.path.join(guard.ROOT, "pipeline", "specs", JOINT + ".json"), encoding="utf-8"))
    ext_hash = {r["structureId"]: r["extended_sha256"] for r in applied["structures"]}
    failures = []

    objs = {o.name: o for o in bpy.data.objects}
    by_id = {o.get("structureId"): o for o in bpy.data.objects if o.get("structureId") and o.get("role") != "anchor"}
    root, seg, pivot, ctrl = (objs.get(JOINT + s) for s in ("__root", "__seg_prox", "__pivot", "__ctrl"))
    if None in (root, seg, pivot, ctrl):
        raise RuntimeError("rig objects missing")
    role = {d["structureId"]: d["role"] for d in dry["structures"]}
    moving = sorted(s for s, r in role.items() if r in ("bone_moving", "follow", "attached_soft"))
    stationary = sorted(s for s in role if s not in moving)

    # ---- hierarchy, counts, metadata ----
    exp_parent = {s: JOINT + ("__seg_prox" if r == "bone_fixed" else "__ctrl" if s in moving else "__root") for s, r in role.items()}
    mism = [s for s, p in exp_parent.items() if (by_id[s].parent.name if by_id[s].parent else None) != p]
    chain_ok = root.parent is None and seg.parent == root and pivot.parent == seg and ctrl.parent == pivot
    rig_col, qa_col = bpy.data.collections[JOINT + "__rig"], bpy.data.collections[JOINT + "__qa"]
    qa_names = sorted(o.name for o in qa_col.objects)
    counts = {"objects": len(bpy.data.objects), "anatomy": len(by_id), "rig": sorted(o.name for o in rig_col.objects), "qa": qa_names,
              "armatures": len(bpy.data.armatures), "actions": len(bpy.data.actions),
              "constraints": {o.name: [c.type for c in o.constraints] for o in bpy.data.objects if o.constraints},
              "animation_data": [o.name for o in bpy.data.objects if o.animation_data]}
    if not chain_ok or mism:
        failures.append("hierarchy: chain_ok={} mismatches={}".format(chain_ok, mism))
    overlay_objects = list(bpy.data.collections[JOINT + "__overlay"].objects)
    counts["overlay"] = len(overlay_objects)
    if any(o.type != "EMPTY" for o in overlay_objects):
        failures.append("overlay collection contains non-empty objects")
    if counts["objects"] != 57 + len(overlay_objects) or counts["anatomy"] != 49 or len(counts["rig"]) != 4 or len(qa_names) != 4 or counts["armatures"] or counts["actions"] or counts["animation_data"]:
        failures.append("counts: {}".format(counts))
    if counts["constraints"] != {ctrl.name: ["LIMIT_ROTATION"]}:
        failures.append("constraints: {}".format(counts["constraints"]))
    if not all(o.get("qa") is True and o.get("export") is False for o in qa_col.objects):
        failures.append("QA tags missing")
    if json.loads(ctrl["dofs"]) != spec["rig"]["dofs"]:
        failures.append("controller dofs differ from spec")
    offset = float(pivot["neutral_offset_deg"])
    if abs(offset - float(neutral["neutral_offset_deg"])) > 1e-9 or abs(float(ctrl["source_pose_flexion_deg"]) - offset) > 1e-9:
        failures.append("neutral offset metadata mismatch")

    mesh_ok = sum(1 for s, o in by_id.items() if helpers["extended_mesh_hash"](o.data) == ext_hash[s] and o.data.users == 1)
    if mesh_ok != 49:
        failures.append("mesh hashes {}/49".format(mesh_ok))

    point = Vector(pivot.matrix_world.translation)
    axis = pivot.matrix_world.to_3x3().col[0].normalized()
    axis_np, point_np = np.array(axis), np.array(point)
    axis_vs_fit = fits.angle_deg(axis_np, fit["final"]["flexion_axis_world"], True)
    point_vs_fit_mm = float(np.linalg.norm(point_np - np.array(fit["final"]["point"]))) * 1000
    if axis_vs_fit > 1e-3 or point_vs_fit_mm > 1e-3:
        failures.append("pivot differs from the approved fit")

    # ---- rest (source) geometry, captured at flexion = offset where every anatomy object is at identity ----
    def set_flexion(deg):
        ctrl.rotation_euler = (math.radians(deg), 0.0, 0.0)
        bpy.context.view_layer.update()

    set_flexion(offset)
    src_err = max(mdiff(by_id[s].matrix_world, Matrix.Identity(4)) for s in by_id)
    if src_err > 1e-5:
        failures.append("source pose not reproduced at flexion=offset ({})".format(src_err))
    rest_v = {s: fits.world_verts(by_id[s]) for s in ("radius_r", "ulna_r")}
    hand_ids = [s for s in moving if role[s] == "follow"]
    hand_v = np.vstack([fits.world_verts(by_id[s]) for s in hand_ids])
    targets = {k: fits.bvh_world(by_id[k]) for k in ("humerus_r", "scapula_r", "clavicle_r")}
    lm = neutral["landmarks"]
    gh, epi_mid, styloid = np.array(lm["glenohumeral_centre"]), np.array(lm["epicondyle_midpoint"]), np.array(lm["ulnar_styloid"])
    hum_isb = epi_mid - gh
    shaft_h, shaft_u = np.array(fit["source_pose"]["humerus_shaft_dir"]), np.array(fit["source_pose"]["ulna_shaft_dir"])

    # ulna region classification in its source position (proximal end = max projection opposite to the shaft direction)
    U = rest_v["ulna_r"]
    along_u = U @ (-shaft_u)
    prox_u = along_u.max()

    def signed_flex(h_dir, f_dir):
        p = lambda v: fits.unit(v - np.dot(v, axis_np) * axis_np)
        u, v = p(h_dir), p(f_dir)
        return math.degrees(math.atan2(np.dot(np.cross(u, v), axis_np), np.dot(u, v)))

    def ulna_region(idx):
        depth = (prox_u - along_u[idx]) * 1000
        side = "posterior" if np.dot(U[idx] - point_np, np.array(pivot.matrix_world.to_3x3().col[2])) < 0 else "anterior"
        if depth <= 12 and side == "posterior":
            return "olecranon (proximal-posterior ulna, {:.1f} mm from tip)".format(depth)
        if side == "anterior":
            return "coronoid process / trochlear notch anterior (depth {:.1f} mm)".format(depth)
        return "trochlear notch posterior (depth {:.1f} mm)".format(depth)

    def humerus_region(loc):
        v = np.array(loc) - point_np
        y_ext = np.array(pivot.matrix_world.to_3x3().col[1])
        z_ext = np.array(pivot.matrix_world.to_3x3().col[2])
        up = -float(v @ y_ext) * 1000        # above the pivot along the humerus
        ant = float(v @ z_ext) * 1000
        lat = float(v @ axis_np) * 1000
        fossa = "olecranon fossa (posterior)" if ant < 0 else ("radial fossa (anterior-lateral)" if lat > 0 else "coronoid fossa (anterior-medial)")
        if up < 5:
            fossa = "trochlea/capitulum articular region"
        return {"fossa": fossa, "above_pivot_mm": round(up, 1), "anterior_mm": round(ant, 1), "lateral_mm": round(lat, 1)}

    rest_mats = {}
    set_flexion(0)
    rest_mats = {s: by_id[s].matrix_world.copy() for s in stationary}
    rig_rest = {o.name: o.matrix_world.copy() for o in (root, seg, pivot)} | {o.name: o.matrix_world.copy() for o in qa_col.objects}
    rel0 = (by_id["radius_r"].matrix_world.inverted() @ by_id["ulna_r"].matrix_world, by_id["ulna_r"].matrix_world.inverted() @ by_id["capitate_r"].matrix_world)

    poses = {}
    for deg in SWEEP:
        set_flexion(deg)
        delta = deg - offset
        R = fits.rotation_about_axis(axis_np, math.radians(delta))
        expected = Matrix.Translation(point) @ Matrix(R.tolist()).to_4x4() @ Matrix.Translation(-point)
        stat_err = max(mdiff(by_id[s].matrix_world, rest_mats[s]) for s in stationary)
        rig_err = max(mdiff(objs[n].matrix_world, m) for n, m in rig_rest.items())
        drv_err = max(mdiff(by_id[s].matrix_world, expected) for s in moving)
        piv_disp = max((by_id[s].matrix_world @ point - point).length for s in moving) * 1000
        rel_err = max(mdiff(by_id["radius_r"].matrix_world.inverted() @ by_id["ulna_r"].matrix_world, rel0[0]),
                      mdiff(by_id["ulna_r"].matrix_world.inverted() @ by_id["capitate_r"].matrix_world, rel0[1]))
        mw_u = np.array(by_id["ulna_r"].matrix_world)
        styloid_pose = mw_u[:3, :3] @ styloid + mw_u[:3, 3]
        isb_flex = signed_flex(hum_isb, styloid_pose - epi_mid)
        shaft_flex = signed_flex(shaft_h, R @ shaft_u)

        overlaps = {}
        for group, V in (("ulna", rest_v["ulna_r"]), ("radius", rest_v["radius_r"]), ("hand", hand_v)):
            P = (V - point_np) @ R.T + point_np
            group_out = {}
            for tname, bvh in targets.items():
                u, s = fits.nearest(bvh, P, 0.01)
                fin = np.isfinite(s)
                worst = float(max(0.0, -s[fin].min())) if fin.any() else 0.0
                entry = {"max_overlap_mm": round(worst * 1000, 3), "vertices_over_0_5mm": int((s[fin] < -0.0005).sum()),
                         "vertices_over_2mm": int((s[fin] < -0.002).sum()), "min_distance_mm": round(float(u[fin].min()) * 1000, 3) if fin.any() else None}
                if worst > 0.0 and tname == "humerus_r" and group in ("ulna", "radius"):
                    i = int(np.argmin(np.where(fin, s, np.inf)))
                    loc = bvh.find_nearest(P[i].tolist(), 0.01)[0]
                    entry["humerus_contact"] = humerus_region(loc)
                    entry["forearm_contact"] = ulna_region(i) if group == "ulna" else "radial head (proximal radius)"
                group_out[tname] = entry
            overlaps[group] = group_out
        max_overlap = max(e["max_overlap_mm"] for g in overlaps.values() for e in g.values())
        poses[str(deg)] = {"isb_flexion_deg": round(isb_flex, 3), "shaft_ulna_flexion_deg": round(shaft_flex, 3), "max_overlap_mm": max_overlap,
                           "stationary_err": stat_err, "rig_qa_err": rig_err, "driven_vs_analytic_err": drv_err, "pivot_disp_mm": piv_disp,
                           "relative_err": rel_err, "overlaps": overlaps}
        if stat_err > 1e-5 or rig_err > 1e-5 or drv_err > 1e-5 or piv_disp > 1e-3 or rel_err > 1e-5:
            failures.append("pose {} transform check failed".format(deg))
        if max_overlap > OVERLAP_LIMIT_MM:
            failures.append("pose {} overlap {} mm > {} mm".format(deg, max_overlap, OVERLAP_LIMIT_MM))

    clamp = {}
    for deg in (-10, 150):
        set_flexion(deg)
        clamp[str(deg)] = round(math.degrees((pivot.matrix_world.inverted() @ ctrl.matrix_world).to_euler("XYZ").x), 6)
    if abs(clamp["-10"]) > 1e-4 or abs(clamp["150"] - 145) > 1e-4:
        failures.append("limit clamping {}".format(clamp))
    set_flexion(0)
    for deg in REFERENCE:
        if abs(poses[str(deg)]["isb_flexion_deg"] - deg) > 3.0:
            failures.append("pose {} measured ISB flexion {} deviates > 3 deg".format(deg, poses[str(deg)]["isb_flexion_deg"]))

    landmark_file = os.path.join(guard.ROOT, "qa", JOINT + ".poses.json")
    worst_pose = max(poses, key=lambda k: poses[k]["max_overlap_mm"])
    result = {
        "joint": JOINT, "label": label, "validated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
        "file": bpy.data.filepath, "file_sha256": file_sha256(bpy.data.filepath), "counts": counts, "mesh_hashes_passed": mesh_ok,
        "neutral_offset_deg": offset, "source_reproduction_err": src_err, "pivot_point": list(point), "pivot_axis": list(axis),
        "axis_vs_fit_deg": axis_vs_fit, "point_vs_fit_mm": point_vs_fit_mm, "controller_properties": {k: ctrl[k] for k in ctrl.keys()},
        "reference_poses": {k: {kk: poses[k][kk] for kk in ("isb_flexion_deg", "shaft_ulna_flexion_deg", "max_overlap_mm")} for k in map(str, REFERENCE)},
        "sweep_max_overlap_mm": {k: v["max_overlap_mm"] for k, v in poses.items()},
        "worst_pose": worst_pose, "worst_overlap_mm": poses[worst_pose]["max_overlap_mm"],
        "max_transform_errors": {"stationary": max(p["stationary_err"] for p in poses.values()), "rig_qa": max(p["rig_qa_err"] for p in poses.values()),
                                 "driven_vs_analytic": max(p["driven_vs_analytic_err"] for p in poses.values()), "pivot_disp_mm": max(p["pivot_disp_mm"] for p in poses.values()),
                                 "relative": max(p["relative_err"] for p in poses.values())},
        "limit_clamping": clamp,
        "landmark_validation": "NOT AVAILABLE" if not os.path.exists(landmark_file) else "DEFINITIONS PRESENT - NOT IMPLEMENTED",
        "failures": failures, "passed": not failures, "poses": poses,
    }
    name = JOINT + ".rig_validation" + ("" if label == "candidate" else "." + label) + ".json"
    with open(os.path.join(reports, name), "w", encoding="utf-8") as fh:
        json.dump(result, fh, indent=1, default=str)
    return result


REPORT_SUMMARY = main()
