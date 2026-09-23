"""
Build the shared particle templates (waste-visuals.glb).

Every process in the lesson uses the SAME visual language so the learner can
recognise a substance anywhere in the journey.  Meaning is carried by SHAPE as
well as colour (accessibility: never colour-only).

  O2_Molecule    – twin spheres (an O₂ molecule)        pale cyan
  CO2_Molecule   – three spheres in a line (O=C=O)      dark grey centre, pale grey ends
  Water_Droplet  – teardrop                              blue
  Vapour_Puff    – soft three-lobed puff                 very pale blue
  Waste_Crystal  – faceted crystal                       magenta-purple
  Resin_Drop     – glossy rounded blob                   amber
  Soil_Waste_Particle – softened waste blob (roots → soil) magenta-purple

Templates are unit-sized (≈1) and centred on their own origin; Three.js scales
and instances them.
"""

import math

import bmesh
from mathutils import Vector

import common as C


def merge_bms(name, bms_with_offsets, coll):
    parts = []
    for bm, off in bms_with_offsets:
        verts = [v.co.copy() + Vector(off) for v in bm.verts]
        faces = [tuple(v.index for v in f.verts) for f in bm.faces]
        bm.free()
        parts.append((verts, faces, []))
    ob = C.join_meshes(name, parts, coll)
    C.recalc_normals(ob)
    return ob


def build():
    m_o2 = C.make_material("MAT_Oxygen", color="#c9eeff", roughness=0.3, emission="#c9eeff", emission_strength=0.25)
    m_water = C.make_material("MAT_Water", color="#3f8fe0", roughness=0.12, coat=0.5)
    m_vapour = C.make_material("MAT_Vapour", color="#dcefff", roughness=0.9, alpha=0.7)
    m_waste = C.make_material("MAT_Waste", color="#b243bf", roughness=0.35)
    m_resin = C.make_material("MAT_Resin_Drop", color="#f2a12e", roughness=0.18, coat=0.6)

    root = C.add_empty("WasteVisuals", (0, 0, 0), "WASTE_VISUALS", size=0.5)
    C.tag(root, "waste_visuals", "Waste visuals", asset="17_waste_visuals")

    # O2 – two overlapping spheres
    def sphere(r):
        bm = bmesh.new()
        bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=r)
        return bm

    o2 = merge_bms("O2_Molecule", [(sphere(0.42), (-0.3, 0, 0)), (sphere(0.42), (0.3, 0, 0))], "OXYGEN")
    C.assign(o2, m_o2)
    C.tag(o2, "oxygen", "Oxygen (O₂)")
    C.set_parent(o2, root)

    # CO2 – a dark central sphere between two paler ones (linear O=C=O); grey so it never reads as O2
    m_c = C.make_material("MAT_CO2_Carbon", color="#4a4f57", roughness=0.35)
    m_co2_o = C.make_material("MAT_CO2_Oxygen", color="#b9c3cf", roughness=0.35)
    co2 = merge_bms("CO2_Molecule", [(sphere(0.34), (0, 0, 0)), (sphere(0.3), (-0.52, 0, 0)), (sphere(0.3), (0.52, 0, 0))],
                    "CARBON_DIOXIDE")
    C.assign(co2, m_c, m_co2_o)
    n = len(co2.data.polygons) // 3          # the three spheres have equal face counts; the first is carbon
    co2.data.polygons.foreach_set("material_index", [0] * n + [1] * (len(co2.data.polygons) - n))
    co2.data.update()
    C.tag(co2, "carbon_dioxide", "Carbon dioxide (CO₂)")
    C.set_parent(co2, root)
    co2.location = (0, 1.5, 0)

    # water droplet – sphere pulled into a teardrop
    bm = sphere(0.4)
    for v in bm.verts:
        if v.co.z > 0:
            t = min(1.0, v.co.z / 0.4)
            k = max(0.0, 1.0 - t) ** 1.25
            v.co.x *= 0.35 + 0.65 * k
            v.co.y *= 0.35 + 0.65 * k
            v.co.z *= 1.0 + 0.7 * t
    for v in bm.verts:
        if v.co.z > 0.62:
            v.co.x *= 0.2
            v.co.y *= 0.2
    drop = merge_bms("Water_Droplet", [(bm, (0, 0, -0.05))], "WATER")
    C.assign(drop, m_water)
    C.tag(drop, "water", "Water")
    C.set_parent(drop, root)
    drop.location = (1.5, 0, 0)

    # vapour puff – three soft lobes
    puff = merge_bms("Vapour_Puff", [(C.ellipsoid_bm((0.36, 0.36, 0.3), 2), (0, 0, 0)),
                                     (C.ellipsoid_bm((0.28, 0.28, 0.24), 2), (0.3, 0.05, 0.08)),
                                     (C.ellipsoid_bm((0.26, 0.26, 0.22), 2), (-0.28, -0.04, 0.06))], "WATER")
    C.assign(puff, m_vapour)
    C.tag(puff, "water_vapour", "Water vapour")
    C.set_parent(puff, root)
    puff.location = (3.0, 0, 0)

    # waste crystal – faceted, irregular
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.45)
    for i, v in enumerate(bm.verts):
        f = 0.82 + 0.3 * (0.5 + 0.5 * math.sin(i * 2.7))
        v.co *= f
        v.co.z *= 1.25
    crystal = merge_bms("Waste_Crystal", [(bm, (0, 0, 0))], "STORED_WASTE")
    crystal.data.polygons.foreach_set("use_smooth", [False] * len(crystal.data.polygons))
    C.assign(crystal, m_waste)
    C.tag(crystal, "waste", "Waste substance")
    C.set_parent(crystal, root)
    crystal.location = (4.5, 0, 0)

    # resin blob
    blob = merge_bms("Resin_Drop", [(C.ellipsoid_bm((0.45, 0.4, 0.34), 3, noise=0.08, seed=4), (0, 0, 0))],
                     "RESIN_GUM")
    C.assign(blob, m_resin)
    C.tag(blob, "resin", "Resin / gum")
    C.set_parent(blob, root)
    blob.location = (6.0, 0, 0)

    # waste leaving the roots: the same purple "waste" language as the stored crystals, but softened,
    # so the learner reads it as the same kind of substance, now outside the plant
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.36)
    for i, v in enumerate(bm.verts):
        v.co *= 0.9 + 0.16 * (0.5 + 0.5 * math.sin(i * 1.9))
    soil_bit = merge_bms("Soil_Waste_Particle", [(bm, (0, 0, 0))], "SOIL_EXCRETION")
    C.assign(soil_bit, m_waste)
    C.tag(soil_bit, "soil_waste", "Waste substance (into the soil)")
    C.set_parent(soil_bit, root)
    soil_bit.location = (7.5, 0, 0)

    C.log("waste visuals built")
    return root
