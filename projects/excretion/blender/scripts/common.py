"""
Shared helpers for the Excretion-in-Plants Blender asset pipeline.

Every builder script uses these helpers so that naming, collections,
materials, custom properties (exported as glTF extras) and geometry
conventions stay consistent across assets.

Conventions
-----------
* Blender is Z-up; glTF export converts to Y-up for Three.js.
* "Front" of every asset faces -Y in Blender (→ +Z in Three.js).
* 1 Blender unit = 1 scene unit in Three.js.
* Every exported object carries custom properties:
      part   – stable id used by the lesson (e.g. "leaf", "vacuole")
      label  – learner-facing name
  Three.js reads these from object.userData.
"""

import math
import os
import random

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

# --------------------------------------------------------------------------
# Paths
# --------------------------------------------------------------------------
SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
BLENDER_DIR = os.path.dirname(SCRIPTS_DIR)
PROJECT_DIR = os.path.dirname(BLENDER_DIR)
SOURCE_DIR = os.path.join(BLENDER_DIR, "source")
CHECKPOINT_DIR = os.path.join(BLENDER_DIR, "checkpoints")
TEXTURE_DIR = os.path.join(BLENDER_DIR, "textures")
RENDER_DIR = os.path.join(BLENDER_DIR, "renders")
WEB_MODELS_DIR = os.path.join(PROJECT_DIR, "web", "public", "models")

for _d in (SOURCE_DIR, CHECKPOINT_DIR, TEXTURE_DIR, RENDER_DIR, WEB_MODELS_DIR):
    os.makedirs(_d, exist_ok=True)


def log(*args):
    print("[excretion]", *args, flush=True)


# --------------------------------------------------------------------------
# Scene / collections
# --------------------------------------------------------------------------
# V2: one top-level collection per biological scale family (reusable assets)
COLLECTION_TREE = {
    "PLANT": ["PLANT_STEM", "BRANCHES", "LEAVES", "ROOTS"],
    "LEAF": ["LEAF_BLADE", "LEAF_INTERNAL"],
    "STOMA": ["GUARD_CELLS", "EPIDERMIS"],
    "CELL": ["CELL_BOUNDARY", "CYTOPLASM", "NUCLEUS"],
    "VACUOLE": [],
    "CHLOROPLAST": [],
    "STEM": ["STEM_CROSS_SECTION"],
    "XYLEM": [],
    "ROOT": ["ROOT_TIP", "ROOT_HAIRS"],
    "SOIL": [],
    "WASTE_VISUALS": ["OXYGEN", "CARBON_DIOXIDE", "WATER", "STORED_WASTE", "RESIN_GUM", "SOIL_EXCRETION"],
    "CAMERAS": [],
    "LIGHTS": [],
    "QA": [],
}

# Anchors (label/effect points) and paths live with the thing they annotate.
ANCHOR_COLLECTIONS = (
    ("PATH_Water", "WATER"),
    ("PATH_OldLeaf", "STORED_WASTE"),
    ("ANCHOR_Leaf", "LEAVES"),
    ("ANCHOR_Canopy", "LEAVES"),
    ("ANCHOR_Plant_Center", "PLANT_STEM"),
    ("ANCHOR_Stem_Cut", "PLANT_STEM"),
    ("ANCHOR_Root", "ROOTS"),
    ("ANCHOR_Soil", "SOIL"),
    ("ANCHOR_Xylem", "XYLEM"),
    ("ANCHOR_Waste_Entry", "RESIN_GUM"),
    ("ANCHOR_Bark", "STEM_CROSS_SECTION"),
    ("ANCHOR_Phloem", "STEM_CROSS_SECTION"),
    ("ANCHOR_Pith", "STEM_CROSS_SECTION"),
    ("ANCHOR_Section", "STEM_CROSS_SECTION"),
    ("ANCHOR_Vacuole", "VACUOLE"),
    ("ANCHOR_Nucleus", "NUCLEUS"),
    ("ANCHOR_Cell_Wall", "CELL_BOUNDARY"),
    ("ANCHOR_Cell_Membrane", "CELL_BOUNDARY"),
    ("ANCHOR_Cyto", "CYTOPLASM"),
    ("ANCHOR_Chloroplast", "CYTOPLASM"),
    ("ANCHOR_Tissue", "CELL"),
)

