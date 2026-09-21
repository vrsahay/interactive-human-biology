"""Determine the right-elbow neutral (true extension) offset from the fitted axis and the anatomy (READ-ONLY).

Run with Joints_Working.blend (Step-5 state) open. Writes qa/reports/elbow_r.neutral_offset.json.

Flexion angle of a pose = signed angle, about the fitted flexion axis a (positive = flexion), between the projections onto the
plane perpendicular to a of:
  - humerus long axis (distal-pointing) and
  - forearm long axis (distal-pointing).
Axis definitions evaluated:
  isb        humerus: glenohumeral centre (sphere fit of humeral head) -> epicondyle midpoint;
             forearm: epicondyle midpoint -> ulnar styloid (ISB recommendation, Wu et al. 2005)       <- PRIMARY
  shaft_ulna humerus diaphysis PCA (25-75 %) vs ulna diaphysis PCA (25-75 %)   (the earlier 25.97 deg estimate)
  shaft_rad  humerus diaphysis PCA vs radius diaphysis PCA
  styloids   epicondyle midpoint -> midpoint of radial and ulnar styloid tips (forearm), humerus as isb
Source pose flexion under the primary definition = neutral offset (controller 0 = true extension = source rotated by -offset).
Also sweeps the forearm about the axis relative to the source pose to locate bony contact (extension and flexion stops).
"""
import datetime
import json
import math
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import fits  # noqa: E402
import guard  # noqa: E402

PIVOT = np.array([-0.22139, 0.03484, 1.10336])
FLEX_AXIS = fits.unit([-0.97411, 0.10983, 0.19758])


def signed_flexion(humerus_distal_dir, forearm_distal_dir, axis=FLEX_AXIS):
    p = lambda v: fits.unit(np.asarray(v) - np.dot(v, axis) * axis)
    u, v = p(humerus_distal_dir), p(forearm_distal_dir)
    return math.degrees(math.atan2(np.dot(np.cross(u, v), axis), np.dot(u, v)))


