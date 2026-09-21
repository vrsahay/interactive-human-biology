"""Export a joint's web tiers from Joints_Working.blend (background Blender; NEVER saves the .blend).

  --dry-run  : resolve tier membership, report exactly what would be exported (no files except the report)
  --export   : raw GLB export per tier into qa/export/<joint>/ + raw manifest (staging only, never public/)

Tier membership (authoritative: spec structures[].tier):
  core    = core structures + rig empties (root, seg_prox, pivot, ctrl) + overlay registry/axis/forearm
            + every anchor whose parent object is exported in core
  detail  = detail structures + anchors whose parent object is a detail structure
  context = context structures (+ anchors whose parent is a context structure; none today)
  QA objects (qa=true) are excluded from every tier.
A node whose Blender parent is not in the same tier is exported at its neutral world transform and carries
manifest `attachTo` = that parent's rig/object name, so the runtime re-parents it preserving world transform.
Exporter settings are fixed; neutral pose = controller flexion 0 (true extension).
"""
import datetime
import hashlib
import json
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import guard  # noqa: E402

TIERS = ("core", "detail", "context")
EXPORTER_SETTINGS = {
    "export_format": "GLB", "use_active_scene": True, "use_selection": True, "export_extras": True, "export_yup": True,
    "export_apply": False, "export_animations": False, "export_draco_mesh_compression_enable": False,
    "export_materials": "EXPORT", "export_image_format": "AUTO", "export_cameras": False, "export_lights": False,
}


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--joint", required=True)
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--export", action="store_true")
    return p.parse_args(argv)


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def to_yup(v):
    return [float(v[0]), float(v[2]), float(-v[1])]


def matrix_to_yup(m):
    """Blender world matrix (Z-up) -> glTF world matrix (Y-up), column-major list of 16."""
    import mathutils
    c = mathutils.Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))
    g = c @ m @ c.inverted()
    return [g[r][col] for col in range(4) for r in range(4)]


def triangles(ob):
    me = ob.data
    me.calc_loop_triangles()
    return len(me.loop_triangles)


def world_bbox_yup(ob):
    me = ob.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    mw = np.array(ob.matrix_world)
    w = co @ mw[:3, :3].T + mw[:3, 3]
    y = np.c_[w[:, 0], w[:, 2], -w[:, 1]]
    return [float(v) for v in y.min(0)], [float(v) for v in y.max(0)]


def used_materials(ob):
    counts = {}
    for p in ob.data.polygons:
        counts[p.material_index] = counts.get(p.material_index, 0) + 1
    return sorted({ob.material_slots[i].material.name for i, n in counts.items() if n > 0 and i < len(ob.material_slots) and ob.material_slots[i].material})


def material_images(mat_name):
    mat = bpy.data.materials[mat_name]
    images, seen = set(), set()

    def walk(tree):
        if tree is None or tree.name in seen:
            return
        seen.add(tree.name)
        for n in tree.nodes:
            if n.type == "TEX_IMAGE" and n.image:
                images.add(n.image.name)
            if n.type == "GROUP" and n.node_tree:
                walk(n.node_tree)
    walk(mat.node_tree)
    return sorted(images)


def resolve(spec, config):
    joint = spec["jointId"]
    objs = {o.name: o for o in bpy.data.objects}
    anatomy = {o.get("structureId"): o for o in bpy.data.objects if o.get("structureId") and o.get("role") not in ("anchor",) and o.type == "MESH" and o.get("qa") is not True}
    spec_ids = [s["structureId"] for s in spec["structures"]]
    problems = []
    if sorted(anatomy) != sorted(spec_ids):
        problems.append("anatomy objects != spec structures: missing={} extra={}".format(sorted(set(spec_ids) - set(anatomy)), sorted(set(anatomy) - set(spec_ids))))
    tier_of = {}
    for s in spec["structures"]:
        if s["structureId"] in anatomy:
            tier_of[anatomy[s["structureId"]].name] = s["tier"]
    for n in (joint + "__root", joint + "__seg_prox", joint + "__pivot", joint + "__ctrl"):
        tier_of[n] = "core"
    for n in (joint + "__overlay__registry", joint + "__overlay__axis", joint + "__overlay__forearm"):
        tier_of[n] = "core"
    anchors = [o for o in bpy.data.objects if o.get("role") == "anchor"]
    for a in anchors:
        parent_tier = tier_of.get(a.parent.name) if a.parent else None
        if parent_tier is None:
            problems.append("anchor {} parent {} is not exported".format(a.name, a.parent.name if a.parent else None))
        else:
            tier_of[a.name] = parent_tier
    qa = sorted(o.name for o in bpy.data.objects if o.get("qa") is True)
    unassigned = sorted(n for n in objs if n not in tier_of and n not in qa)
    if unassigned:
        problems.append("objects with no tier: {}".format(unassigned))
    for n, t in tier_of.items():
        if objs[n].get("qa") is True:
            problems.append("QA object assigned to tier: " + n)
    members = {t: sorted(n for n, tt in tier_of.items() if tt == t) for t in TIERS}
    overlap = sorted(set(members["core"]) & set(members["detail"]) | set(members["core"]) & set(members["context"]) | set(members["detail"]) & set(members["context"]))
    if overlap:
        problems.append("objects in more than one tier: {}".format(overlap))
    return objs, anatomy, tier_of, members, qa, problems