WORKING_FILE = "Excretion_in_Plants_Working.blend"
VERSION_PREFIX = "Excretion_in_Plants_v"


def reset_scene():
    """Empty the open file in place.

    Runs inside the Blender MCP add-on session, whose sandbox forbids
    wm.read_factory_settings, so data-blocks are purged directly instead.
    """
    for coll_name in ("objects", "meshes", "materials", "images", "cameras", "lights", "curves",
                      "collections", "worlds", "node_groups", "textures"):
        data = getattr(bpy.data, coll_name)
        for block in list(data):
            try:
                data.remove(block)
            except Exception:
                pass
    scene = bpy.context.scene
    scene.name = "ExcretionInPlants"
    scene.unit_settings.system = "METRIC"
    scene.unit_settings.scale_length = 1.0
    build_collections()


def build_collections():
    scene_coll = bpy.context.scene.collection
    for top, children in COLLECTION_TREE.items():
        top_coll = bpy.data.collections.get(top) or bpy.data.collections.new(top)
        if top_coll.name not in scene_coll.children:
            scene_coll.children.link(top_coll)
        for child in children:
            c = bpy.data.collections.get(child) or bpy.data.collections.new(child)
            if c.name not in top_coll.children:
                top_coll.children.link(c)


def coll(name):
    c = bpy.data.collections.get(name)
    if c is None:
        raise KeyError(f"Collection {name} missing")
    return c


def link_to(obj, collection_name):
    target = coll(collection_name)
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    target.objects.link(obj)
    return obj


def tag(obj, part, label, **extra):
    """Attach lesson metadata (exported as glTF extras → userData)."""
    obj["part"] = part
    obj["label"] = label
    for k, v in extra.items():
        obj[k] = v
    return obj


def set_parent(child, parent):
    # matrix_world is only refreshed by a depsgraph update; without it a freshly
    # set .location would be lost when re-applying the world matrix below.
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_world = mw


def add_empty(name, location, collection_name, parent=None, size=0.05, display="PLAIN_AXES"):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = display
    e.empty_display_size = size
    e.location = Vector(location)
    coll(collection_name).objects.link(e)
    if parent is not None:
        set_parent(e, parent)
    return e


def anchor_collection(name, parent=None):
    for prefix, collection_name in ANCHOR_COLLECTIONS:
        if name.startswith(prefix):
            return collection_name
    if parent is not None and parent.users_collection:
        return parent.users_collection[0].name  # V2 assets: anchors live with their asset
    raise KeyError(f"No collection rule for anchor {name}")


def add_anchor(name, location, parent=None, size=0.03, display="SPHERE", collection=None):
    """Label/effect anchor or path point, filed with the thing it annotates."""
    return add_empty(name, location, collection or anchor_collection(name, parent), parent=parent, size=size, display=display)


def add_camera_ref(name, location, target, collection_name="CAMERAS", parent=None, lens=35.0):
    """Camera reference: a real camera (for QA renders) + a TGT_ empty (look-at)."""
    cam_data = bpy.data.cameras.new(name)
    cam_data.lens = lens
    cam_data.clip_start = 0.01
    cam_data.clip_end = 100
    cam = bpy.data.objects.new(name, cam_data)
    coll(collection_name).objects.link(cam)
    cam.location = Vector(location)
    direction = Vector(target) - Vector(location)
    cam.rotation_mode = "QUATERNION"
    cam.rotation_quaternion = direction.to_track_quat("-Z", "Y")
    tgt = add_empty("TGT_" + name[4:], target, collection_name, size=0.03, display="SPHERE")
    cam["target"] = tgt.name
    if parent is not None:
        set_parent(cam, parent)
        set_parent(tgt, parent)
    return cam, tgt


# --------------------------------------------------------------------------
# Materials
# --------------------------------------------------------------------------
def _srgb_to_linear(c):
    c = max(0.0, min(1.0, c))
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def hex_color(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))
    return (_srgb_to_linear(r), _srgb_to_linear(g), _srgb_to_linear(b), 1.0)


