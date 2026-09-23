# Blender MCP pipeline: one entry point, one step per MCP call.
#   node tools/blender-mcp.mjs exec blender/mcp/steps.py step=<name>
#
# Build order follows the brief's workflow (see docs/blender-mcp.md):
#   reset → plant → cell → stem → soil → waste → organise → materials → validate
#   → optimise → export → inspect_exports → render
# After every step the working file (blender/source/Excretion_in_Plants_Working.blend)
# is saved. Milestones are saved as numbered versions (blender/checkpoints/
# Excretion_in_Plants_vNNN.blend) that are never overwritten, each recorded in
# checkpoints.json with its validation result.
import importlib
import json
import os
import sys

SCRIPTS = os.path.join(PROJECT_ROOT, "blender", "scripts")  # noqa: F821
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)


def _fresh(*names):
    return [importlib.reload(importlib.import_module(n)) for n in names]


def _count(root_name):
    import bpy
    root = bpy.data.objects.get(root_name)
    if not root:
        return 0
    n, stack = 0, [root]
    while stack:
        o = stack.pop()
        n += 1
        stack.extend(o.children)
    return n


def _milestone(step, note):
    """Partial validation of what exists so far, then a new numbered version."""
    C, V = _fresh("common", "validate")
    report = V.run(report_path=os.path.join(C.PROJECT_DIR, "docs", "qa", f"blender-validation-{step}.json"), partial=True)
    C.save_working()
    entry = C.save_version(step, note, validation=report)
    return {"version": entry["file"], "validated": entry["validated"], "issues": report["issues"][:8]}


def step_reset():
    (C,) = _fresh("common")
    C.reset_scene()
    C.save_working()
    return {"collections": {k: v for k, v in C.COLLECTION_TREE.items()}}


def step_plant():
    C, L, P = _fresh("common", "layout", "build_plant")
    P.build()
    out = {"Plant objects": _count("Plant")}
    out.update(_milestone("plant", "Plant: stem, 7 branches, 33 leaves (hero leaf, old leaf with petiole pivot), roots, anchors, water and old-leaf paths, camera references"))
    return out


def step_cell():
    C, B = _fresh("common", "build_cell")
    info = B.build()
    info.update(_milestone("cell", "Plant cell: leaf tissue section + hero cell cutaway (cell wall, cytoplasm, vacuole, nucleus, chloroplasts)"))
    return info


def step_stem():
    C, B = _fresh("common", "build_stem_section")
    B.build()
    out = {"StemSection objects": _count("StemSection")}
    out.update(_milestone("stem", "Stem cross-section: bark, phloem, xylem, old xylem, pith, vessels, 16 resin/gum deposits, lifting cover"))
    return out


def step_soil():
    C, L, S = _fresh("common", "layout", "build_soil")
    S.build()
    out = {"RootSoil objects": _count("RootSoil")}
    out.update(_milestone("soil", "Root/soil view: soil block split at a cut plane (front half fades to a shell), pebbles, display base"))
    return out


def step_waste():
    C, B = _fresh("common", "build_waste_visuals")
    B.build()
    out = {"WasteVisuals objects": _count("WasteVisuals")}
    out.update(_milestone("waste", "Waste visuals: oxygen, water drop, vapour, stored waste, resin drop, soil waste particle"))
    return out


