"""Validate a saved Joints_Working.blend against the approved dry run (runs with the WORKING file open).

  blender --background blender/Joints_Working.blend --python pipeline/blender/validate_extraction.py -- --joint elbow_r

Read-only: never saves. Writes qa/reports/<joint>.step5_validation.json.
"""
import argparse
import datetime
import json
import os
import sys

import bpy

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import guard  # noqa: E402

IDENTITY = lambda ob: all(abs(ob.matrix_world[i][j] - (1.0 if i == j else 0.0)) < 1e-6 for i in range(4) for j in range(4))


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument("--joint", required=True)
    return p.parse_args(argv)


def main():
    # extract_joint's hash helpers are reused, but importing it would run it; load only the functions.
    import importlib.util
    helpers_src = os.path.join(os.path.dirname(os.path.abspath(__file__)), "extract_joint.py")
    source = open(helpers_src, encoding="utf-8").read().replace("REPORT_SUMMARY = main()", "")
    helpers = {"__file__": helpers_src, "__name__": "extract_helpers"}
    exec(compile(source, helpers_src, "exec"), helpers)

    args = parse_args()
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    reports = os.path.join(guard.ROOT, config["reports"])
    dry = json.load(open(os.path.join(reports, args.joint + ".extract_dryrun.json"), encoding="utf-8"))
    applied = json.load(open(os.path.join(reports, args.joint + ".extract_apply.json"), encoding="utf-8"))
    ext_by_id = {r["structureId"]: r["extended_sha256"] for r in applied["structures"]}
    spec = json.load(open(os.path.join(guard.ROOT, "pipeline", "specs", args.joint + ".json"), encoding="utf-8"))

    working_path = os.path.normpath(os.path.join(guard.ROOT, config["working"]["path"]))
    failures = []
    fail = failures.append

    if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(working_path):
        fail("open file is not the working file: " + bpy.data.filepath)
    scenes = [s.name for s in bpy.data.scenes]
    if scenes != [config["working"]["scene"]]:
        fail("scenes: {}".format(scenes))

    # Collections and hierarchy
    expected_cols = set(dry["summary"]["would_create"]["collections"])
    actual_cols = {c.name for c in bpy.data.collections}
    expected_parent = {config["working"]["rootCollection"]: "<scene>", spec["collections"]["root"]: config["working"]["rootCollection"]}
    expected_parent.update({n: spec["collections"]["root"] for n in spec["collections"]["children"]})
    expected_parent.update({n: spec["jointId"] + "__geo" for n in spec["collections"]["geo"]})
    parents = {}
    for c in bpy.data.collections:
        for ch in c.children:
            parents.setdefault(ch.name, []).append(c.name)
    for ch in bpy.data.scenes[0].collection.children:
        parents.setdefault(ch.name, []).append("<scene>")
    hierarchy_ok = all(parents.get(n) == [p] for n, p in expected_parent.items())
    if actual_cols != expected_cols:
        fail("collections differ")
    if not hierarchy_ok:
        fail("collection hierarchy differs: {}".format(parents))

    # Objects
    expected_objs = {d["target_object"]: d for d in dry["structures"]}
    actual_objs = {o.name: o for o in bpy.data.objects}
    unexpected_objects = sorted(set(actual_objs) - set(expected_objs))
    missing_objects = sorted(set(expected_objs) - set(actual_objs))
    if unexpected_objects or missing_objects:
        fail("object set differs")

    rows = []
    tri_by_tier = {"core": 0, "detail": 0, "context": 0}
    count_by_tier = {"core": 0, "detail": 0, "context": 0}
    for name, d in expected_objs.items():
        ob = actual_objs.get(name)
        if ob is None:
            continue
        me = ob.data
        tris = helpers["triangle_count"](me)
        tri_by_tier[d["tier"]] += tris
        count_by_tier[d["tier"]] += 1
        row = {
            "object": name,
            "type_ok": ob.type == "MESH",
            "collection_ok": [c.name for c in ob.users_collection] == [d["target_collection"]],
            "parent_none": ob.parent is None,
            "transform_identity": IDENTITY(ob),
            "mesh_name_ok": me.name == d["target_mesh"],
            "mesh_users_1": me.users == 1,
            "local": ob.library is None and me.library is None,
            "geometry_sha256_ok": helpers["mesh_geometry_hash"](me) == d["geometry_sha256"],
            "extended_sha256_ok": helpers["extended_mesh_hash"](me) == ext_by_id[d["structureId"]],
            "triangles_ok": tris == d["triangles"],
            "props_ok": all(ob.get(k) == v for k, v in d["custom_props_to_set"].items()),
            "no_modifiers_constraints": not ob.modifiers and not ob.constraints,
        }
        for key, value in row.items():
            if key != "object" and value is not True:
                fail("{}: {}".format(name, key))
        rows.append(row)

    linked = [i.name for coll in (bpy.data.objects, bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.node_groups, bpy.data.collections)
              for i in coll if i.library is not None]
    if linked:
        fail("linked datablocks: {}".format(linked))
    if list(bpy.data.libraries):
        fail("library references present: {}".format([l.filepath for l in bpy.data.libraries]))
    unpacked = [i.name for i in bpy.data.images if not i.packed_file]
    if unpacked:
        fail("unpacked images: {}".format(unpacked))
    unexpected_datablocks = {k: len(getattr(bpy.data, k)) for k in ("cameras", "lights", "armatures", "curves", "actions") if len(getattr(bpy.data, k))}
    if unexpected_datablocks:
        fail("unexpected datablocks: {}".format(unexpected_datablocks))
    if len(bpy.data.meshes) != len(expected_objs):
        fail("mesh count {}".format(len(bpy.data.meshes)))

    passed = lambda key: sum(1 for r in rows if r[key] is True)
    result = {
        "joint": args.joint, "validated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
        "working_file": working_path, "working_file_bytes": os.path.getsize(working_path), "scene": scenes,
        "objects": {"expected": len(expected_objs), "actual": len(actual_objs), "unexpected": unexpected_objects, "missing": missing_objects},
        "objects_by_tier": count_by_tier,
        "collections": {"expected": len(expected_cols), "actual": len(actual_cols), "unexpected": sorted(actual_cols - expected_cols),
                        "missing": sorted(expected_cols - actual_cols), "hierarchy_ok": hierarchy_ok},
        "triangles": {"expected": dry["summary"]["triangles_total"], "actual": sum(tri_by_tier.values()),
                      "by_tier_expected": dry["summary"]["triangles_by_tier"], "by_tier_actual": tri_by_tier},
        "geometry_hash_passed": passed("geometry_sha256_ok"), "extended_hash_passed": passed("extended_sha256_ok"),
        "mesh_users_1": passed("mesh_users_1"), "props_passed": passed("props_ok"), "local_datablocks": passed("local"),
        "transform_identity": passed("transform_identity"),
        "materials": sorted(m.name for m in bpy.data.materials), "images": sorted(i.name for i in bpy.data.images),
        "node_groups": len(bpy.data.node_groups), "worlds": [w.name for w in bpy.data.worlds],
        "libraries": [l.filepath for l in bpy.data.libraries],
        "failures": failures, "passed": not failures,
    }
    with open(os.path.join(reports, args.joint + ".step5_validation.json"), "w", encoding="utf-8") as fh:
        json.dump({"summary": result, "objects": rows}, fh, indent=1)
    return result


REPORT_SUMMARY = main()
