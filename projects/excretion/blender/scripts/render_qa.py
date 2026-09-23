"""
QA preview renders from the authored camera references.

These are for inspecting the assets from the exact viewpoints the lesson uses
(they are NOT learner-facing). Output: blender/renders/*.png
"""

import os

import bpy

import common as C

SHOTS = [
    # camera, objects hidden for the shot, output name
    ("CAM_Plant_Wide", [], "01_plant_wide"),
    ("CAM_Leaf_Hero", [], "02_leaf_hero"),
    ("CAM_Roots", ["Soil_Front"], "03_roots_below_ground"),
    ("CAM_Leaf_Old", [], "04_old_leaf"),
    ("CAM_Stem_Cut", [], "05_stem_cut_location"),
    ("CAM_Tissue_Wide", [], "06_tissue"),
    ("CAM_Cell", [], "07_cell_cutaway"),
    ("CAM_Vacuole", [], "08_vacuole"),
    ("CAM_Stem_Intact", [], "09_stem_intact"),
    ("CAM_Stem_Top", ["Stem_Cover"], "10_stem_section_open"),
    ("CAM_Plant_Intro", [], "11_plant_intro"),
]


def setup_lights():
    """Film-stage look: dark studio, warm key + cool rim (matches the web runtime)."""
    scene = bpy.context.scene
    if bpy.data.objects.get("Light_Key") is None:
        for name, energy, rot in (("Light_Key", 3.0, (0.85, 0.15, 0.55)), ("Light_Rim", 1.6, (1.2, 0.0, -2.5))):
            light = bpy.data.lights.new(name, "SUN")
            light.energy = energy
            ob = bpy.data.objects.new(name, light)
            C.coll("LIGHTS").objects.link(ob)
            ob.rotation_euler = rot
    world = bpy.data.worlds.get("World_Studio") or bpy.data.worlds.new("World_Studio")
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = C.hex_color("#1f252f")
        bg.inputs[1].default_value = 1.0
    scene.world = world


def run(width=960, height=540):
    setup_lights()
    scene = bpy.context.scene
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.image_settings.file_format = "PNG"
    try:
        scene.render.engine = "BLENDER_EEVEE"
        scene.eevee.taa_render_samples = 24
    except Exception:
        scene.render.engine = "BLENDER_WORKBENCH"
    scene.view_settings.view_transform = "Standard"

    outputs = []
    for cam_name, hide, out in SHOTS:
        cam = bpy.data.objects.get(cam_name)
        if cam is None:
            C.log("render: missing camera", cam_name)
            continue
        hidden = []
        for n in hide:
            ob = bpy.data.objects.get(n)
            if ob:
                ob.hide_render = True
                hidden.append(ob)
        # isolate the asset the camera belongs to (plant shots also show the soil)
        owner = cam
        while owner.parent is not None:
            owner = owner.parent
        visible_roots = {owner.name} | ({"RootSoil"} if owner.name == "Plant" else set())
        for root_name in ("Plant", "RootSoil", "PlantCell", "StemSection", "WasteVisuals"):
            if root_name in visible_roots or bpy.data.objects.get(root_name) is None:
                continue
            for ob in C.descendants(bpy.data.objects[root_name]):
                if not ob.hide_render:
                    ob.hide_render = True
                    hidden.append(ob)
        scene.camera = cam
        path = os.path.join(C.RENDER_DIR, out + ".png")
        scene.render.filepath = path
        try:
            bpy.ops.render.render(write_still=True)
            outputs.append(path)
        except Exception as exc:  # fall back to workbench if EEVEE cannot get a GPU context
            C.log("render failed with", scene.render.engine, exc)
            scene.render.engine = "BLENDER_WORKBENCH"
            bpy.ops.render.render(write_still=True)
            outputs.append(path)
        for ob in hidden:
            ob.hide_render = False
        C.log("rendered", out)
    return outputs
