"""Extract a joint's structures from the master into Joints_Working.blend.

Run inside Blender with the MASTER open (background), e.g. through the Blender MCP tool
`execute_blender_code_for_cli`, or:
  blender --background <master> --python pipeline/blender/extract_joint.py -- --joint elbow_r --dry-run

--dry-run reads data and writes reports; it never calls bpy.ops, never assigns to Blender data, and never saves.

--apply (step 5, approved) re-verifies the master and the dry-run, then in the same background session:
  1. hashes every source mesh (must equal the dry-run hashes),
  2. replaces the in-memory session with an empty factory file (the master is never saved),
  3. appends exactly the dry-run meshes (link=False -> local copies) and creates one object per mesh,
  4. verifies geometry, mesh users and custom properties, and saves Joints_Working.blend only if every check passed.
It refuses to overwrite an existing working file.
"""
import argparse
import datetime
import hashlib
import json
import os
import re
import sys

import bpy
import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))
import guard  # noqa: E402

ROLE_TOKEN = {"bone_fixed": "bone", "bone_moving": "bone", "follow": "follow", "tracked": "tracked",
              "spanning_soft": "soft", "attached_soft": "soft", "context": "context"}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    p = argparse.ArgumentParser()
    p.add_argument("--joint", required=True)
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    return p.parse_args(argv)


def extended_mesh_hash(me):
    """Hash of everything step 5 must not change: positions, topology, material indices, UVs, corner normals, attribute layout."""
    h = hashlib.sha256()

    def add(collection, attr, dtype, width):
        data = np.empty(len(collection) * width, dtype=dtype)
        if len(collection):
            collection.foreach_get(attr, data)
        h.update(attr.encode())
        h.update(data.tobytes())

    add(me.vertices, "co", np.float32, 3)
    add(me.edges, "vertices", np.int32, 2)
    add(me.loops, "vertex_index", np.int32, 1)
    add(me.loops, "edge_index", np.int32, 1)
    add(me.polygons, "loop_start", np.int32, 1)
    add(me.polygons, "material_index", np.int32, 1)
    for uv in me.uv_layers:
        h.update(uv.name.encode())
        data = np.empty(len(uv.data) * 2, dtype=np.float32)
        uv.data.foreach_get("uv", data)
        h.update(data.tobytes())
    h.update(str(me.uv_layers.active.name if me.uv_layers.active else None).encode())
    normals = np.empty(len(me.loops) * 3, dtype=np.float32)
    me.corner_normals.foreach_get("vector", normals)
    h.update(normals.tobytes())
    h.update(json.dumps(sorted((a.name, a.domain, a.data_type) for a in me.attributes)).encode())
    h.update(json.dumps([m.name if m else None for m in me.materials]).encode())
    return h.hexdigest()


def triangle_count(me):
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def mesh_geometry_hash(me):
    co = np.empty(len(me.vertices) * 3, dtype=np.float32)
    me.vertices.foreach_get("co", co)
    loops = np.empty(len(me.loops), dtype=np.int32)
    me.loops.foreach_get("vertex_index", loops)
    h = hashlib.sha256()
    h.update(co.tobytes())
    h.update(loops.tobytes())
    return h.hexdigest()


def node_tree_deps(tree, images, groups, seen):
    if tree is None or tree.name in seen:
        return
    seen.add(tree.name)
    for node in tree.nodes:
        if node.type == "TEX_IMAGE" and node.image:
            images.add(node.image.name)
        if node.type == "GROUP" and node.node_tree:
            groups.add(node.node_tree.name)
            node_tree_deps(node.node_tree, images, groups, seen)


def estimate_mesh_bytes(me):
    # Rough .blend storage estimate: positions, edges, corner verts/edges, face offsets, UVs, normals cache excluded.
    uv = len(me.uv_layers) * len(me.loops) * 8
    return len(me.vertices) * 12 + len(me.edges) * 8 + len(me.loops) * 8 + len(me.polygons) * 4 + uv


def main():
    args = parse_args()
    if args.apply:
        return apply(args)
    return dry_run(args)