def step_organise():
    """Lay the assets side by side in the source file (each is reset to the origin on export),
    add studio lights and the QA scale reference."""
    import bpy
    (C,) = _fresh("common")
    for name, (loc, s) in {
        "PlantCell": ((3.6, 0.8, 0.45), 0.1),
        "StemSection": ((-2.4, 0.4, 0.75), 0.55),
        "WasteVisuals": ((-0.45, -1.2, 1.45), 0.06),
    }.items():
        ob = bpy.data.objects[name]
        ob.location = loc
        ob.scale = (s, s, s)
    if bpy.data.objects.get("Light_Key") is None:
        for name, energy, rot in (("Light_Key", 3.0, (0.85, 0.15, 0.55)), ("Light_Rim", 1.6, (1.2, 0.0, -2.5))):
            light = bpy.data.lights.new(name, "SUN")
            light.energy = energy
            ob = bpy.data.objects.new(name, light)
            C.coll("LIGHTS").objects.link(ob)
            ob.rotation_euler = rot
    if bpy.data.objects.get("QA_Scale_Reference_10cm") is None:
        # a 10 cm bar beside the plant: a quick visual check that the plant reads at a sensible size
        me = bpy.data.meshes.new("QA_Scale_Reference_10cm")
        me.from_pydata([(0.8, 0, 0), (0.8, 0, 0.1), (0.81, 0, 0.1), (0.81, 0, 0)], [], [(0, 1, 2, 3)])
        ob = bpy.data.objects.new("QA_Scale_Reference_10cm", me)
        C.coll("QA").objects.link(ob)
    world = bpy.data.worlds.get("World_Studio") or bpy.data.worlds.new("World_Studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = C.hex_color("#1f252f")
    bpy.context.scene.world = world
    bpy.context.view_layer.update()
    C.save_working()
    return {"collections": {c.name: [k.name for k in c.children] for c in bpy.context.scene.collection.children}}


def step_materials():
    """Material library report: every material, its colour, and what uses it."""
    import bpy
    (C,) = _fresh("common")
    lib = {}
    for m in bpy.data.materials:
        bsdf = m.node_tree.nodes.get("Principled BSDF") if m.use_nodes else None
        col = tuple(bsdf.inputs["Base Color"].default_value)[:3] if bsdf else tuple(m.diffuse_color)[:3]
        tex = any(n.type == "TEX_IMAGE" for n in m.node_tree.nodes) if m.use_nodes else False
        users = sorted(o.name for o in bpy.data.objects if o.type == "MESH" and m.name in [x.name for x in o.data.materials if x])
        lib[m.name] = dict(linear_rgb=[round(c, 3) for c in col], textured=tex,
                           roughness=round(bsdf.inputs["Roughness"].default_value, 2) if bsdf else None,
                           alpha=round(bsdf.inputs["Alpha"].default_value, 2) if bsdf else 1.0,
                           users=len(users), example=users[:3])
    unused = [k for k, v in lib.items() if not v["users"]]
    path = os.path.join(C.PROJECT_DIR, "docs", "qa", "blender-materials.json")
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(lib, fh, indent=2)
    return {"materials": len(lib), "unused": unused, "names_ok": all(k.startswith("MAT_") for k in lib)}


def step_validate():
    C, L, V = _fresh("common", "layout", "validate")
    report = V.run()
    C.save_working()
    out = {"ok": report["ok"], "issues": report["issues"], "warnings": report["warnings"][:10],
           "placement": report["placement"], "cameras": len(report["cameras"]),
           "triangles": {k: v["triangles"] for k, v in report["assets"].items()}}
    if report["ok"]:
        out["version"] = C.save_version("validate", "All assets built and organised; full validation passed", validation=report)["file"]
    return out


def step_optimise():
    C, O, V = _fresh("common", "optimize", "validate")
    res = O.run()
    report = V.run()
    C.save_working()
    out = {"optimise": {k: res[k] for k in ("materials_merged", "purged", "over_budget", "triangles")},
           "revalidated": report["ok"], "issues": report["issues"]}
    if report["ok"]:
        out["version"] = C.save_version("optimise", "Optimised for WebGL and re-validated; this version is exported", validation=report)["file"]
    return out


def step_export():
    C, V, E = _fresh("common", "validate", "export_glb")
    res = E.run()
    return {k: round(v[1] / 1024, 1) for k, v in res.items()}


def step_inspect_exports():
    C, V, I = _fresh("common", "validate", "inspect_exports")
    rep = I.run()
    return {"ok": rep["ok"], "assets": {k: dict(meshes=v["meshes"], triangles=v["triangles"], kb=round(v["bytes"] / 1024, 1),
                                               problems=v["problems"]) for k, v in rep["assets"].items()}}


def step_render():
    C, R = _fresh("common", "render_qa")
    return {"renders": [os.path.basename(p) for p in R.run()]}


STEPS = {
    "reset": step_reset, "plant": step_plant, "cell": step_cell, "stem": step_stem, "soil": step_soil,
    "waste": step_waste, "organise": step_organise, "materials": step_materials, "validate": step_validate,
    "optimise": step_optimise, "export": step_export, "inspect_exports": step_inspect_exports, "render": step_render,
}
BUILD = ("reset", "plant", "cell", "stem", "soil", "waste", "organise", "materials", "validate", "optimise",
         "export", "inspect_exports")

name = ARGS.get("step", "")  # noqa: F821
if name == "all":
    result = {key: STEPS[key]() for key in BUILD}
elif name in STEPS:
    result = {name: STEPS[name]()}
else:
    result = {"error": "unknown step %r" % name, "steps": sorted(STEPS)}