def main():
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    reports = os.path.join(guard.ROOT, config["reports"])
    fit = json.load(open(os.path.join(reports, "elbow_r.pivot_fit.json"), encoding="utf-8"))
    if np.linalg.norm(np.array(fit["final"]["point"]) - PIVOT) > 1e-5 or fits.angle_deg(fit["final"]["flexion_axis_world"], FLEX_AXIS) > 1e-3:
        raise RuntimeError("pivot/axis constants differ from the approved fit")

    objs = {o.get("structureId"): o for o in bpy.data.objects if o.get("structureId")}
    if any(o.type != "MESH" for o in bpy.data.objects) or len(bpy.data.objects) != 49:
        raise RuntimeError("working file is not in the Step-5 state")
    H, U, Rd = fits.world_verts(objs["humerus_r"]), fits.world_verts(objs["ulna_r"]), fits.world_verts(objs["radius_r"])
    bvh = {k: fits.bvh_world(objs[k]) for k in ("humerus_r", "scapula_r", "clavicle_r")}

    # Landmarks derived from geometry
    cap = H[H[:, 2] > H[:, 2].max() - 0.05]
    head = cap[cap[:, 0] > cap[:, 0].max() - 0.04]
    gh_centre, gh_r, gh_rms, _ = fits.sphere_fit(head)
    low = H[H[:, 2] < H[:, 2].min() + 0.05]
    lat_epi, med_epi = low[low[:, 0].argmin()], low[low[:, 0].argmax()]
    epi_mid = (lat_epi + med_epi) / 2

    def shaft(points):
        z0, z1 = points[:, 2].min(), points[:, 2].max()
        mid = points[(points[:, 2] > z0 + 0.25 * (z1 - z0)) & (points[:, 2] < z0 + 0.75 * (z1 - z0))]
        c, d = fits.pca_direction(mid)
        return c, (d if d[2] < 0 else -d)

    _hc, hum_shaft = shaft(H)
    _uc, uln_shaft = shaft(U)
    _rc, rad_shaft = shaft(Rd)
    # Styloids: most distal vertices along each bone's own shaft direction (mean of the 5 most distal)
    def distal_tip(points, direction):
        s = points @ direction
        return points[np.argsort(s)[-5:]].mean(0)
    ulnar_styloid = distal_tip(U, uln_shaft)
    radial_styloid = distal_tip(Rd, rad_shaft)

    humerus_isb = epi_mid - gh_centre
    estimates = {
        "isb": signed_flexion(humerus_isb, ulnar_styloid - epi_mid),
        "shaft_ulna": signed_flexion(hum_shaft, uln_shaft),
        "shaft_radius": signed_flexion(hum_shaft, rad_shaft),
        "styloids_midpoint": signed_flexion(humerus_isb, (ulnar_styloid + radial_styloid) / 2 - epi_mid),
    }
    offset = estimates["isb"]

    # Region classification in the pivot frame (x lateral along +axis, y distal along the forearm, z anterior/flexion travel)
    y_axis = fits.unit(uln_shaft - np.dot(uln_shaft, FLEX_AXIS) * FLEX_AXIS)
    z_axis = np.cross(FLEX_AXIS, y_axis)

    def region(p):
        v = np.asarray(p) - PIVOT
        return {"lateral_mm": round(float(v @ FLEX_AXIS) * 1000, 1), "along_forearm_mm": round(float(v @ y_axis) * 1000, 1), "anterior_mm": round(float(v @ z_axis) * 1000, 1)}

    def overlap(phi_deg):
        """phi = rotation relative to the source pose (positive = flexion)."""
        rot = fits.rotation_about_axis(FLEX_AXIS, math.radians(phi_deg))
        out = {}
        for bone, V in (("ulna", U), ("radius", Rd)):
            P = (V - PIVOT) @ rot.T + PIVOT
            _u, s = fits.nearest(bvh["humerus_r"], P, 0.01)
            finite = np.isfinite(s)
            worst = float(max(0.0, -s[finite].min())) if finite.any() else 0.0
            clearance = float(_u[finite].min()) if finite.any() else None
            entry = {"max_overlap_mm": round(worst * 1000, 3), "min_distance_mm": round(clearance * 1000, 3) if clearance is not None else None}
            if worst > 0.0005:
                i = int(np.nanargmin(np.where(finite, s, np.inf)))
                loc = bvh["humerus_r"].find_nearest(P[i].tolist(), 0.01)[0]
                entry["deepest_contact_humerus"] = region(np.array(loc))
            out[bone] = entry
        return out

    sweep = {}
    for phi in range(-45, 21):
        sweep[str(phi)] = overlap(phi)
    def first_exceed(direction, threshold):
        rng = range(0, -46, -1) if direction < 0 else range(0, 21)
        for phi in rng:
            if max(v["max_overlap_mm"] for v in sweep[str(phi)].values()) > threshold:
                return phi
        return None

    r = lambda v, n=5: [round(float(x), n) for x in v]
    report = {
        "joint": "elbow_r", "generated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
        "method": __doc__.strip(), "pivot": r(PIVOT), "flexion_axis": r(FLEX_AXIS),
        "landmarks": {"glenohumeral_centre": r(gh_centre), "gh_radius_mm": round(gh_r * 1000, 2), "gh_rms_mm": round(gh_rms * 1000, 3),
                      "lateral_epicondyle": r(lat_epi), "medial_epicondyle": r(med_epi), "epicondyle_midpoint": r(epi_mid),
                      "ulnar_styloid": r(ulnar_styloid), "radial_styloid": r(radial_styloid)},
        "source_flexion_estimates_deg": estimates,
        "previous_unsigned_shaft_estimate_deg": fit["source_pose"]["flexion_in_plane_deg"],
        "neutral_offset_deg": offset, "neutral_offset_definition": "isb",
        "extension_contact": {"phi_first_over_0_5mm": first_exceed(-1, 0.5), "phi_first_over_2mm": first_exceed(-1, 2.0),
                              "phi_at_true_extension": -offset,
                              "overlap_at_true_extension": overlap(-offset)},
        "sweep_relative_to_source": sweep,
    }
    with open(os.path.join(reports, "elbow_r.neutral_offset.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    ext = report["extension_contact"]
    compact = {phi: {b: v["max_overlap_mm"] for b, v in sweep[str(phi)].items()} for phi in (-45, -40, -35, -30, -28, -26, -24, -22, -20, -15, -10, -5, 0)}
    return {"landmarks": report["landmarks"], "estimates": estimates, "neutral_offset_deg": offset, "extension_contact": ext, "overlap_by_phi": compact}


REPORT_SUMMARY = main()
