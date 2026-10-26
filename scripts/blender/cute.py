"""A toy molar: a soft rounded block with a dip across the top and two short, chunky roots it stands on.

Stands on z=0, about 1.4 tall. Meshed with the surface nets in tooth.py.
"""
import numpy as np

from tooth import capsule, cone, round_box, smax, smin, surface_nets

STEP = 0.012
LO = np.array([-0.75, -0.65, -0.05])
HI = np.array([0.75, 0.65, 1.55])


def toy(x, y, z):
    d = round_box(x, y, z, (0, 0, 0.86), (0.56, 0.47, 0.52), 0.34)
    # the dip between the two humps on top, front to back
    d = smax(d, -capsule(x, y, z, (0, -0.7, 1.52), (0, 0.7, 1.52), 0.16), 0.14)
    # two short roots that splay a little, rounded where they touch the floor
    for sx in (-1, 1):
        d = smin(d, cone(x, y, z, (sx * 0.27, 0, 0.42), (sx * 0.29, 0, 0.22), 0.28, 0.24, squash=1.0), 0.12)
    # the notch between the roots
    d = smax(d, -capsule(x, y, z, (0, -0.7, 0.0), (0, 0.7, 0.0), 0.13), 0.08)
    # a flat sole, so it stands rather than balances
    d = smax(d, -z, 0.04)
    return d


def mesh():
    xs = [np.arange(LO[i], HI[i] + STEP, STEP) for i in range(3)]
    x, y, z = np.meshgrid(*xs, indexing="ij")
    verts, quads = surface_nets(toy(x, y, z))
    return verts * STEP + LO, quads