def build_report(spec, config, objs, anatomy, tier_of, members, qa):
    joint = spec["jointId"]
    stage = os.path.join(guard.ROOT, "qa", "export", joint)
    by_obj = {o.name: sid for sid, o in anatomy.items()}
    spec_by_id = {s["structureId"]: s for s in spec["structures"]}
    tiers = {}
    for t in TIERS:
        names = members[t]
        structures = []
        mats, imgs = set(), set()
        for n in names:
            if n in by_obj:
                sid = by_obj[n]
                ob = objs[n]
                um = used_materials(ob)
                mats.update(um)
                for m in um:
                    imgs.update(material_images(m))
                parent = ob.parent.name if ob.parent else None
                structures.append({"structureId": sid, "object": n, "mesh": ob.data.name, "role": spec_by_id[sid]["role"], "tier": t,
                                   "triangles": triangles(ob), "materials": um, "parent": parent,
                                   "attachTo": None if parent is None or tier_of.get(parent) == t else parent})
        anchors = [n for n in names if objs[n].get("role") == "anchor"]
        tiers[t] = {
            "output_raw": os.path.join(stage, "{}.{}.raw.glb".format(joint, t)),
            "structures": structures, "structure_count": len(structures), "triangles": sum(s["triangles"] for s in structures),
            "anchors": [{"object": n, "anchorId": objs[n]["anchorId"], "anchorType": objs[n]["anchorType"], "parent": objs[n].parent.name} for n in anchors],
            "rig_nodes": [n for n in names if n in (joint + "__root", joint + "__seg_prox", joint + "__pivot", joint + "__ctrl")],
            "overlay_data_nodes": [n for n in names if n.startswith(joint + "__overlay__")],
            "materials": sorted(mats), "textures": sorted(imgs),
            "excluded": {"qa": qa, "other_tiers": sorted(n for n, tt in tier_of.items() if tt != t)},
            "object_count": len(names),
        }
    return tiers


