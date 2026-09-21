"""Deterministic anchor computation for elbow_r (pure; no scene changes).

All anchor positions are vertices of the structure's validated mesh, expressed in MESH-LOCAL coordinates.
For the extracted anatomy mesh-local coordinates == source-pose world coordinates, so every computation is
independent of the current controller angle. Joint anchors are expressed in the pivot's local frame.
"""
import math

import numpy as np
from mathutils import Matrix
from mathutils.bvhtree import BVHTree

MOVING_ROLES = {"bone_moving", "follow", "attached_soft"}


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def local_verts(ob):
    me = ob.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    return co.reshape(-1, 3)


def local_normals(ob):
    me = ob.data
    n = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("normal", n)
    return n.reshape(-1, 3)


def local_bvh(ob):
    return BVHTree.FromPolygons([tuple(v.co) for v in ob.data.vertices], [tuple(p.vertices) for p in ob.data.polygons])


def distal_axis(points):
    c = points.mean(0)
    _u, _s, vt = np.linalg.svd(points - c, full_matrices=False)
    d = unit(vt[0])
    return d if d[2] < 0 else -d  # source pose: arm hangs, distal points down


def frames(pivot_ob, neutral_offset_deg):
    """Source-frame direction vectors (world == mesh-local at the source pose)."""
    m = np.array(pivot_ob.matrix_world.to_3x3())
    x, z_ext = unit(m[:, 0]), unit(m[:, 2])
    k = np.array([[0, -x[2], x[1]], [x[2], 0, -x[0]], [-x[1], x[0], 0]])
    a = math.radians(neutral_offset_deg)
    rot = np.eye(3) + math.sin(a) * k + (1 - math.cos(a)) * (k @ k)
    return {"lateral": x, "anterior_stationary": z_ext, "anterior_forearm": rot @ z_ext, "pivot_point": np.array(pivot_ob.matrix_world.translation)}


def direction(names, moving, fr, distal=None):
    vec = np.zeros(3)
    for n in names:
        if n == "lateral":
            vec += fr["lateral"]
        elif n == "medial":
            vec -= fr["lateral"]
        elif n in ("anterior", "posterior"):
            ant = fr["anterior_forearm"] if moving else fr["anterior_stationary"]
            vec += ant if n == "anterior" else -ant
        elif n in ("distal", "proximal"):
            vec += distal if n == "distal" else -distal
    return unit(vec)


