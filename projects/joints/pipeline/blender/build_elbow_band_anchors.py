"""Step 8: build the four schematic collateral-ligament band anchors (run with Joints_Working.blend = v003 open).

Idempotent: ensure_band_anchors() creates missing anchors, repairs drifted ones and leaves matching ones untouched;
the build calls it twice and requires the second call to change nothing. Positions come from
lib/elbow_anchors.compute_band_anchors and must equal spec overlay.bandAnchors exactly.
Only overlay-layer data changes: 4 new empties in elbow_r__overlay + the registry JSON (bands, capability).
Saves ONLY blender/Joints_Working.step8_candidate.blend.
"""
import datetime
import hashlib
import json
import math
import os
import sys

import bpy
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import elbow_anchors  # noqa: E402
import guard  # noqa: E402

JOINT = "elbow_r"
ANATOMY_KEYS = {"structureId", "jointId", "role", "tier", "side", "label", "src_object", "src_mesh", "src_file_sha256"}


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def mat_equal(a, b, tol=1e-9):
    return all(abs(a[i][j] - b[i][j]) <= tol for i in range(4) for j in range(4))


def expected_props(spec, b, precision):
    conv = spec["overlay"]["anchorConventions"]
    return {
        "jointId": JOINT, "side": spec["side"], "role": "anchor", "qa": False, "export": b["export"],
        "anchorId": b["anchorId"], "anchorKey": b["key"], "structureId": b["structureId"], "label": b["label"],
        "anchorType": b["anchorType"], "precision": precision, "displayCategory": b["displayCategory"],
        "motionBehavior": b["motionBehavior"], "parentObject": b["parent"], "parentInverse": b["parentInverse"],
        "method": json.dumps(b["method"], sort_keys=True), "vertexIndex": b["vertexIndex"],
        "localPosition": b["localPosition"], "vertexNormalLocal": b["vertexNormalLocal"], "labelDirectionLocal": b["labelDirectionLocal"],
        "labelOffsetMm": conv["labelOffsetMm"], "leaderOriginLocal": b["leaderOriginLocal"], "labelTargetLocal": b["labelTargetLocal"],
        "visibility": json.dumps(b["visibility"], sort_keys=True),
        "attachmentSide": b["attachmentSide"], "attachedBone": b["attachedBone"], "snapFaceIndex": b["snapFaceIndex"],
        "band": json.dumps(b["band"], sort_keys=True), "bandId": b["band"]["bandId"],
        "representation": conv["bandRepresentation"]["representation"], "deformationSimulation": conv["bandRepresentation"]["deformationSimulation"],
        "contentLabel": conv["bandRepresentation"]["contentLabel"],
    }


def prop_equal(ob, key, value):
    if key not in ob:
        return False
    current = ob[key]
    if isinstance(value, list):
        return len(current) == len(value) and all(abs(float(c) - float(v)) == 0.0 for c, v in zip(current, value))
    return current == value


def ensure_band_anchors(spec, parent_inverses):
    """Create / repair / confirm the four band anchors. Returns {key: 'created'|'updated'|'unchanged'}."""
    overlay = bpy.data.collections[JOINT + "__overlay"]
    precision = spec["overlay"]["anchorConventions"]["precisionClasses"]["band_attachment"]
    status = {}
    for b in spec["overlay"]["bandAnchors"]:
        name = "{}__anchor__{}".format(JOINT, b["key"])
        parent = bpy.data.objects[b["parent"]]
        inverse = parent_inverses[b["parentInverse"]]
        basis = Matrix.Translation(Vector(b["localPosition"]))
        props = expected_props(spec, b, precision)
        ob = bpy.data.objects.get(name)
        state = "unchanged"
        if ob is None:
            ob = bpy.data.objects.new(name, None)
            ob.empty_display_type, ob.empty_display_size = "SPHERE", 0.0015
            overlay.objects.link(ob)
            state = "created"
        if [c.name for c in ob.users_collection] != [overlay.name]:
            for c in list(ob.users_collection):
                c.objects.unlink(ob)
            overlay.objects.link(ob)
            state = state if state == "created" else "updated"
        if ob.parent != parent or not mat_equal(ob.matrix_parent_inverse, inverse) or not mat_equal(ob.matrix_basis, basis):
            ob.parent = parent
            ob.matrix_parent_inverse = inverse
            ob.matrix_basis = basis
            state = state if state == "created" else "updated"
        if not ob.hide_render:
            ob.hide_render = True
            state = state if state == "created" else "updated"
        for k, v in props.items():
            if not prop_equal(ob, k, v):
                ob[k] = v
                state = state if state == "created" else "updated"
        status[b["key"]] = state
    return status