def dry_run(args):
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=True)
    with open(os.path.join(guard.ROOT, "pipeline", "specs", args.joint + ".json"), encoding="utf-8") as fh:
        spec = json.load(fh)

    scene = bpy.data.scenes[spec["sourceScene"]]
    scene_objects = {o.name: o for o in scene.objects}
    errors, warnings = [], []
    rows, meshes_seen = [], {}
    materials, images, groups = set(), set(), set()

    ids = [s["structureId"] for s in spec["structures"]]
    for dup in sorted({i for i in ids if ids.count(i) > 1}):
        errors.append("Duplicate structureId in spec: " + dup)
    srcs = [s["src"] for s in spec["structures"]]
    for dup in sorted({i for i in srcs if srcs.count(i) > 1}):
        errors.append("Duplicate source object in spec: " + dup)

    for s in spec["structures"]:
        ob = scene_objects.get(s["src"])
        slug = re.sub(r"_r$|_l$", "", s["structureId"])
        target = "{}__{}__{}".format(spec["jointId"], ROLE_TOKEN[s["role"]], slug)
        row = {"structureId": s["structureId"], "src": s["src"], "target_object": target, "target_mesh": target + "__mesh",
               "target_collection": s["collection"], "role": s["role"], "tier": s["tier"], "label": s["label"], "found": ob is not None}
        if ob is None:
            errors.append("Source object not found in scene '{}': {}".format(scene.name, s["src"]))
            rows.append(row)
            continue
        me = ob.data
        if ob.type != "MESH":
            errors.append("{} is {} not MESH".format(s["src"], ob.type))
        identity = all(abs(ob.matrix_world[i][j] - (1.0 if i == j else 0.0)) < 1e-6 for i in range(4) for j in range(4))
        if not identity:
            errors.append("{} has a non-identity world matrix".format(s["src"]))
        if ob.modifiers or ob.constraints or (me.shape_keys is not None) or ob.vertex_groups:
            warnings.append("{} has modifiers/constraints/shape keys/vertex groups".format(s["src"]))
        me.calc_loop_triangles()
        slot_polys = {}
        for p in me.polygons:
            slot_polys[p.material_index] = slot_polys.get(p.material_index, 0) + 1
        slots = []
        for i, slot in enumerate(ob.material_slots):
            mat = slot.material
            slots.append({"index": i, "material": mat.name if mat else None, "link": slot.link, "polygons": slot_polys.get(i, 0)})
            if mat:
                materials.add(mat.name)
                node_tree_deps(mat.node_tree, images, groups, set())
        pts = [ob.matrix_world @ v.co for v in me.vertices]
        bmin = [min(p[k] for p in pts) for k in range(3)]
        bmax = [max(p[k] for p in pts) for k in range(3)]
        centre_x = (bmin[0] + bmax[0]) / 2
        if spec["side"] == "right" and centre_x >= 0:
            errors.append("{} centre x={:.4f} is not on the right side (x<0)".format(s["src"], centre_x))
        mesh_users = [o.name for o in bpy.data.objects if o.data == me]
        if me.name in meshes_seen:
            errors.append("{} shares mesh {} with {}".format(s["src"], me.name, meshes_seen[me.name]))
        meshes_seen[me.name] = s["src"]
        row.update({
            "object_type": ob.type, "source_collection": ob.users_collection[0].name if ob.users_collection else None,
            "source_parent": ob.parent.name if ob.parent else None, "world_matrix_identity": identity,
            "source_mesh": me.name, "source_mesh_users": len(mesh_users), "source_mesh_shared_with": [n for n in mesh_users if n != ob.name],
            "vertices": len(me.vertices), "edges": len(me.edges), "faces": len(me.polygons), "triangles": len(me.loop_triangles),
            "uv_layers": [uv.name for uv in me.uv_layers], "material_slots": slots,
            "bbox_min": [round(v, 4) for v in bmin], "bbox_max": [round(v, 4) for v in bmax],
            "geometry_sha256": mesh_geometry_hash(me), "est_mesh_bytes": estimate_mesh_bytes(me),
            "custom_props_to_set": {"structureId": s["structureId"], "jointId": spec["jointId"], "role": s["role"], "tier": s["tier"],
                                    "side": spec["side"], "label": s["label"], "src_object": ob.name, "src_mesh": me.name,
                                    "src_file_sha256": config["master"]["sha256"]},
        })
        rows.append(row)

    image_rows = []
    for name in sorted(images):
        img = bpy.data.images[name]
        image_rows.append({"name": name, "size": list(img.size), "packed": bool(img.packed_file),
                           "packed_bytes": img.packed_file.size if img.packed_file else 0, "filepath": img.filepath})
    material_rows = []
    for name in sorted(materials):
        m = bpy.data.materials[name]
        imgs, grps = set(), set()
        node_tree_deps(m.node_tree, imgs, grps, set())
        used_by = [r["structureId"] for r in rows if any(sl["material"] == name and sl["polygons"] > 0 for sl in r.get("material_slots", []))]
        material_rows.append({"name": name, "images": sorted(imgs), "node_groups": sorted(grps),
                              "structures_with_faces": len(used_by), "slot_only_no_faces": len(used_by) == 0})

    by = lambda key: {k: sum(1 for r in rows if r.get(key) == k) for k in sorted({r.get(key) for r in rows})}
    tri_by_tier = {t: sum(r.get("triangles", 0) for r in rows if r["tier"] == t) for t in ("core", "detail", "context")}
    summary = {
        "joint": spec["jointId"], "mode": "dry-run", "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "environment": env, "errors": errors, "warnings": warnings,
        "structures": len(rows), "found": sum(1 for r in rows if r["found"]),
        "by_tier": by("tier"), "by_role": by("role"), "by_collection": by("target_collection"),
        "triangles_by_tier": tri_by_tier, "triangles_total": sum(tri_by_tier.values()),
        "vertices_total": sum(r.get("vertices", 0) for r in rows),
        "source_meshes_shared_with_other_objects": sum(1 for r in rows if r.get("source_mesh_users", 1) > 1),
        "would_append": {"meshes": len(meshes_seen), "materials": sorted(materials), "images": [i["name"] for i in image_rows],
                         "node_groups": sorted(groups)},
        "would_create": {"file": config["working"]["path"], "scene": config["working"]["scene"],
                         "collections": [config["working"]["rootCollection"], spec["collections"]["root"]] + spec["collections"]["children"] + spec["collections"]["geo"],
                         "objects": len(rows), "empties": 0,
                         "note": "Rig and overlay empties (elbow_r__rig / __overlay / __qa contents) are created in steps 6-8, not by extraction."},
        "not_appended": ["source objects (new objects are created for appended meshes)", "system parent empties (e.g. '02 Skeletal system')",
                         "source collections", "other scenes, cameras, lights, worlds", "Cutaway / Organ-study copies"],
        "estimates": {"mesh_bytes": sum(r.get("est_mesh_bytes", 0) for r in rows),
                      "packed_image_bytes": sum(i["packed_bytes"] for i in image_rows)},
    }
    report = {"summary": summary, "structures": rows, "materials": material_rows, "images": image_rows}

    out_dir = os.path.join(guard.ROOT, config["reports"])
    os.makedirs(out_dir, exist_ok=True)
    base = os.path.join(out_dir, spec["jointId"] + ".extract_dryrun")
    with open(base + ".json", "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    return summary


def apply(args):
    config = guard.load_config()
    env_before = guard.check_environment(config, expect_master_open=True)
    master_path = config["master"]["path"]
    reports = os.path.join(guard.ROOT, config["reports"])
    with open(os.path.join(guard.ROOT, "pipeline", "specs", args.joint + ".json"), encoding="utf-8") as fh:
        spec = json.load(fh)
    with open(os.path.join(reports, args.joint + ".extract_dryrun.json"), encoding="utf-8") as fh:
        dry = json.load(fh)
    errors = []

    def stop(message):
        raise RuntimeError("STEP 5 STOPPED (nothing saved): " + message)

    # 1. The dry run is the source of truth: it must be clean and match the spec exactly.
    if dry["summary"]["errors"] or dry["summary"]["found"] != len(spec["structures"]):
        stop("dry-run report is not clean")
    for s, d in zip(spec["structures"], dry["structures"]):
        if (s["src"], s["structureId"], s["collection"], s["role"], s["tier"]) != (d["src"], d["structureId"], d["target_collection"], d["role"], d["tier"]):
            stop("spec and dry-run disagree at " + s["structureId"])
    if len(spec["structures"]) != len(dry["structures"]):
        stop("spec and dry-run structure counts differ")

    working_path = os.path.normpath(os.path.join(guard.ROOT, config["working"]["path"]))
    if os.path.exists(working_path):
        stop("working file already exists: " + working_path)

    # 2. Source verification in the master (read-only).
    scene = bpy.data.scenes[spec["sourceScene"]]
    src_objects = {o.name: o for o in scene.objects}
    source = {}
    for d in dry["structures"]:
        ob = src_objects.get(d["src"])
        if ob is None or ob.type != "MESH":
            stop("source object missing: " + d["src"])
        me = ob.data
        if me.name != d["source_mesh"]:
            stop("source mesh name changed for {}: {} != {}".format(d["src"], me.name, d["source_mesh"]))
        if mesh_geometry_hash(me) != d["geometry_sha256"]:
            stop("source geometry hash differs from dry run: " + d["src"])
        if any(slot.link != "DATA" for slot in ob.material_slots):
            stop("object-linked material slot on " + d["src"])
        identity = all(abs(ob.matrix_world[i][j] - (1.0 if i == j else 0.0)) < 1e-6 for i in range(4) for j in range(4))
        if not identity:
            stop("source world matrix is not identity: " + d["src"])
        source[d["structureId"]] = {"extended_sha256": extended_mesh_hash(me), "triangles": triangle_count(me)}

    # 3. Replace the in-memory session with an empty factory file. The master on disk is never written.
    bpy.ops.wm.read_homefile(use_factory_startup=True, use_empty=True)
    if len(bpy.data.objects) or len(bpy.data.meshes) or len(bpy.data.materials) or len(bpy.data.images):
        stop("empty session is not empty")
    if len(bpy.data.scenes) != 1:
        stop("expected exactly one scene in the empty session")
    work_scene = bpy.data.scenes[0]
    work_scene.name = config["working"]["scene"]

    # 4. Collections, exactly as the approved dry run lists them.
    root = bpy.data.collections.new(config["working"]["rootCollection"])
    work_scene.collection.children.link(root)
    joint_col = bpy.data.collections.new(spec["collections"]["root"])
    root.children.link(joint_col)
    cols = {root.name: root, joint_col.name: joint_col}
    for name in spec["collections"]["children"]:
        cols[name] = bpy.data.collections.new(name)
        joint_col.children.link(cols[name])
    geo_parent = cols[spec["jointId"] + "__geo"]
    for name in spec["collections"]["geo"]:
        cols[name] = bpy.data.collections.new(name)
        geo_parent.children.link(cols[name])
    expected_cols = dry["summary"]["would_create"]["collections"]
    if sorted(c.name for c in bpy.data.collections) != sorted(expected_cols):
        stop("collection names differ from dry run: {}".format(sorted(c.name for c in bpy.data.collections)))

    # 5. Append exactly the approved meshes as local copies.
    wanted = [d["source_mesh"] for d in dry["structures"]]
    with bpy.data.libraries.load(master_path, link=False) as (data_from, data_to):
        missing = [m for m in wanted if m not in data_from.meshes]
        if missing:
            stop("meshes missing in master library: {}".format(missing))
        data_to.meshes = list(wanted)
    appended = dict(zip(wanted, data_to.meshes))

    created = []
    for d in dry["structures"]:
        me = appended.get(d["source_mesh"])
        if me is None:
            stop("append failed for " + d["source_mesh"])
        if me.library is not None:
            stop("mesh is linked, not local: " + d["source_mesh"])
        ob = bpy.data.objects.new(d["target_object"], me)
        if ob.name != d["target_object"]:
            stop("object name collision: {} became {}".format(d["target_object"], ob.name))
        cols[d["target_collection"]].objects.link(ob)
        for key, value in d["custom_props_to_set"].items():
            ob[key] = value
        me.name = d["target_mesh"]
        if me.name != d["target_mesh"]:
            stop("mesh rename failed: {} -> {}".format(d["target_mesh"], me.name))
        created.append((d, ob))

    # 6. Verification before saving.
    checks = []
    for d, ob in created:
        me = ob.data
        row = {
            "structureId": d["structureId"], "object": ob.name, "mesh": me.name, "collection": ob.users_collection[0].name,
            "mesh_users": me.users, "triangles": triangle_count(me),
            "geometry_sha256_ok": mesh_geometry_hash(me) == d["geometry_sha256"],
            "extended_sha256_ok": extended_mesh_hash(me) == source[d["structureId"]]["extended_sha256"],
            "triangles_ok": triangle_count(me) == d["triangles"] == source[d["structureId"]]["triangles"],
            "props_ok": all(ob.get(k) == v for k, v in d["custom_props_to_set"].items()),
            "transform_identity": all(abs(ob.matrix_world[i][j] - (1.0 if i == j else 0.0)) < 1e-6 for i in range(4) for j in range(4)),
            "extended_sha256": source[d["structureId"]]["extended_sha256"],
        }
        for key in ("geometry_sha256_ok", "extended_sha256_ok", "triangles_ok", "props_ok", "transform_identity"):
            if row[key] is not True:
                errors.append("{}: {} failed".format(d["structureId"], key))
        if row["mesh_users"] != 1:
            errors.append("{}: mesh has {} users".format(d["structureId"], row["mesh_users"]))
        checks.append(row)
    linked_ids = [id_.name for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.objects, bpy.data.node_groups)
                  for id_ in coll if id_.library is not None]
    if linked_ids:
        errors.append("linked (non-local) datablocks present: {}".format(linked_ids))
    if len(bpy.data.objects) != len(dry["structures"]) or len(bpy.data.meshes) != len(dry["structures"]):
        errors.append("object/mesh count mismatch: {} objects, {} meshes".format(len(bpy.data.objects), len(bpy.data.meshes)))
    unpacked = [i.name for i in bpy.data.images if not i.packed_file]
    if unpacked:
        errors.append("images not packed after append: {}".format(unpacked))

    report = {
        "joint": spec["jointId"], "mode": "apply", "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
        "environment_before": env_before, "working_path": working_path, "errors": errors, "structures": checks,
        "datablocks": {"scenes": [s.name for s in bpy.data.scenes], "collections": len(bpy.data.collections), "objects": len(bpy.data.objects),
                       "meshes": len(bpy.data.meshes), "materials": sorted(m.name for m in bpy.data.materials),
                       "images": sorted(i.name for i in bpy.data.images), "node_groups": len(bpy.data.node_groups),
                       "cameras": len(bpy.data.cameras), "lights": len(bpy.data.lights), "worlds": [w.name for w in bpy.data.worlds],
                       "libraries_after_append": [lib.filepath for lib in bpy.data.libraries]},
        "saved": False,
    }
    if errors:
        with open(os.path.join(reports, spec["jointId"] + ".extract_apply.json"), "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=1)
        stop("{} verification error(s): {}".format(len(errors), errors[:5]))

    # 7. Save ONLY the working file (new path, so no .blend1 backup is created).
    os.makedirs(os.path.dirname(working_path), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=working_path, check_existing=False, copy=False)
    report["saved"] = True
    report["saved_bytes"] = os.path.getsize(working_path)
    report["environment_after"] = guard.check_environment(config, expect_master_open=False)
    with open(os.path.join(reports, spec["jointId"] + ".extract_apply.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    return {k: report[k] for k in ("joint", "mode", "working_path", "errors", "datablocks", "saved", "saved_bytes", "environment_before", "environment_after")}


REPORT_SUMMARY = main()