def compute(spec, objects_by_structure, pivot_ob):
    """Return {key: result dict} for every anchor in spec['overlay']['anchors']."""
    sem = spec["rig"]["semantics"]
    fr = frames(pivot_ob, sem["neutral_offset_deg"])
    role = {s["structureId"]: s["role"] for s in spec["structures"]}
    offset_mm = spec["overlay"]["anchorConventions"]["labelOffsetMm"]
    pivot = fr["pivot_point"]
    out = {}
    for a in spec["overlay"]["anchors"]:
        m = a["method"]
        kind = m["kind"]
        if kind == "joint_pivot":
            out[a["key"]] = {"parent": pivot_ob.name, "vertexIndex": -1, "localPosition": [0.0, 0.0, 0.0],
                             "vertexNormalLocal": [0.0, 0.0, 0.0], "labelDirectionLocal": [0.0, 0.0, 1.0],
                             "diagnostics": {"note": "fitted pivot origin (pivot local frame)"}}
            continue
        ob = objects_by_structure[a["structureId"]]
        moving = role[a["structureId"]] in MOVING_ROLES
        V = local_verts(ob)
        d_dist = distal_axis(V)
        t = V @ d_dist
        tmin, tmax = t.min(), t.max()
        dirv = direction(m["direction"], moving, fr, d_dist)
        diag = {}
        if kind == "shaft_band_extreme":
            t0 = tmin + m["fraction_from_proximal"] * (tmax - tmin)
            band = np.where(np.abs(t - t0) <= m["band_half_width_mm"] / 1000)[0]
            idx = int(band[np.argmax(V[band] @ dirv)])
            diag = {"band_vertices": int(len(band)), "length_mm": round(float(tmax - tmin) * 1000, 2)}
        elif kind == "proximity_region":
            target = local_bvh(objects_by_structure[m["target"]])
            cand = np.where(t >= tmax - m["distal_limit_mm"] / 1000)[0]
            if "articular_z_mm" in m:
                cand = cand[t[cand] >= tmax - m["articular_z_mm"] / 1000]
            dist = np.array([target.find_nearest(tuple(V[i]), 0.05)[3] if target.find_nearest(tuple(V[i]), 0.05)[0] is not None else np.inf for i in cand])
            region = cand[dist <= dist.min() + m["band_mm"] / 1000]
            if m.get("exclude_target"):
                ex = local_bvh(objects_by_structure[m["exclude_target"]])
                exd = np.array([ex.find_nearest(tuple(V[i]), 0.05)[3] if ex.find_nearest(tuple(V[i]), 0.05)[0] is not None else np.inf for i in cand])
                ex_region = set(cand[exd <= exd.min() + m["band_mm"] / 1000].tolist())
                region = np.array([i for i in region if i not in ex_region], dtype=int)
            centroid = V[region].mean(0)
            idx = int(region[np.argmin(np.linalg.norm(V[region] - centroid, axis=1))])
            diag = {"region_vertices": int(len(region)), "min_gap_mm": round(float(dist.min()) * 1000, 3),
                    "lateral_of_pivot_mm": round(float((V[idx] - pivot) @ fr["lateral"]) * 1000, 2)}
        elif kind == "proximal_region_offset":
            region = np.where(t <= tmin + m["extent_mm"] / 1000)[0]
            q = V[region].mean(0) + dirv * m["offset_mm"] / 1000
            idx = int(region[np.argmin(np.linalg.norm(V[region] - q, axis=1))])
            diag = {"region_vertices": int(len(region)), "depth_from_proximal_mm": round(float(t[idx] - tmin) * 1000, 2)}
        elif kind == "extreme_vertex":
            region = np.arange(len(V)) if not m.get("region_extent_mm") else np.where(t <= tmin + m["region_extent_mm"] / 1000)[0]
            if m["extreme"] == "proximal":
                idx = int(region[np.argmin(t[region])])
            else:
                idx = int(region[np.argmax(V[region] @ direction([m["extreme"]], moving, fr, d_dist))])
            ant = fr["anterior_forearm"] if moving else fr["anterior_stationary"]
            diag = {"depth_from_proximal_mm": round(float(t[idx] - tmin) * 1000, 2),
                    "anterior_of_proximal_centroid_mm": round(float((V[idx] - V[np.where(t <= tmin + 0.035)[0]].mean(0)) @ ant) * 1000, 2)}
        elif kind == "centroid_offset_nearest":
            q = V.mean(0) + dirv * m["offset_mm"] / 1000
            idx = int(np.argmin(np.linalg.norm(V - q, axis=1)))
            diag = {"vertices": int(len(V)), "lateral_of_pivot_mm": round(float((V[idx] - pivot) @ fr["lateral"]) * 1000, 2)}
        else:
            raise ValueError("unknown anchor method " + kind)
        pos = V[idx]
        out[a["key"]] = {"parent": ob.name, "vertexIndex": idx, "localPosition": [float(v) for v in pos],
                         "vertexNormalLocal": [float(v) for v in local_normals(ob)[idx]],
                         "labelDirectionLocal": [float(v) for v in dirv],
                         "labelTargetLocal": [float(v) for v in pos + dirv * offset_mm / 1000],
                         "diagnostics": diag}
    return out


