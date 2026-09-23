"""
Shared spatial layout for the plant + soil diorama.

plant.glb and root-soil.glb are authored in the same coordinate system so
Three.js can place both at the origin and they line up exactly.
"""

import math

# Soil diorama (cylinder, cut in two along a vertical plane y = CUT_Y)
SOIL_RADIUS = 0.64
SOIL_DEPTH = 0.56          # soil goes from z = -SOIL_DEPTH up to the surface
CUT_Y = 0.10               # Soil_Front: y < CUT_Y (fades away), Soil_Back: y >= CUT_Y
BASE_THICKNESS = 0.05      # dark display plinth under the soil

# Roots must stay inside this envelope so they never poke out of the soil
ROOT_MAX_Y = CUT_Y - 0.025
ROOT_MIN_Z = -SOIL_DEPTH + 0.07
ROOT_MAX_R = SOIL_RADIUS - 0.08


def soil_height(x, y):
    """Height of the soil surface. Gentle mound around the stem + small undulation."""
    r2 = x * x + y * y
    mound = 0.022 * math.exp(-r2 / 0.05)
    ripple = 0.005 * math.sin(9.0 * x + 1.3) * math.cos(7.0 * y + 0.4)
    ripple += 0.003 * math.sin(17.0 * y + 2.1) * math.cos(13.0 * x)
    edge = -0.012 * max(0.0, (math.sqrt(r2) - 0.48) / 0.16)
    return mound + ripple + edge