def make_material(name, color="#ffffff", roughness=0.6, metallic=0.0, alpha=1.0,
                  emission=None, emission_strength=0.0, image=None,
                  vertex_color=False, double_sided=False, coat=0.0,
                  normal_image=None, normal_strength=1.0, transmission=0.0, ior=1.4,
                  roughness_image=None):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nodes, links = nt.nodes, nt.links
    for n in list(nodes):
        nodes.remove(n)
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (400, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (100, 0)
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    rgba = hex_color(color) if isinstance(color, str) else color
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if coat > 0:
        bsdf.inputs["Coat Weight"].default_value = coat
        bsdf.inputs["Coat Roughness"].default_value = 0.15

    if image is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.location = (-300, 100)
        tex.image = image
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    elif vertex_color:
        vc = nodes.new("ShaderNodeVertexColor")
        vc.location = (-300, 100)
        vc.layer_name = "Col"
        links.new(vc.outputs["Color"], bsdf.inputs["Base Color"])

    if normal_image is not None:
        nt_img = nodes.new("ShaderNodeTexImage")
        nt_img.location = (-500, -250)
        nt_img.image = normal_image
        nm = nodes.new("ShaderNodeNormalMap")
        nm.location = (-200, -250)
        nm.inputs["Strength"].default_value = normal_strength
        links.new(nt_img.outputs["Color"], nm.inputs["Color"])
        links.new(nm.outputs["Normal"], bsdf.inputs["Normal"])
    if roughness_image is not None:
        r_img = nodes.new("ShaderNodeTexImage")
        r_img.location = (-500, -520)
        r_img.image = roughness_image
        links.new(r_img.outputs["Color"], bsdf.inputs["Roughness"])
    if transmission > 0:
        bsdf.inputs["Transmission Weight"].default_value = transmission
        bsdf.inputs["IOR"].default_value = ior

    if emission is not None and emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = hex_color(emission)
        bsdf.inputs["Emission Strength"].default_value = emission_strength

    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
        m.surface_render_method = "BLENDED"
        try:
            m.blend_method = "BLEND"
        except Exception:
            pass
    m.use_backface_culling = not double_sided
    m.diffuse_color = (rgba[0], rgba[1], rgba[2], alpha)
    m.roughness = roughness
    return m


def assign(obj, *materials):
    obj.data.materials.clear()
    for mat in materials:
        obj.data.materials.append(mat)
    return obj


# --------------------------------------------------------------------------
# Procedural textures (numpy → packed PNG)
# --------------------------------------------------------------------------
def value_noise(h, w, cells, seed, octaves=4, persistence=0.5):
    """Smooth tileable-ish value noise in [0,1], shape (h, w)."""
    rng = np.random.default_rng(seed)
    out = np.zeros((h, w), dtype=np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        c = cells * (2 ** o)
        grid = rng.random((c + 1, c + 1)).astype(np.float32)
        ys = np.linspace(0, c, h, endpoint=False)
        xs = np.linspace(0, c, w, endpoint=False)
        y0 = ys.astype(int)
        x0 = xs.astype(int)
        fy = (ys - y0)[:, None]
        fx = (xs - x0)[None, :]
        fy = fy * fy * (3 - 2 * fy)
        fx = fx * fx * (3 - 2 * fx)
        a = grid[y0][:, x0]
        b = grid[y0][:, x0 + 1]
        cc = grid[y0 + 1][:, x0]
        d = grid[y0 + 1][:, x0 + 1]
        layer = (a * (1 - fx) + b * fx) * (1 - fy) + (cc * (1 - fx) + d * fx) * fy
        out += layer * amp
        total += amp
        amp *= persistence
    return out / total


def save_data_texture(name, rgb):
    """Like save_texture, but for non-colour data (normal and roughness maps)."""
    img = save_texture(name, rgb)
    img.colorspace_settings.name = "Non-Color"
    return img


def normal_from_height(h, strength=4.0):
    """Tangent-space normal map (0..1 RGB) from a height field in [0,1] (wraps at the edges)."""
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) * 0.5 * strength
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) * 0.5 * strength
    n = np.stack([-dx, -dy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def voronoi_cells(h, w, n_points, seed, warp=0.0, aspect=1.0):
    """Periodic Voronoi on an (h, w) grid. Returns (F1, F2, cell id) arrays.
    warp > 0 bends the cell borders (jigsaw-like epidermal cells)."""
    rng = np.random.default_rng(seed)
    pts = rng.random((n_points, 2))
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xs / w, ys / h
    if warp > 0:
        wn = value_noise(h, w, 6, seed + 1, octaves=2)
        wn2 = value_noise(h, w, 6, seed + 2, octaves=2)
        u = u + (wn - 0.5) * warp
        v = v + (wn2 - 0.5) * warp
    f1 = np.full((h, w), 9.0, np.float32)
    f2 = np.full((h, w), 9.0, np.float32)
    cid = np.zeros((h, w), np.int32)
    for i, (px, py) in enumerate(pts):
        du = np.abs(u - px)
        du = np.minimum(du, 1 - du) * aspect
        dv = np.abs(v - py)
        dv = np.minimum(dv, 1 - dv)
        d = np.sqrt(du * du + dv * dv)
        closer = d < f1
        f2 = np.where(closer, f1, np.minimum(f2, d))
        cid = np.where(closer, i, cid)
        f1 = np.where(closer, d, f1)
    return f1, f2, cid


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def save_texture(name, rgb):
    """rgb: float array (h, w, 3) in sRGB 0..1, row 0 = bottom of image."""
    h, w, _ = rgb.shape
    rgba = np.ones((h, w, 4), dtype=np.float32)
    rgba[..., :3] = np.clip(rgb, 0.0, 1.0)
    img = bpy.data.images.get(name)
    if img is not None:
        bpy.data.images.remove(img)
    img = bpy.data.images.new(name, width=w, height=h, alpha=False)
    img.colorspace_settings.name = "sRGB"
    img.pixels.foreach_set(rgba.ravel())
    path = os.path.join(TEXTURE_DIR, name + ".png")
    img.filepath_raw = path
    img.file_format = "PNG"
    img.save()
    img.pack()
    return img


# --------------------------------------------------------------------------
# Mesh construction
# --------------------------------------------------------------------------
def mesh_object(name, verts, faces, collection_name, uvs=None, smooth=True, flat_faces=None):
    """Create a mesh object. uvs: per-loop list aligned to faces (list of lists)."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    me.validate(clean_customdata=False)
    if uvs is not None:
        uv_layer = me.uv_layers.new(name="UVMap")
        flat = [uv for face_uvs in uvs for uv in face_uvs]
        for i, loop in enumerate(uv_layer.data):
            loop.uv = flat[i]
    smooth_flags = [smooth] * len(me.polygons)
    if flat_faces:
        for fi in flat_faces:
            if fi < len(smooth_flags):
                smooth_flags[fi] = False
    me.polygons.foreach_set("use_smooth", smooth_flags)
    me.update()
    obj = bpy.data.objects.new(name, me)
    coll(collection_name).objects.link(obj)
    return obj


def bmesh_to_object(name, bm, collection_name, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.polygons.foreach_set("use_smooth", [smooth] * len(me.polygons))
    me.update()
    obj = bpy.data.objects.new(name, me)
    coll(collection_name).objects.link(obj)
    return obj


def recalc_normals(obj):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def set_vertex_colors(obj, color_fn):
    """color_fn(world_co: Vector, local_co: Vector) -> (r,g,b) in sRGB 0..1."""
    me = obj.data
    attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "BYTE_COLOR", "POINT")
    mw = obj.matrix_world
    cols = []
    for v in me.vertices:
        r, g, b = color_fn(mw @ v.co, v.co)
        cols.extend((r, g, b, 1.0))
    attr.data.foreach_set("color_srgb", cols)
    me.color_attributes.active_color = attr
    me.color_attributes.render_color_index = 0
    me.update()


def sweep_tube(points, radii, sides=10, cap_start=True, cap_end=True):
    """Parallel-transport sweep of a circle along points. Returns verts, faces, flat face ids."""
    n = len(points)
    pts = [Vector(p) for p in points]
    tangents = []
    for i in range(n):
        a = pts[max(i - 1, 0)]
        b = pts[min(i + 1, n - 1)]
        tangents.append((b - a).normalized())
    t0 = tangents[0]
    ref = Vector((0, 0, 1)) if abs(t0.z) < 0.9 else Vector((1, 0, 0))
    normal = (ref - t0 * ref.dot(t0)).normalized()
    frames = []
    for i in range(n):
        if i > 0:
            axis = tangents[i - 1].cross(tangents[i])
            if axis.length > 1e-8:
                ang = tangents[i - 1].angle(tangents[i])
                normal = Matrix.Rotation(ang, 3, axis.normalized()) @ normal
            normal = (normal - tangents[i] * normal.dot(tangents[i])).normalized()
        binormal = tangents[i].cross(normal)
        frames.append((normal.copy(), binormal))
    verts, faces = [], []
    for i, p in enumerate(pts):
        nrm, bin_ = frames[i]
        for k in range(sides):
            a = 2 * math.pi * k / sides
            verts.append(p + (nrm * math.cos(a) + bin_ * math.sin(a)) * radii[i])
    for i in range(n - 1):
        for k in range(sides):
            a = i * sides + k
            b = i * sides + (k + 1) % sides
            c = (i + 1) * sides + (k + 1) % sides
            d = (i + 1) * sides + k
            faces.append((a, b, c, d))
    flat = []
    if cap_start:
        flat.append(len(faces))
        faces.append(tuple(reversed(range(sides))))
    if cap_end:
        flat.append(len(faces))
        faces.append(tuple(range((n - 1) * sides, n * sides)))
    return verts, faces, flat


def catmull(points, samples_per_seg=6):
    """Catmull-Rom interpolation through control points."""
    pts = [Vector(p) for p in points]
    if len(pts) < 3:
        return pts
    out = []
    ext = [pts[0] + (pts[0] - pts[1])] + pts + [pts[-1] + (pts[-1] - pts[-2])]
    for i in range(1, len(ext) - 2):
        p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        for s in range(samples_per_seg):
            t = s / samples_per_seg
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-1])
    return out


def join_meshes(name, parts, collection_name, smooth_flags=None):
    """parts: list of (verts, faces, flat_ids). Returns single object."""
    all_v, all_f, flat = [], [], []
    for verts, faces, flats in parts:
        off = len(all_v)
        fbase = len(all_f)
        all_v.extend(verts)
        all_f.extend([tuple(i + off for i in f) for f in faces])
        flat.extend([fbase + fi for fi in flats])
    return mesh_object(name, all_v, all_f, collection_name, smooth=True, flat_faces=flat)


def rounded_box_bm(size, radius, segments=3):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * size[0], v.co.y * size[1], v.co.z * size[2]))
    bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=radius,
                    segments=segments, profile=0.5, affect="EDGES", clamp_overlap=True)
    return bm


def ellipsoid_bm(radii, subdiv=3, noise=0.0, seed=0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    rng = random.Random(seed)
    phases = [rng.uniform(0, 6.28) for _ in range(6)]
    for v in bm.verts:
        d = v.co.normalized()
        wobble = 1.0
        if noise > 0:
            wobble += noise * (math.sin(3 * d.x + phases[0]) * math.sin(2 * d.y + phases[1])
                               + 0.6 * math.sin(4 * d.z + phases[2]) * math.cos(3 * d.x + phases[3]))
        v.co = Vector((d.x * radii[0], d.y * radii[1], d.z * radii[2])) * wobble
    return bm


def annular_sector(r_in, r_out, a0, a1, z0, z1, segs):
    """Watertight annular sector solid (r_in may be 0 → pie sector).
    Returns verts, faces, flat ids (top/bottom/radial ends flat, curved walls smooth)."""
    verts, faces, flat = [], [], []
    full = abs((a1 - a0) - 2 * math.pi) < 1e-6
    count = segs if full else segs + 1
    angles = [a0 + (a1 - a0) * i / segs for i in range(count)]
    solid_center = r_in <= 1e-6

    def ring(r, z):
        start = len(verts)
        for a in angles:
            verts.append(Vector((r * math.cos(a), r * math.sin(a), z)))
        return start

    ob = ring(r_out, z0)
    ot = ring(r_out, z1)
    if solid_center:
        cb = len(verts); verts.append(Vector((0, 0, z0)))
        ct = len(verts); verts.append(Vector((0, 0, z1)))
    else:
        ib = ring(r_in, z0)
        it = ring(r_in, z1)

    nseg = segs
    for i in range(nseg):
        j = (i + 1) % count if full else i + 1
        # outer wall (smooth)
        faces.append((ob + i, ob + j, ot + j, ot + i))
        if solid_center:
            flat.append(len(faces)); faces.append((ct, ot + i, ot + j))
            flat.append(len(faces)); faces.append((cb, ob + j, ob + i))
        else:
            faces.append((ib + j, ib + i, it + i, it + j))
            flat.append(len(faces)); faces.append((it + i, ot + i, ot + j, it + j))
            flat.append(len(faces)); faces.append((ib + j, ob + j, ob + i, ib + i))
    if not full:
        last = count - 1
        if solid_center:
            flat.append(len(faces)); faces.append((cb, ob + 0, ot + 0, ct))
            flat.append(len(faces)); faces.append((cb, ct, ot + last, ob + last))
        else:
            flat.append(len(faces)); faces.append((ib + 0, ob + 0, ot + 0, it + 0))
            flat.append(len(faces)); faces.append((ib + last, it + last, ot + last, ob + last))
    return verts, faces, flat


def boolean_cut(obj, cutter_obj, operation="DIFFERENCE"):
    """Apply a boolean using the evaluated depsgraph (no operator context needed)."""
    mod = obj.modifiers.new("cut", "BOOLEAN")
    mod.operation = operation
    mod.object = cutter_obj
    mod.solver = "EXACT"
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    new_me = bpy.data.meshes.new_from_object(ev)
    old = obj.data
    obj.modifiers.remove(mod)
    obj.data = new_me
    bpy.data.meshes.remove(old)
    new_me.name = obj.name
    return obj


def apply_transform(obj):
    """Bake object transform into mesh data (keeps world placement)."""
    if obj.type != "MESH":
        return
    bpy.context.view_layer.update()
    mw = obj.matrix_world.copy()
    obj.data.transform(mw)
    obj.matrix_world = Matrix.Identity(4)


def descendants(obj):
    out = [obj]
    for c in obj.children:
        out.extend(descendants(c))
    return out


CHECKPOINT_LOG = os.path.join(CHECKPOINT_DIR, "checkpoints.json")


def save_working():
    """The working file: saved after every step, the one an artist opens."""
    path = os.path.join(SOURCE_DIR, WORKING_FILE)
    bpy.ops.wm.save_as_mainfile(filepath=path, copy=True, compress=True)
    log("working file saved:", path)
    return path


def _checkpoint_log():
    import json
    try:
        with open(CHECKPOINT_LOG, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return []


def save_version(step, note, validation=None):
    """Save the next Excretion_in_Plants_vNNN.blend. A version is never overwritten:
    re-running the pipeline adds new versions after the existing ones."""
    import datetime
    import json
    import re as _re
    taken = [int(m.group(1)) for f in os.listdir(CHECKPOINT_DIR)
             if (m := _re.match(VERSION_PREFIX + r"(\d{3})\.blend$", f))]
    n = max(taken, default=0) + 1
    filename = f"{VERSION_PREFIX}{n:03d}.blend"
    path = os.path.join(CHECKPOINT_DIR, filename)
    if os.path.exists(path):
        raise FileExistsError(path)
    bpy.ops.wm.save_as_mainfile(filepath=path, copy=True, compress=True)
    entry = {
        "file": filename,
        "step": step,
        "note": note,
        "saved": datetime.datetime.now().isoformat(timespec="seconds"),
        "objects": len(bpy.data.objects),
        "validated": None if validation is None else bool(validation.get("ok")),
        "issues": None if validation is None else len(validation.get("issues", [])),
    }
    history = _checkpoint_log()
    history.append(entry)
    with open(CHECKPOINT_LOG, "w", encoding="utf-8") as fh:
        json.dump(history, fh, indent=2)
    log("version saved:", path)
    return entry