def sanity(results, spec):
    """Anatomical plausibility checks that the geometry must satisfy; returns a list of failures."""
    f = []
    d = {k: v["diagnostics"] for k, v in results.items()}
    if d["capitulum"]["lateral_of_pivot_mm"] <= 0:
        f.append("capitulum region is not lateral of the pivot")
    if d["trochlea"]["lateral_of_pivot_mm"] >= 0:
        f.append("trochlea region is not medial of the pivot")
    if d["olecranon"]["anterior_of_proximal_centroid_mm"] >= 0:
        f.append("olecranon anchor is not posterior")
    if not (d["coronoid_process"]["anterior_of_proximal_centroid_mm"] > 0 and 10 <= d["coronoid_process"]["depth_from_proximal_mm"] <= 35):
        f.append("coronoid anchor not anterior / not 10-35 mm below the ulnar tip")
    if d["radial_head"]["depth_from_proximal_mm"] > 12:
        f.append("radial head anchor outside proximal 12 mm")
    if d["radial_collateral_ligament"]["lateral_of_pivot_mm"] <= 0:
        f.append("radial collateral ligament anchor not lateral")
    if d["ulnar_collateral_ligament"]["lateral_of_pivot_mm"] >= 0:
        f.append("ulnar collateral ligament anchor not medial")
    return f


# ---------------------------------------------------------------------------------------------------------------
# Schematic ligament-band attachment anchors (spec overlay.bandAnchors)
# ---------------------------------------------------------------------------------------------------------------

BAND_SNAP_LIMIT_MM = 6.0


def driven_parent_inverse(pivot_ob, neutral_offset_deg):
    """Parent inverse used for everything driven by the controller: (pivot_world @ Rx(offset))^-1."""
    return (pivot_ob.matrix_world @ Matrix.Rotation(math.radians(neutral_offset_deg), 4, "X")).inverted()


def _nearest(bvh, point):
    loc, normal, face, dist = bvh.find_nearest(tuple(point), 0.1)
    return (np.array(loc), np.array(normal), int(face), float(dist)) if loc is not None else (None, None, -1, np.inf)


def _pca_end_centroid(V, end, end_fraction, y_ext):
    """Comparison only: centroid of the requested principal-axis end region (proximal = further up the humerus axis)."""
    c = V.mean(0)
    _u, s, vt = np.linalg.svd(V - c, full_matrices=False)
    t = V @ unit(vt[0])
    length = float(t.max() - t.min())
    ends = {"A": V[t <= t.min() + end_fraction * length].mean(0), "B": V[t >= t.max() - end_fraction * length].mean(0)}
    prox = max(ends, key=lambda k: float(ends[k] @ -y_ext))
    key = prox if end == "proximal" else ("B" if prox == "A" else "A")
    return ends[key], [float(x) for x in s]


