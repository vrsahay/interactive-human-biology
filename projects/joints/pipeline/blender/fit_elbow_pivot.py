"""Fit the right elbow flexion axis from the extracted anatomy (READ-ONLY; run with Joints_Working.blend open).

No articular cartilage geometry exists, so articular surfaces are defined by bone-to-bone proximity.

Candidates (all reported, Blender world coordinates, right arm: medial = +X, anterior = -Y, up = +Z):
  A. sphere_centres  - line through sphere fits of the capitulum and trochlea proximity patches.
  B. distal_band     - design-doc method: sphere fits to the lateral/medial halves of the distal 16 mm of the humerus.
  C. functional      - FINAL. Axis (direction + position) found by Nelder-Mead minimising articular incongruence while the
                       forearm is rotated about it through 0-145 deg of flexion:
                         cost = trimmed mean over articular forearm vertices of the std-dev of their distance to the humerus
                                + penalty for penetration into the humerus.
                       Articular forearm vertices: ulnar trochlear notch and radial head vertices within 3 mm (+ min gap) of the
                       humerus whose nearest humerus point lies in the distal 18 mm (trochlea / capitulum, not the fossae).
                       Started from A and B; the lower-cost result is kept.
Cross-checks: epicondylar line (design gate <= 15 deg), candidate spread, congruence and penetration at 0/45/90/145.
Writes qa/reports/elbow_r.pivot_fit.json.
"""
import datetime
import json
import os
import sys

import bpy
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "lib"))
import fits  # noqa: E402
import guard  # noqa: E402

ARTICULAR_BAND = 0.003
ARTICULAR_Z = 0.018
SWEEP_FIT = [0, 20, 40, 60, 80, 100, 120, 145]
SWEEP_REPORT = [0, 45, 90, 145]
PENETRATION_WEIGHT = 4.0


