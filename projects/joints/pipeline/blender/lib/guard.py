"""Checks every pipeline script runs before touching data (runs inside Blender)."""
import hashlib
import json
import os

import bpy

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))


def load_config():
    with open(os.path.join(ROOT, "pipeline", "config.json"), encoding="utf-8") as fh:
        return json.load(fh)


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def check_environment(config, *, expect_master_open):
    """Return a dict of checks; raise RuntimeError when any required check fails."""
    master = config["master"]
    checks = {
        "blender_version": bpy.app.version_string,
        "blender_version_ok": bpy.app.version_string.startswith(config["blender"]["versionPin"]),
        "master_sha256_ok": file_sha256(master["path"]) == master["sha256"],
        "open_file": bpy.data.filepath,
    }
    if expect_master_open:
        checks["open_file_is_master"] = os.path.normcase(os.path.abspath(bpy.data.filepath)) == os.path.normcase(os.path.abspath(master["path"]))
    failed = [k for k, v in checks.items() if k.endswith("_ok") or k == "open_file_is_master"]
    failed = [k for k in failed if checks[k] is not True]
    if failed:
        raise RuntimeError("Environment check failed: {}".format(", ".join(failed)))
    return checks
