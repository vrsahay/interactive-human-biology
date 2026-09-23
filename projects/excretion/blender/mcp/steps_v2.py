# Blender MCP pipeline, V2 (scale-specific reusable assets). One step per MCP call.
#   node tools/blender-mcp.mjs exec blender/mcp/steps_v2.py step=<name> [cams=CAM_A,CAM_B]
#
#   reset → plant → soil → leaf → stoma → leaf_internal → cell → chloroplast → stem_section
#   → xylem → root → root_hairs → waste → organise → validate → optimise → export → inspect_exports
#   preview  (renders the given cameras, isolating their asset, to blender/renders/v2/)
#
# Working file after every step; numbered versions (never overwritten) at milestones, from v008.
import importlib
import json
import os
import sys

SCRIPTS = os.path.join(PROJECT_ROOT, "blender", "scripts")  # noqa: F821
if SCRIPTS not in sys.path:
    sys.path.insert(0, SCRIPTS)


def _fresh(*names):
    return [importlib.reload(importlib.import_module(n)) for n in names]


def _milestone(step, note):
    C, V = _fresh("common", "validate")
    report = V.run(report_path=os.path.join(C.PROJECT_DIR, "docs", "qa", "v2", f"validation-{step}.json"), partial=True)
    C.save_working()
    entry = C.save_version(step, note, validation=report)
    return {"version": entry["file"], "validated": entry["validated"], "issues": report["issues"][:10],
            "warnings": report["warnings"][:6]}


# builder module, root object, version note
BUILDERS = {
    "plant": ("build_plant", "Plant", "V2 whole plant (macro)"),
    "soil": ("build_soil", "RootSoil", "V2 soil block (macro)"),
    "leaf": ("build_v2_leaf", "Leaf", "02_leaf: one leaf, veins, stalk, both surfaces (meso)"),
    "stoma": ("build_v2_stoma", "Stoma", "03_stoma: epidermis patch, stoma with guard cells (open/closed), air space (micro)"),
    "leaf_internal": ("build_v2_leaf_internal", "LeafInternal", "05_leaf_internal: leaf cross-section with air spaces, vein and stoma (micro)"),
    "cell": ("build_v2_cell", "PlantCell", "06_plant_cell: wall, membrane, cytoplasm, nucleus, chloroplasts, central vacuole (micro)"),
    "chloroplast": ("build_v2_chloroplast", "Chloroplast", "08_chloroplast: double membrane, stroma, disc stacks (subcellular)"),
    "stem_section": ("build_v2_stem_section", "StemSection", "10_stem_cross_section: bark, phloem, xylem rings, old xylem with resin (meso)"),
    "xylem": ("build_v2_xylem", "Xylem", "11_xylem: vessels, tracheids, living parenchyma, resin/gum in old xylem (micro)"),
    "root": ("build_v2_root", "Root", "14_root: root tip, root cap, root-hair zone (meso)"),
    "root_hairs": ("build_v2_root_hairs", "RootHairs", "15_root_hairs: epidermal cells, root hairs, soil particles, water films (micro)"),
    "waste": ("build_waste_visuals", "WasteVisuals", "17_waste_visuals: O2, CO2, water, vapour, waste, resin (symbols)"),
}


def _tidy_data_names(bpy, objs):
    """Mesh data named exactly like its object (glTF mesh names; no '.001' left by rebuilds).
    Orphaned data from earlier builds is purged first so the clean name is free."""
    try:
        bpy.data.orphans_purge(do_local_ids=True, do_linked_ids=True, do_recursive=True)
    except Exception:
        pass
    for ob in objs:
        if ob.type != "MESH" or ob.data.name == ob.name:
            continue
        stale = bpy.data.meshes.get(ob.name)
        if stale is not None and stale is not ob.data:
            stale.name = ob.name + "_stale"
        ob.data.name = ob.name