def compute_band_anchors(spec, objects_by_structure, pivot_ob):
    """Return {key: result} for every entry in spec['overlay']['bandAnchors'].

    Method 'ligament_contact_snap' (source coordinates == mesh-local coordinates; the ligament is stationary):
      1. for every ligament vertex, distance to the attach bone and to the opposite-side bones
         (proximal attachment: opposite = radius, ulna; distal attachment: opposite = humerus);
      2. contact region = vertices nearer the attach bone than the opposite side, within contact_band_mm of the
         closest contact with the attach bone;
      3. the contact-region centroid is snapped to the nearest SURFACE point of the attach bone; that point is the anchor.
    Deterministic for a given mesh + spec. The principal-axis end rule is computed for comparison only.
    """
    sem = spec["rig"]["semantics"]
    fr = frames(pivot_ob, sem["neutral_offset_deg"])
    y_ext = unit(np.array(pivot_ob.matrix_world.to_3x3().col[1]))
    pivot = fr["pivot_point"]
    offset_mm = spec["overlay"]["anchorConventions"]["labelOffsetMm"]
    bvh_cache = {}

    def bvh(sid):
        if sid not in bvh_cache:
            bvh_cache[sid] = local_bvh(objects_by_structure[sid])
        return bvh_cache[sid]

    out = {}
    for b in spec["overlay"]["bandAnchors"]:
        m = b["method"]
        if m["kind"] != "ligament_contact_snap":
            raise ValueError("unknown band method " + m["kind"])
        V = local_verts(objects_by_structure[m["ligament"]])
        attach, opposite = m["attach_bone"], m["opposite_bones"]
        d_attach = np.array([_nearest(bvh(attach), v)[3] for v in V])
        d_opp = np.array([min(_nearest(bvh(o), v)[3] for o in opposite) for v in V])
        eligible = np.where(d_attach < d_opp)[0]
        if not len(eligible):
            raise ValueError(b["key"] + ": no ligament vertex is nearer the attach bone than the opposite side")
        closest = float(d_attach[eligible].min())
        region = eligible[d_attach[eligible] <= closest + m["contact_band_mm"] / 1000]
        centroid = V[region].mean(0)
        pos, normal, face, snap_dist = _nearest(bvh(attach), centroid)
        dirv = direction(m["direction"], False, fr)
        rel = pos - pivot
        pca_centroid, singular = _pca_end_centroid(V, b["attachmentSide"], 0.2, y_ext)
        pca_pos, _n, _f, _d = _nearest(bvh(attach), pca_centroid)
        out[b["key"]] = {
            "parent": b["parent"], "snapBone": attach, "snapFaceIndex": face,
            "localPosition": [float(v) for v in pos], "vertexIndex": -1,
            "vertexNormalLocal": [float(v) for v in normal], "labelDirectionLocal": [float(v) for v in dirv],
            "leaderOriginLocal": [float(v) for v in pos], "labelTargetLocal": [float(v) for v in pos + dirv * offset_mm / 1000],
            "diagnostics": {"contact_region_vertices": int(len(region)), "closest_contact_mm": round(closest * 1000, 3),
                            "contact_centroid": [round(float(v), 6) for v in centroid], "snap_distance_mm": round(snap_dist * 1000, 3),
                            "lateral_of_pivot_mm": round(float(rel @ fr["lateral"]) * 1000, 2),
                            "above_pivot_mm": round(float(rel @ -y_ext) * 1000, 2),
                            "anterior_of_pivot_mm": round(float(rel @ fr["anterior_stationary"]) * 1000, 2),
                            "ligament_singular_values_mm": [round(x * 1000, 1) for x in singular],
                            "pca_end_rule_comparison_mm": round(float(np.linalg.norm(pca_pos - pos)) * 1000, 2)},
        }
    return out


def band_sanity(results, spec):
    """Attachment plausibility for the collateral-ligament band anchors; returns failures."""
    f = []
    forearm = {"radius_r", "ulna_r"}
    for b in spec["overlay"]["bandAnchors"]:
        r, d = results[b["key"]], results[b["key"]]["diagnostics"]
        side = b["band"]["side"]
        if b["attachmentSide"] == "proximal" and (r["snapBone"] != "humerus_r" or d["above_pivot_mm"] <= 0):
            f.append(b["key"] + ": proximal attachment must be on the humerus above the pivot")
        if b["attachmentSide"] == "distal" and (r["snapBone"] not in forearm or d["above_pivot_mm"] >= 0):
            f.append(b["key"] + ": distal attachment must be on radius/ulna below the pivot")
        if side == "lateral" and d["lateral_of_pivot_mm"] <= 0:
            f.append(b["key"] + ": lateral (radial) band anchor is not lateral")
        if side == "medial" and d["lateral_of_pivot_mm"] >= 0:
            f.append(b["key"] + ": medial (ulnar) band anchor is not medial")
        if d["snap_distance_mm"] > BAND_SNAP_LIMIT_MM:
            f.append("{}: ligament end is {} mm from bone (> {} mm)".format(b["key"], d["snap_distance_mm"], BAND_SNAP_LIMIT_MM))
    return f