def main():
    args = parse_args()
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    working = os.path.normpath(os.path.join(guard.ROOT, config["working"]["path"]))
    if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(working):
        raise RuntimeError("export must run on the working file")
    working_sha_before = file_sha256(working)
    spec = json.load(open(os.path.join(guard.ROOT, "pipeline", "specs", args.joint + ".json"), encoding="utf-8"))
    ctrl = bpy.data.objects[args.joint + "__ctrl"]
    if any(abs(v) > 1e-12 for v in ctrl.rotation_euler):
        raise RuntimeError("controller must be at flexion 0 (true extension) for export")
    bpy.context.view_layer.update()

    objs, anatomy, tier_of, members, qa, problems = resolve(spec, config)
    tiers = build_report(spec, config, objs, anatomy, tier_of, members, qa)
    stage = os.path.join(guard.ROOT, "qa", "export", args.joint)
    os.makedirs(stage, exist_ok=True)
    report = {"joint": args.joint, "mode": "dry-run" if args.dry_run else "export", "generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
              "environment": env, "working_sha256": working_sha_before, "exporter_settings": EXPORTER_SETTINGS,
              "problems": problems, "tiers": tiers,
              "all_textures": sorted(set().union(*[set(t["textures"]) for t in tiers.values()])),
              "all_materials": sorted(set().union(*[set(t["materials"]) for t in tiers.values()]))}
    if args.dry_run:
        with open(os.path.join(stage, args.joint + ".export_dryrun.json"), "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=1)
        return report
    if problems:
        raise RuntimeError("export blocked: {}".format(problems))

    # ---- raw export (selection changes live only in this unsaved background session) ----
    view_layer = bpy.context.view_layer
    for t in TIERS:
        for o in view_layer.objects:
            o.select_set(False)
        for n in members[t]:
            objs[n].select_set(True)
        selected = sorted(o.name for o in view_layer.objects if o.select_get())
        if selected != members[t]:
            raise RuntimeError("selection mismatch for tier " + t)
        bpy.ops.export_scene.gltf(filepath=tiers[t]["output_raw"], **EXPORTER_SETTINGS)
        tiers[t]["raw_bytes"] = os.path.getsize(tiers[t]["output_raw"])
        tiers[t]["raw_sha256"] = file_sha256(tiers[t]["output_raw"])
    for o in view_layer.objects:
        o.select_set(False)

    # ---- raw manifest (Blender-side truth, glTF Y-up metres) ----
    joint = args.joint
    pivot = objs[joint + "__pivot"]
    reg = json.loads(objs[joint + "__overlay__registry"]["registry"])
    structures = []
    for s in spec["structures"]:
        ob = anatomy[s["structureId"]]
        bmin, bmax = world_bbox_yup(ob)
        entry = next(x for x in tiers[s["tier"]]["structures"] if x["structureId"] == s["structureId"])
        structures.append({"structureId": s["structureId"], "label": s["label"], "role": s["role"], "tier": s["tier"], "side": spec["side"],
                           "nodeName": ob.name, "meshName": ob.data.name, "triangles": entry["triangles"], "attachTo": entry["attachTo"],
                           "motionBehavior": reg["structures"][s["structureId"]]["motionBehavior"], "group": reg["structures"][s["structureId"]]["group"],
                           "neutralWorldBBox": {"min": bmin, "max": bmax}, "neutralWorldMatrix": matrix_to_yup(ob.matrix_world),
                           "materials": entry["materials"], "source": {"object": ob["src_object"], "mesh": ob["src_mesh"], "fileSha256": ob["src_file_sha256"]}})
    anchors = []
    for o in sorted((o for o in bpy.data.objects if o.get("role") == "anchor"), key=lambda o: o["anchorId"]):
        a = {"anchorId": o["anchorId"], "key": o["anchorKey"], "nodeName": o.name, "tier": tier_of[o.name], "structureId": o["structureId"],
             "label": o["label"], "anchorType": o["anchorType"], "precision": o["precision"], "displayCategory": o["displayCategory"],
             "motionBehavior": o["motionBehavior"], "parentNode": o.parent.name, "export": bool(o["export"]),
             "neutralWorldPosition": to_yup(o.matrix_world.translation),
             "blenderLocalPosition": [float(v) for v in o["localPosition"]], "labelDirectionLocalBlender": [float(v) for v in o["labelDirectionLocal"]],
             "visibility": json.loads(o["visibility"])}
        if o["anchorType"] == "band_attachment":
            a.update({"attachmentSide": o["attachmentSide"], "attachedBone": o["attachedBone"], "bandId": o["bandId"], "band": json.loads(o["band"])})
        anchors.append(a)
    pm = pivot.matrix_world
    manifest = {
        "schema": 1, "jointId": joint, "jointName": spec["jointName"], "jointType": spec["jointType"], "side": spec["side"],
        "coordinateSystem": {"space": "glTF", "up": "+Y", "units": "metres", "note": "converted from Blender Z-up (x, y, z) -> (x, z, -y)"},
        "pivot": {"node": pivot.name, "point": to_yup(pm.translation), "flexionAxisWorld": to_yup(pm.to_3x3().col[0]),
                  "trueExtensionForearmDirWorld": to_yup(pm.to_3x3().col[1]), "flexionTravelDirWorld": to_yup(pm.to_3x3().col[2]),
                  "method": spec["rig"]["pivot"]["fitted"]["method"], "report": spec["rig"]["pivot"]["fitted"]["report"]},
        "controller": {"node": joint + "__ctrl", "localAxis": "+X", "rotationSource": "node local rotation about +X (radians in glTF)",
                       "drives": json.loads(ctrl["drives"])},
        "dofs": spec["rig"]["dofs"],
        "semantics": spec["rig"]["semantics"],
        "structures": structures,
        "anchors": anchors,
        "bands": [{"bandId": bid, **b, "realLigamentMesh": {"structureId": b["structureId"], "tier": "detail", "motionBehavior": "cross_joint_stationary"}}
                  for bid, b in sorted(reg["bands"].items())],
        "bandRepresentation": spec["overlay"]["anchorConventions"]["bandRepresentation"],
        "registry": {"capabilities": reg["capabilities"], "groups": reg["groups"]},
        "motion": spec["overlay"]["motion"],
        "tiers": {t: {"url": "{}.{}.glb".format(joint, t), "nodes": members[t], "structureIds": sorted(x["structureId"] for x in tiers[t]["structures"]),
                      "triangles": tiers[t]["triangles"], "materials": tiers[t]["materials"], "textures": tiers[t]["textures"],
                      "loadTrigger": {"core": "lesson start", "detail": "idle after core or structure step", "context": "learner opt-in"}[t]} for t in TIERS},
        "budgetsKB": spec["budgets"],
        "source": {"file": config["master"]["path"].split("/")[-1], "scene": spec["sourceScene"], "sha256": config["master"]["sha256"],
                   "workingFileSha256": working_sha_before},
        "attribution": {"status": "pending licence confirmation of the source anatomy asset"},
    }
    with open(os.path.join(stage, "joint-manifest.raw.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1)
    report["manifest_raw"] = os.path.join(stage, "joint-manifest.raw.json")
    report["working_sha256_after"] = file_sha256(working)
    if report["working_sha256_after"] != working_sha_before:
        raise RuntimeError("working file changed on disk during export")
    with open(os.path.join(stage, args.joint + ".export_raw_report.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    return {"tiers": {t: {k: tiers[t][k] for k in ("output_raw", "raw_bytes", "raw_sha256", "structure_count", "triangles", "object_count")} for t in TIERS},
            "working_unchanged": True}


REPORT_SUMMARY = main()