def step_tidy_names():
    import bpy
    (C,) = _fresh("common")
    roots = [bpy.data.objects[n] for _, n, _ in BUILDERS.values() if bpy.data.objects.get(n)]
    objs = [o for r in roots for o in C.descendants(r)]
    _tidy_data_names(bpy, objs)
    C.save_working()
    return {"renamed_check": sum(1 for o in objs if o.type == "MESH" and o.data.name != o.name)}


def step_reset():
    (C,) = _fresh("common")
    C.reset_scene()
    C.save_working()
    return {"collections": C.COLLECTION_TREE}


def step_build(key, version=True):
    import bpy
    mod_name, root_name, note = BUILDERS[key]
    C, L, M = _fresh("common", "layout", mod_name)
    old = bpy.data.objects.get(root_name)
    if old is not None:
        # rebuild in place: remove the previous copy of this asset (working file only; versions are kept)
        for ob in reversed(C.descendants(old)):
            data = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            if data is not None and getattr(data, "users", 1) == 0:
                try:
                    getattr(bpy.data, {"MESH": "meshes", "CAMERA": "cameras"}.get(ob.type, "meshes")).remove(data)
                except Exception:
                    pass
    info = M.build() or {}
    _tidy_data_names(bpy, C.descendants(bpy.data.objects[root_name]))
    out = {"asset": root_name, **(info if isinstance(info, dict) else {})}
    if version:
        out.update(_milestone(key, note))
    else:
        C.save_working()
    return out


def step_organise():
    """Lay the assets out side by side in the source file (each is reset to the origin on export)."""
    import bpy
    (C,) = _fresh("common")
    layout = {
        "Leaf": ((2.4, 1.2, 0.8), 0.6), "Stoma": ((4.0, 1.2, 0.5), 0.5), "LeafInternal": ((5.6, 1.2, 0.5), 0.35),
        "PlantCell": ((4.0, -1.0, 0.6), 0.12), "Chloroplast": ((5.6, -1.0, 0.6), 0.35),
        "StemSection": ((-2.4, 0.4, 0.75), 0.55), "Xylem": ((-4.0, 0.4, 0.6), 0.35),
        "Root": ((-2.4, -1.6, 0.4), 0.5), "RootHairs": ((-4.0, -1.6, 0.4), 0.3),
        "WasteVisuals": ((-0.45, -1.4, 1.45), 0.06),
    }
    for name, (loc, s) in layout.items():
        ob = bpy.data.objects.get(name)
        if ob is not None:
            ob.location = loc
            ob.scale = (s, s, s)
    _fresh("render_qa")[0].setup_lights()
    bpy.context.view_layer.update()
    C.save_working()
    return {"collections": {c.name: [k.name for k in c.children] for c in bpy.context.scene.collection.children}}


def step_preview(cams, morph=0.0, hide=()):
    """Render cameras for visual review, isolating each camera's asset."""
    import bpy
    C, R = _fresh("common", "render_qa")
    R.setup_lights()
    if bpy.data.objects.get("Light_Fill") is None:
        light = bpy.data.lights.new("Light_Fill", "SUN")
        light.energy = 1.2
        ob = bpy.data.objects.new("Light_Fill", light)
        C.coll("LIGHTS").objects.link(ob)
        ob.rotation_euler = (0.4, 0.0, 3.3)
    for l in bpy.data.lights:
        l.use_shadow = False   # preview only: EEVEE shadow tiling in background mode hides the geometry
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = 1000, 640
    scene.render.image_settings.file_format = "PNG"
    try:
        scene.render.engine = "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = 32
    except Exception:
        scene.render.engine = "BLENDER_WORKBENCH"
    scene.view_settings.view_transform = "Standard"
    out_dir = os.path.join(C.RENDER_DIR, "v2")
    os.makedirs(out_dir, exist_ok=True)
    roots = [n for _, n, _ in BUILDERS.values()]
    outputs = []
    hidden_extra = []
    for cam_name in cams:
        cam = bpy.data.objects.get(cam_name)
        if cam is None:
            outputs.append(f"missing {cam_name}")
            continue
        owner = cam
        while owner.parent is not None:
            owner = owner.parent
        for hn in hide:
            hob = bpy.data.objects.get(hn)
            if hob is not None and not hob.hide_render:
                hob.hide_render = True
                hidden_extra.append(hob)
        keep = {owner.name} | ({"RootSoil"} if owner.name in ("Plant",) else set())
        hidden = []
        for rn in roots:
            r = bpy.data.objects.get(rn)
            if r is None or rn in keep:
                continue
            for ob in C.descendants(r):
                if not ob.hide_render:
                    ob.hide_render = True
                    hidden.append(ob)
        # render the asset at its origin so its cameras frame it exactly
        saved = owner.matrix_world.copy()
        from mathutils import Matrix
        owner.matrix_world = Matrix.Identity(4)
        bpy.context.view_layer.update()
        for ob in C.descendants(owner):
            if ob.type == "MESH" and ob.data.shape_keys and "Open" in ob.data.shape_keys.key_blocks:
                ob.data.shape_keys.key_blocks["Open"].value = morph
        scene.camera = cam
        path = os.path.join(out_dir, cam_name + ("_morph" if morph else "") + ".png")
        scene.render.filepath = path
        bpy.ops.render.render(write_still=True)
        owner.matrix_world = saved
        for ob in hidden:
            ob.hide_render = False
        outputs.append(os.path.basename(path))
    for ob in hidden_extra:
        ob.hide_render = False
    bpy.context.view_layer.update()
    return {"renders": outputs}


