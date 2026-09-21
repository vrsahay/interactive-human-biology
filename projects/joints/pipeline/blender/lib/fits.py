"""Geometry fitting helpers for joint pivots (pure numpy + mathutils; no scene changes)."""
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


def world_verts(ob):
    me = ob.data
    co = np.empty(len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    co = co.reshape(-1, 3)
    mw = np.array(ob.matrix_world)
    return co @ mw[:3, :3].T + mw[:3, 3]


def bvh_world(ob):
    mw = ob.matrix_world
    verts = [mw @ v.co for v in ob.data.vertices]
    return BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in ob.data.polygons])


def nearest(bvh, points, max_dist=1.0):
    """Unsigned distance and signed distance (by the hit face normal) from each point to a BVH surface."""
    unsigned = np.full(len(points), np.inf)
    signed = np.full(len(points), np.inf)
    for i, p in enumerate(points):
        loc, normal, _index, dist = bvh.find_nearest(Vector(p), max_dist)
        if loc is not None:
            unsigned[i] = dist
            signed[i] = dist if np.dot(np.array(p) - np.array(loc), np.array(normal)) >= 0 else -dist
    return unsigned, signed


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def sphere_fit(points, iterations=4, tolerance=0.2):
    """Least-squares sphere with inlier trimming. Returns centre, radius (m), rms (m), inlier count."""
    def solve(q):
        a = np.c_[2 * q, np.ones(len(q))]
        c, *_ = np.linalg.lstsq(a, (q ** 2).sum(1), rcond=None)
        return c[:3], float(np.sqrt(c[3] + (c[:3] ** 2).sum()))
    q = np.asarray(points, float)
    centre, radius = solve(q)
    for _ in range(iterations):
        keep = q[np.abs(np.linalg.norm(q - centre, axis=1) - radius) < radius * tolerance]
        if len(keep) < 12:
            break
        q = keep
        centre, radius = solve(q)
    rms = float(np.sqrt(((np.linalg.norm(q - centre, axis=1) - radius) ** 2).mean()))
    return centre, radius, rms, len(q)


def plane_basis(axis):
    a = unit(axis)
    helper = np.array([0.0, 0.0, 1.0]) if abs(a[2]) < 0.9 else np.array([0.0, 1.0, 0.0])
    u = unit(np.cross(a, helper))
    return u, np.cross(a, u)


def circle_fit_about_axis(points, axis):
    """Project points onto the plane perpendicular to `axis`; 2D least-squares circle.
    Returns the 3D centre (at the points' mean axial position), radius, radial rms."""
    a = unit(axis)
    u, v = plane_basis(a)
    p = np.asarray(points, float)
    x, y = p @ u, p @ v
    m = np.c_[2 * x, 2 * y, np.ones(len(x))]
    sol, *_ = np.linalg.lstsq(m, x ** 2 + y ** 2, rcond=None)
    cx, cy = sol[0], sol[1]
    radius = float(np.sqrt(sol[2] + cx ** 2 + cy ** 2))
    rms = float(np.sqrt(((np.hypot(x - cx, y - cy) - radius) ** 2).mean()))
    axial = float((p @ a).mean())
    return cx * u + cy * v + axial * a, radius, rms


def line_fit(points):
    """Least-squares 3D line through points: (centroid, unit direction, rms distance to line)."""
    p = np.asarray(points, float)
    c = p.mean(0)
    _u, _s, vt = np.linalg.svd(p - c)
    d = unit(vt[0])
    residual = (p - c) - np.outer((p - c) @ d, d)
    return c, d, float(np.sqrt((np.linalg.norm(residual, axis=1) ** 2).mean()))


def pca_direction(points):
    p = np.asarray(points, float)
    c = p.mean(0)
    _u, _s, vt = np.linalg.svd(p - c)
    return c, unit(vt[0])


def angle_deg(a, b, undirected=False):
    d = float(np.dot(unit(a), unit(b)))
    if undirected:
        d = abs(d)
    return float(np.degrees(np.arccos(np.clip(d, -1.0, 1.0))))


def rotation_about_axis(axis, angle_rad):
    a = unit(axis)
    k = np.array([[0, -a[2], a[1]], [a[2], 0, -a[0]], [-a[1], a[0], 0]])
    return np.eye(3) + np.sin(angle_rad) * k + (1 - np.cos(angle_rad)) * (k @ k)