def main():
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    reports = os.path.join(guard.ROOT, config["reports"])
    working = os.path.normpath(os.path.join(guard.ROOT, config["working"]["path"]))
    v003 = working.replace(".blend", ".v003.blend")
    candidate = working.replace(".blend", ".step8_candidate.blend")

    def stop(msg):
        raise RuntimeError("STEP 8 STOPPED (nothing saved): " + msg)

    if os.path.normcase(os.path.abspath(bpy.data.filepath)) != os.path.normcase(working):
        stop("open file is not the working file")
    if file_sha256(working) != file_sha256(v003):
        stop("working file is not identical to v003")
    if os.path.exists(candidate):
        stop("candidate already exists")
    spec = json.load(open(os.path.join(guard.ROOT, "pipeline", "specs", JOINT + ".json"), encoding="utf-8"))
    overlay = bpy.data.collections[JOINT + "__overlay"]
    if len(bpy.data.objects) != 73 or len(overlay.objects) != 16:
        stop("file is not in the validated Step-7 state")

    by_id = {o.get("structureId"): o for o in bpy.data.objects if o.get("structureId") and o.get("role") != "anchor"}
    pivot, ctrl = bpy.data.objects[JOINT + "__pivot"], bpy.data.objects[JOINT + "__ctrl"]
    offset = spec["rig"]["semantics"]["neutral_offset_deg"]
    if any(abs(v) > 1e-12 for v in ctrl.rotation_euler):
        stop("controller not at flexion 0")

    # Library recomputation must equal the authoritative spec values exactly.
    computed = elbow_anchors.compute_band_anchors(spec, by_id, pivot)
    problems = elbow_anchors.band_sanity(computed, spec)
    for b in spec["overlay"]["bandAnchors"]:
        c = computed[b["key"]]
        for k in ("localPosition", "vertexNormalLocal", "labelDirectionLocal", "leaderOriginLocal", "labelTargetLocal", "snapFaceIndex", "vertexIndex"):
            if c[k] != b[k]:
                problems.append("{}: {} differs from spec".format(b["key"], k))
        if c["snapBone"] != b["attachedBone"] or c["parent"] != b["parent"]:
            problems.append(b["key"] + ": attached bone / parent differs from spec")
    if problems:
        stop("; ".join(problems))

    driven_inverse = elbow_anchors.driven_parent_inverse(pivot, offset)
    if not mat_equal(driven_inverse, by_id["ulna_r"].matrix_parent_inverse, 1e-6):
        stop("driven parent inverse differs from the forearm anatomy's parent inverse")
    parent_inverses = {"identity": Matrix.Identity(4), "driven_children": by_id["ulna_r"].matrix_parent_inverse.copy()}

    anatomy_before = {s: (o.matrix_world.copy(), o.parent.name if o.parent else None, set(o.keys())) for s, o in by_id.items()}
    first = ensure_band_anchors(spec, parent_inverses)
    second = ensure_band_anchors(spec, parent_inverses)
    if set(first.values()) != {"created"} or set(second.values()) != {"unchanged"}:
        stop("idempotency failed: first={} second={}".format(first, second))

    # Registry: capability + bands (overlay layer only)
    reg = bpy.data.objects[JOINT + "__overlay__registry"]
    registry = json.loads(reg["registry"])
    registry["capabilities"] = spec["overlay"]["registry"]["capabilities"]
    rep = spec["overlay"]["anchorConventions"]["bandRepresentation"]
    bands = {}
    for b in spec["overlay"]["bandAnchors"]:
        entry = bands.setdefault(b["band"]["bandId"], {"structureId": b["structureId"], "side": b["band"]["side"], "representation": rep["representation"],
                                                         "deformationSimulation": rep["deformationSimulation"], "contentLabel": rep["contentLabel"]})
        entry[b["attachmentSide"] + "AnchorId"] = b["anchorId"]
        registry["structures"][b["structureId"]].setdefault("bandAnchors", [])
        if b["anchorId"] not in registry["structures"][b["structureId"]]["bandAnchors"]:
            registry["structures"][b["structureId"]]["bandAnchors"].append(b["anchorId"])
    registry["bands"] = bands
    reg["registry"] = json.dumps(registry)
    bpy.context.view_layer.update()

    errors = []
    for s, o in by_id.items():
        mw, parent, keys = anatomy_before[s]
        if not mat_equal(o.matrix_world, mw, 1e-9) or (o.parent.name if o.parent else None) != parent or set(o.keys()) != keys or keys != ANATOMY_KEYS:
            errors.append(s + " anatomy object changed")
    if len(bpy.data.objects) != 77 or len(overlay.objects) != 20:
        errors.append("counts {} / overlay {}".format(len(bpy.data.objects), len(overlay.objects)))
    # Anchor positions: proximal == source position now; distal == source position at flexion = offset.
    for side, flex in (("proximal", 0.0), ("distal", offset)):
        ctrl.rotation_euler = (math.radians(flex), 0.0, 0.0)
        bpy.context.view_layer.update()
        for b in (x for x in spec["overlay"]["bandAnchors"] if x["attachmentSide"] == side):
            ob = bpy.data.objects["{}__anchor__{}".format(JOINT, b["key"])]
            err = (ob.matrix_world.translation - Vector(b["localPosition"])).length
            if err > 1e-6:
                errors.append("{} at flexion {}: {} m from its source position".format(b["key"], flex, err))
    ctrl.rotation_euler = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    if errors:
        stop("; ".join(errors))

    bpy.ops.wm.save_as_mainfile(filepath=candidate, check_existing=False, copy=True)
    report = {"joint": JOINT, "step": 8, "generated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
              "idempotency": {"first_call": first, "second_call": second}, "computed": computed, "registry_bands": bands,
              "candidate": candidate, "candidate_sha256": file_sha256(candidate), "v003_sha256": file_sha256(v003)}
    with open(os.path.join(reports, JOINT + ".band_anchor_build.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    return {"idempotency": report["idempotency"], "candidate": candidate, "candidate_sha256": report["candidate_sha256"], "registry_bands": bands}


REPORT_SUMMARY = main()