def step_validate():
    C, L, V = _fresh("common", "layout", "validate")
    report = V.run(report_path=os.path.join(C.PROJECT_DIR, "docs", "qa", "blender-validation.json"))
    C.save_working()
    out = {"ok": report["ok"], "issues": report["issues"], "warnings": report["warnings"][:12],
           "placement": report["placement"], "cameras": len(report["cameras"]),
           "triangles": {k: v["triangles"] for k, v in report["assets"].items()}}
    if report["ok"]:
        out["version"] = C.save_version("validate", "V2: all scale-specific assets built and organised; full validation passed", validation=report)["file"]
    return out


def step_optimise(note=None):
    C, O, V = _fresh("common", "optimize", "validate")
    res = O.run()
    report = V.run()
    C.save_working()
    out = {"optimise": {k: res[k] for k in ("materials_merged", "purged", "over_budget", "triangles", "textures")},
           "revalidated": report["ok"], "issues": report["issues"]}
    if report["ok"]:
        out["version"] = C.save_version("optimise", note or "V2: optimised for WebGL and re-validated; this version is exported", validation=report)["file"]
    return out


def step_export(only=None):
    C, V, E = _fresh("common", "validate", "export_glb")
    res = E.run(only)
    return {k: round(v[1] / 1024, 1) for k, v in res.items()}


def step_inspect_exports():
    C, V, I = _fresh("common", "validate", "inspect_exports")
    rep = I.run()
    return {"ok": rep["ok"], "assets": {k: dict(meshes=v["meshes"], triangles=v["triangles"], kb=round(v["bytes"] / 1024, 1),
                                               problems=v["problems"]) for k, v in rep["assets"].items()}}


name = ARGS.get("step", "")  # noqa: F821
cams = [c for c in ARGS.get("cams", "").split(",") if c]  # noqa: F821
if name == "reset":
    result = {name: step_reset()}
elif name in BUILDERS:
    result = {name: step_build(name, version=ARGS.get("version", "1") != "0")}  # noqa: F821
elif name == "organise":
    result = {name: step_organise()}
elif name == "preview":
    result = {name: step_preview(cams, float(ARGS.get("morph", 0)), [h for h in ARGS.get("hide", "").split(",") if h])}  # noqa: F821
elif name == "tidy_names":
    result = {name: step_tidy_names()}
elif name == "export":
    result = {name: step_export({o for o in ARGS.get("only", "").split(",") if o} or None)}  # noqa: F821
elif name == "optimise":
    result = {name: step_optimise(ARGS.get("note"))}  # noqa: F821
elif name in ("validate", "inspect_exports"):
    result = {name: globals()["step_" + name]()}
else:
    result = {"error": "unknown step %r" % name}
