"""
Export every asset root to its own GLB in web/public/models/.

Each asset root is temporarily reset to the origin (the master .blend lays the
assets out side by side for authoring) so every GLB is authored around (0,0,0).
"""

import os

import bpy
from mathutils import Matrix

import common as C
from validate import ASSET_ROOTS


def export_asset(root_name, filename):
    root = bpy.data.objects[root_name]
    saved = root.matrix_world.copy()
    root.matrix_world = Matrix.Identity(4)
    bpy.context.view_layer.update()

    for ob in bpy.context.view_layer.objects:
        ob.select_set(False)
    objs = C.descendants(root)
    for ob in objs:
        ob.hide_set(False)
        ob.hide_viewport = False
        ob.select_set(True)
    bpy.context.view_layer.objects.active = root

    path = os.path.join(C.WEB_MODELS_DIR, filename)
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_extras=True,
        export_apply=True,
        export_yup=True,
        export_cameras=True,
        export_lights=False,
        export_animations=False,
        export_materials="EXPORT",
        export_image_format="JPEG",
        export_jpeg_quality=86,
        # Draco geometry compression (decoder served locally from web/public/draco/)
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
        export_draco_position_quantization=14,
        export_draco_normal_quantization=10,
        export_draco_texcoord_quantization=12,
        export_texcoords=True,
        export_normals=True,
        export_vertex_color="MATERIAL",
    )
    root.matrix_world = saved
    bpy.context.view_layer.update()
    size = os.path.getsize(path)
    C.log(f"exported {filename}: {size / 1024:.1f} KB ({len(objs)} objects)")
    return path, size


def run(only=None):
    """only: set of asset root names to export (the rest keep their existing GLB files)."""
    results = {}
    for root_name, filename in ASSET_ROOTS.items():
        if only and root_name not in only:
            continue
        results[filename] = export_asset(root_name, filename)
    return results
