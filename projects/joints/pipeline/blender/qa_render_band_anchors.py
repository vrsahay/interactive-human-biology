"""Visual QA for the schematic band anchors (READ-ONLY for the file: temporary markers/camera exist only in memory; never saved).

Renders Workbench images of the lateral (RCL) and medial (UCL) elbow at flexion 0 and 145 deg to qa/visual/.
Temporary objects: one sphere per band anchor (humeral end red, forearm end blue), one thin cylinder per band (yellow),
one orthographic camera. Soft context structures, the capsule and QA helpers are hidden from the render.
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import guard  # noqa: E402

JOINT = "elbow_r"


def main():
    config = guard.load_config()
    out_dir = os.path.join(guard.ROOT, "qa", "visual")
    os.makedirs(out_dir, exist_ok=True)
    scene = bpy.context.scene
    objs = {o.name: o for o in bpy.data.objects}
    pivot, ctrl = objs[JOINT + "__pivot"], objs[JOINT + "__ctrl"]
    lateral = pivot.matrix_world.to_3x3().col[0].normalized()
    anterior = pivot.matrix_world.to_3x3().col[2].normalized()
    centre = pivot.matrix_world.translation.copy()

    show = {"bone_fixed", "bone_moving", "follow", "attached_soft"}
    for o in bpy.data.objects:
        role = o.get("role")
        if o.type == "MESH" and role not in show and role != "spanning_soft":
            o.hide_render = True
        if role == "spanning_soft":
            o.hide_render = o.get("structureId") == "elbow_capsule_r"
            o.color = (0.95, 0.80, 0.45, 1.0)
        elif role in ("bone_fixed", "bone_moving", "follow"):
            o.color = (0.86, 0.84, 0.80, 1.0)
        elif role == "attached_soft":
            o.color = (0.75, 0.70, 0.62, 1.0)

    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "OBJECT"
    scene.render.resolution_x = scene.render.resolution_y = 900
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"

    cam_data = bpy.data.cameras.new("qa_tmp_cam")
    cam_data.type, cam_data.ortho_scale = "ORTHO", 0.16
    cam = bpy.data.objects.new("qa_tmp_cam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    def sphere(name, loc, color):
        me = bpy.data.meshes.new(name)
        import bmesh
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=12, radius=0.0022)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(name, me)
        ob.location, ob.color = loc, color
        scene.collection.objects.link(ob)
        return ob

    def cylinder(name, a, b, color):
        import bmesh
        me = bpy.data.meshes.new(name)
        bm = bmesh.new()
        length = (b - a).length
        bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.0009, radius2=0.0009, depth=length)
        bm.to_mesh(me)
        bm.free()
        ob = bpy.data.objects.new(name, me)
        ob.location = (a + b) / 2
        ob.rotation_mode = "QUATERNION"
        ob.rotation_quaternion = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
        ob.color = color
        scene.collection.objects.link(ob)
        return ob

    temp = []
    written = []
    for deg in (0, 145):
        for t in temp:
            bpy.data.objects.remove(t, do_unlink=True)
        temp = []
        ctrl.rotation_euler = (math.radians(deg), 0.0, 0.0)
        bpy.context.view_layer.update()
        ends = {}
        for key in ("rcl_prox", "rcl_dist", "ucl_prox", "ucl_dist"):
            ob = objs["{}__anchor__{}".format(JOINT, key)]
            p = ob.matrix_world.translation.copy()
            ends[key] = p
            color = (0.85, 0.10, 0.10, 1.0) if key.endswith("prox") else (0.10, 0.25, 0.90, 1.0)
            temp.append(sphere("qa_tmp_" + key, p, color))
        temp.append(cylinder("qa_tmp_band_rcl", ends["rcl_prox"], ends["rcl_dist"], (1.0, 0.85, 0.0, 1.0)))
        temp.append(cylinder("qa_tmp_band_ucl", ends["ucl_prox"], ends["ucl_dist"], (1.0, 0.85, 0.0, 1.0)))
        for view, sign in (("lateral", 1.0), ("medial", -1.0)):
            cam.location = centre + lateral * sign * 0.3 - pivot.matrix_world.to_3x3().col[1].normalized() * 0.0
            direction = (centre - cam.location).normalized()
            cam.rotation_mode = "QUATERNION"
            cam.rotation_quaternion = direction.to_track_quat("-Z", "Y")
            cam_data.shift_x, cam_data.shift_y = 0.0, 0.0
            bpy.context.view_layer.update()
            path = os.path.join(out_dir, "elbow_r_band_anchors_{}_{:03d}.png".format(view, deg))
            scene.render.filepath = path
            bpy.ops.render.render(write_still=True)
            written.append({"file": path, "bytes": os.path.getsize(path)})
    ctrl.rotation_euler = (0.0, 0.0, 0.0)
    return {"written": written, "note": "temporary QA objects only in memory; file not saved"}


REPORT_SUMMARY = main()