def main():
    config = guard.load_config()
    env = guard.check_environment(config, expect_master_open=False)
    objs = {o.get("structureId"): o for o in bpy.data.objects if o.get("jointId") == "elbow_r"}
    hum, rad, uln = objs["humerus_r"], objs["radius_r"], objs["ulna_r"]
    H, Rv, Uv = fits.world_verts(hum), fits.world_verts(rad), fits.world_verts(uln)
    bvh_h, bvh_r, bvh_u = fits.bvh_world(hum), fits.bvh_world(rad), fits.bvh_world(uln)
    zmin_h = H[:, 2].min()

    # Normal orientation sanity: a point far outside the humerus must have positive signed distance.
    probe = H.mean(0) + np.array([0.0, -0.2, 0.0])
    _u, s_probe = fits.nearest(bvh_h, probe[None, :], 1.0)
    normals_outward = bool(s_probe[0] > 0)

    def articular(points):
        out = []
        dists = []
        for p in points:
            loc, _n, _i, d = bvh_h.find_nearest(p.tolist(), 0.05)
            if loc is not None:
                dists.append(d)
                out.append((p, d, loc[2]))
        dmin = min(dists)
        return np.array([p for p, d, z in out if d <= dmin + ARTICULAR_BAND and z < zmin_h + ARTICULAR_Z]), dmin

    notch, notch_gap = articular(Uv)
    head, head_gap = articular(Rv)
    forearm_articular = np.vstack([notch, head])

    # Candidate A: sphere centres of humeral proximity patches
    distal = H[H[:, 2] < zmin_h + 0.04]
    d_hr, _ = fits.nearest(bvh_r, distal, 0.05)
    d_hu, _ = fits.nearest(bvh_u, distal, 0.05)
    cap_patch = distal[d_hr <= d_hr.min() + 0.004]
    tro_patch = distal[(d_hu <= d_hu.min() + 0.004) & (d_hr > d_hr.min() + 0.004)]
    cA, rA, rmsA, _ = fits.sphere_fit(cap_patch)
    tA, rtA, rmstA, _ = fits.sphere_fit(tro_patch)
    candA = {"point": (cA + tA) / 2, "axis": fits.unit(tA - cA)}

    # Candidate B: design-doc distal band
    band = H[H[:, 2] < zmin_h + 0.016]
    xm = (band[:, 0].min() + band[:, 0].max()) / 2
    cB, rB, rmsB, _ = fits.sphere_fit(band[band[:, 0] < xm])
    tB, rtB, rmstB, _ = fits.sphere_fit(band[band[:, 0] >= xm])
    candB = {"point": (cB + tB) / 2, "axis": fits.unit(tB - cB)}

    low = H[H[:, 2] < zmin_h + 0.05]
    lat_epi, med_epi = low[low[:, 0].argmin()], low[low[:, 0].argmax()]
    epi_dir = fits.unit(med_epi - lat_epi)

    def evaluate(point, axis_lat_to_med, angles, detail=False):
        flex_axis = -fits.unit(axis_lat_to_med)
        per_angle_unsigned, per_angle_signed = [], []
        for deg in angles:
            rot = fits.rotation_about_axis(flex_axis, np.radians(deg))
            moved = (forearm_articular - point) @ rot.T + point
            u, s = fits.nearest(bvh_h, moved, 0.08)
            u[~np.isfinite(u)] = 0.08
            s[~np.isfinite(s)] = 0.08
            per_angle_unsigned.append(u)
            per_angle_signed.append(s)
        U = np.array(per_angle_unsigned)
        S = np.array(per_angle_signed)
        std = U.std(axis=0)
        trimmed = np.sort(std)[: max(1, int(0.8 * len(std)))]
        penetration = np.clip(-S, 0, None)
        cost = float(trimmed.mean() + PENETRATION_WEIGHT * np.sqrt((penetration ** 2).mean()))
        if not detail:
            return cost
        return cost, U, S, std

    def to_params(point, axis, frame):
        a = fits.unit(axis)
        return np.array([np.dot(a, frame[1]), np.dot(a, frame[2]), 0.0, 0.0])

    def optimise(start):
        base_axis = fits.unit(start["axis"])
        u, v = fits.plane_basis(base_axis)
        base_point = start["point"]

        def unpack(x):
            axis = fits.unit(base_axis + x[0] * u + x[1] * v)
            offset = x[2] * u + x[3] * v
            return base_point + offset, axis

        def f(x):
            p, a = unpack(x)
            if abs(x[0]) > 1.0 or abs(x[1]) > 1.0 or np.linalg.norm(x[2:]) > 0.02:
                return 1e3
            return evaluate(p, a, SWEEP_FIT)

        # Nelder-Mead (4 parameters): steps ~6 deg and 2 mm
        steps = np.array([0.1, 0.1, 0.002, 0.002])
        simplex = [np.zeros(4)] + [np.eye(4)[i] * steps[i] for i in range(4)]
        values = [f(x) for x in simplex]
        evaluations = len(values)
        for _ in range(250):
            order = np.argsort(values)
            simplex = [simplex[i] for i in order]
            values = [values[i] for i in order]
            if abs(values[-1] - values[0]) < 1e-7 and np.max([np.linalg.norm(s - simplex[0]) for s in simplex]) < 1e-5:
                break
            centroid = np.mean(simplex[:-1], axis=0)
            xr = centroid + (centroid - simplex[-1]); fr = f(xr); evaluations += 1
            if fr < values[0]:
                xe = centroid + 2 * (centroid - simplex[-1]); fe = f(xe); evaluations += 1
                simplex[-1], values[-1] = (xe, fe) if fe < fr else (xr, fr)
            elif fr < values[-2]:
                simplex[-1], values[-1] = xr, fr
            else:
                xc = centroid + 0.5 * (simplex[-1] - centroid); fc = f(xc); evaluations += 1
                if fc < values[-1]:
                    simplex[-1], values[-1] = xc, fc
                else:
                    for i in range(1, 5):
                        simplex[i] = simplex[0] + 0.5 * (simplex[i] - simplex[0])
                        values[i] = f(simplex[i]); evaluations += 1
        best = int(np.argmin(values))
        p, a = unpack(simplex[best])
        # Re-anchor the point to the axis position closest to the midpoint of the articular sets
        mid = forearm_articular.mean(0)
        p = p + np.dot(mid - p, a) * a
        return {"point": p, "axis": a, "cost": values[best], "evaluations": evaluations}

    start_costs = {"sphere_centres": evaluate(candA["point"], candA["axis"], SWEEP_FIT), "distal_band": evaluate(candB["point"], candB["axis"], SWEEP_FIT)}
    runs = {"from_sphere_centres": optimise(candA), "from_distal_band": optimise(candB)}
    final_key = min(runs, key=lambda k: runs[k]["cost"])
    final = runs[final_key]
    if np.dot(final["axis"], [1.0, 0.0, 0.0]) < 0:
        final["axis"] = -final["axis"]

    def report_sweep(point, axis):
        cost, U, S, std = evaluate(point, axis, SWEEP_REPORT, detail=True)
        poses = {}
        for i, deg in enumerate(SWEEP_REPORT):
            poses[str(deg)] = {"articular_gap_mean_mm": round(float(U[i].mean()) * 1000, 3), "articular_gap_min_mm": round(float(U[i].min()) * 1000, 3),
                               "penetration_max_mm": round(float(max(0.0, -S[i].min())) * 1000, 3),
                               "vertices_penetrating_over_0_5mm": int((S[i] < -0.0005).sum())}
        return {"cost": round(cost * 1000, 4), "gap_std_median_mm": round(float(np.median(std)) * 1000, 3), "poses": poses}

    r = lambda v, n=5: [round(float(x), n) for x in v]

    def dist_to_line(p, point, axis):
        vec = np.asarray(p) - point
        return float(np.linalg.norm(vec - np.dot(vec, axis) * axis))

    # Source pose relative to the final axis
    def shaft(points):
        z0, z1 = points[:, 2].min(), points[:, 2].max()
        mid = points[(points[:, 2] > z0 + 0.25 * (z1 - z0)) & (points[:, 2] < z0 + 0.75 * (z1 - z0))]
        _c, d = fits.pca_direction(mid)
        return d if d[2] < 0 else -d
    ax = final["axis"]
    hum_dir, uln_dir = shaft(H), shaft(Uv)
    proj = lambda v: fits.unit(v - np.dot(v, ax) * ax)
    source_flexion = fits.angle_deg(proj(hum_dir), proj(uln_dir))
    # Is the ulna deviated anteriorly (flexed) relative to the humerus in the flexion plane?
    flexed_anteriorly = bool(np.dot(np.cross(proj(hum_dir), proj(uln_dir)), -ax) > 0)
    out_of_plane = lambda v: 90.0 - fits.angle_deg(v, ax, undirected=True)

    report = {
        "joint": "elbow_r", "generated_at": datetime.datetime.now().isoformat(timespec="seconds"), "environment": env,
        "method": __doc__.strip(),
        "parameters": {"articular_band_m": ARTICULAR_BAND, "articular_z_m": ARTICULAR_Z, "sweep_fit_deg": SWEEP_FIT, "penetration_weight": PENETRATION_WEIGHT},
        "humerus_normals_outward": normals_outward,
        "articular_sets": {"ulnar_notch_vertices": len(notch), "radial_head_vertices": len(head),
                           "ulna_min_gap_mm": round(notch_gap * 1000, 3), "radius_min_gap_mm": round(head_gap * 1000, 3)},
        "candidates": {
            "sphere_centres": {"point": r(candA["point"]), "axis_lat_to_med": r(candA["axis"]), "capitulum_r_mm": round(rA * 1000, 2), "capitulum_rms_mm": round(rmsA * 1000, 3),
                               "trochlea_r_mm": round(rtA * 1000, 2), "trochlea_rms_mm": round(rmstA * 1000, 3),
                               "vs_epicondylar_deg": round(fits.angle_deg(candA["axis"], epi_dir, True), 2), "sweep": report_sweep(candA["point"], candA["axis"])},
            "distal_band": {"point": r(candB["point"]), "axis_lat_to_med": r(candB["axis"]), "lateral_r_mm": round(rB * 1000, 2), "lateral_rms_mm": round(rmsB * 1000, 3),
                            "medial_r_mm": round(rtB * 1000, 2), "medial_rms_mm": round(rmstB * 1000, 3),
                            "vs_epicondylar_deg": round(fits.angle_deg(candB["axis"], epi_dir, True), 2), "sweep": report_sweep(candB["point"], candB["axis"])},
            "functional_runs": {k: {"point": r(v["point"]), "axis_lat_to_med": r(v["axis"]), "cost_mm": round(v["cost"] * 1000, 4), "evaluations": v["evaluations"],
                                    "vs_epicondylar_deg": round(fits.angle_deg(v["axis"], epi_dir, True), 2)} for k, v in runs.items()},
        },
        "final": {
            "method": "functional (" + final_key + ")",
            "point": r(final["point"]), "axis_lat_to_med": r(final["axis"]),
            "flexion_axis_world": r(-final["axis"]),
            "vs_epicondylar_deg": round(fits.angle_deg(final["axis"], epi_dir, True), 2),
            "vs_sphere_centres_deg": round(fits.angle_deg(final["axis"], candA["axis"], True), 2),
            "vs_distal_band_deg": round(fits.angle_deg(final["axis"], candB["axis"], True), 2),
            "functional_runs_agreement_deg": round(fits.angle_deg(runs["from_sphere_centres"]["axis"], runs["from_distal_band"]["axis"], True), 2),
            "functional_runs_point_separation_mm": round(dist_to_line(runs["from_sphere_centres"]["point"], final["point"], final["axis"]) * 1000, 3),
            "distance_to_epicondylar_line_mm": round(dist_to_line(final["point"], lat_epi, epi_dir) * 1000, 2),
            "sweep": report_sweep(final["point"], final["axis"]),
        },
        "epicondyles": {"lateral": r(lat_epi), "medial": r(med_epi), "direction_lat_to_med": r(epi_dir)},
        "start_costs_mm": {k: round(v * 1000, 4) for k, v in start_costs.items()},
        "source_pose": {"flexion_in_plane_deg": round(source_flexion, 2), "ulna_flexed_anteriorly": flexed_anteriorly,
                        "carrying_angle_deg": round(abs(out_of_plane(uln_dir) - out_of_plane(hum_dir)), 2),
                        "humerus_ulna_3d_angle_deg": round(fits.angle_deg(hum_dir, uln_dir), 2),
                        "humerus_shaft_dir": r(hum_dir), "ulna_shaft_dir": r(uln_dir)},
    }
    with open(os.path.join(guard.ROOT, config["reports"], "elbow_r.pivot_fit.json"), "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)
    c = report["candidates"]
    return {"normals_outward": normals_outward, "articular_sets": report["articular_sets"], "start_costs_mm": report["start_costs_mm"],
            "sphere_centres": {k: c["sphere_centres"][k] for k in ("axis_lat_to_med", "vs_epicondylar_deg")} | {"sweep_cost": c["sphere_centres"]["sweep"]["cost"]},
            "distal_band": {k: c["distal_band"][k] for k in ("axis_lat_to_med", "vs_epicondylar_deg")} | {"sweep_cost": c["distal_band"]["sweep"]["cost"]},
            "functional_runs": c["functional_runs"], "final": report["final"], "source_pose": report["source_pose"]}


REPORT_SUMMARY = main()
