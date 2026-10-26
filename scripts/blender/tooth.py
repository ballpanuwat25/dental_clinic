"""A lower first molar built from signed distance fields, meshed with surface nets.

The tooth stands with its crown up: cusp tips near z=0.95, the enamel's edge (CEJ) at z=0.2,
root tips near z=-1.1. Two roots, flattened front to back and bent slightly toward the back.
Returns three layers that nest inside each other: enamel (the crown's shell), dentin (crown
core and roots, hollow), pulp (the chamber and the two canals).
"""
import numpy as np

STEP = 0.011
LO = np.array([-0.78, -0.7, -1.22])
HI = np.array([0.78, 0.7, 1.08])
CEJ = 0.2
ENAMEL = 0.075


def length(*c):
    return np.sqrt(sum(x * x for x in c))


def smin(a, b, k):
    h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
    return b + (a - b) * h - k * h * (1 - h)


def smax(a, b, k):
    return -smin(-a, -b, k)


def ellipsoid(x, y, z, c, r):
    px, py, pz = (x - c[0]) / r[0], (y - c[1]) / r[1], (z - c[2]) / r[2]
    k0 = length(px, py, pz)
    k1 = length(px / r[0], py / r[1], pz / r[2])
    return k0 * (k0 - 1) / np.maximum(k1, 1e-6)


def round_box(x, y, z, c, b, r):
    qx = np.abs(x - c[0]) - b[0] + r
    qy = np.abs(y - c[1]) - b[1] + r
    qz = np.abs(z - c[2]) - b[2] + r
    out = length(np.maximum(qx, 0), np.maximum(qy, 0), np.maximum(qz, 0))
    return out + np.minimum(np.maximum(np.maximum(qx, qy), qz), 0) - r


def cone(x, y, z, a, b, ra, rb, squash=1.0):
    """A capsule whose radius runs from ra at a to rb at b; `squash` thins it along x."""
    x, ax, bx = x * squash, a[0] * squash, b[0] * squash
    bax, bay, baz = bx - ax, b[1] - a[1], b[2] - a[2]
    pax, pay, paz = x - ax, y - a[1], z - a[2]
    h = np.clip((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1)
    return (length(pax - bax * h, pay - bay * h, paz - baz * h) - (ra + (rb - ra) * h)) / squash


def capsule(x, y, z, a, b, r):
    return cone(x, y, z, a, b, r, r)


# each root as points along its centreline with the radius there, mesial (front, -x) and distal (+x)
ROOTS = [
    [((-0.22, 0, -0.02), 0.24), ((-0.27, 0, -0.5), 0.18), ((-0.2, 0, -1.05), 0.06)],
    [((0.22, 0, -0.02), 0.23), ((0.25, 0, -0.48), 0.17), ((0.3, 0, -0.98), 0.06)],
]


def tooth(x, y, z):
    # crown: a rounded block bulging at the sides, narrower at the neck
    d = round_box(x, y, z, (0, 0, 0.52), (0.5, 0.43, 0.26), 0.2)
    d = smin(d, ellipsoid(x, y, z, (0, 0, 0.5), (0.57, 0.5, 0.3)), 0.1)
    # five cusps: three on the cheek side, two on the tongue side
    for cx, cy, r in [(-0.27, -0.2, 0.2), (0.0, -0.24, 0.2), (0.28, -0.18, 0.17), (-0.2, 0.21, 0.21), (0.22, 0.2, 0.2)]:
        d = smin(d, ellipsoid(x, y, z, (cx, cy, 0.74), (r * 1.15, r, r * 0.95)), 0.12)
    # the grooves between them
    d = smax(d, -capsule(x, y, z, (-0.42, 0.0, 0.9), (0.42, 0.0, 0.9), 0.045), 0.06)
    d = smax(d, -capsule(x, y, z, (-0.08, -0.45, 0.9), (0.0, 0.0, 0.9), 0.035), 0.05)
    d = smax(d, -capsule(x, y, z, (0.14, -0.45, 0.9), (0.08, 0.0, 0.9), 0.03), 0.05)
    d = smax(d, -capsule(x, y, z, (0.0, 0.45, 0.9), (0.02, 0.0, 0.9), 0.035), 0.05)
    # root trunk below the neck
    d = smin(d, round_box(x, y, z, (0, 0, 0.22), (0.43, 0.37, 0.3), 0.18), 0.22)
    for root in ROOTS:
        for (a, ra), (b, rb) in zip(root, root[1:]):
            d = smin(d, cone(x, y, z, a, b, ra, rb, squash=1.45), 0.1)
    return d


def pulp(x, y, z):
    d = ellipsoid(x, y, z, (0, 0, 0.36), (0.27, 0.2, 0.11))
    for cx, cy in [(-0.2, -0.13), (0.18, -0.13), (-0.16, 0.13), (0.16, 0.13)]:
        d = smin(d, ellipsoid(x, y, z, (cx, cy, 0.48), (0.07, 0.07, 0.1)), 0.06)
    for root in ROOTS:
        pts = [(p, r) for p, r in root]
        pts[0] = ((0.8 * pts[0][0][0], 0, 0.3), 0.08)
        for (a, ra), (b, rb) in zip(pts, pts[1:]):
            d = smin(d, cone(x, y, z, a, b, ra * 0.3 + 0.008, rb * 0.2, squash=1.45), 0.05)
    return d


def surface_nets(f):
    """Quads between grid cells where the field changes sign; one vertex per cell at its crossings' mean."""
    nx, ny, nz = f.shape
    total = np.zeros((nx - 1, ny - 1, nz - 1, 3))
    count = np.zeros((nx - 1, ny - 1, nz - 1))
    faces = []
    idx = np.indices(f.shape).transpose(1, 2, 3, 0).astype(float)
    for axis in range(3):
        a = f
        b = np.roll(f, -1, axis)
        sl = [slice(None)] * 3
        sl[axis] = slice(0, f.shape[axis] - 1)
        a, b, ii = a[tuple(sl)], b[tuple(sl)], idx[tuple(sl)]
        cross = (a < 0) != (b < 0)
        t = a / np.where(cross, a - b, 1)
        pos = ii.copy()
        pos[..., axis] += t
        # each edge touches up to four cells, offset in the other two axes
        o1, o2 = [d for d in range(3) if d != axis]
        e = np.argwhere(cross)
        p = pos[cross]
        for s1 in (0, 1):
            for s2 in (0, 1):
                c = e.copy()
                c[:, o1] -= s1
                c[:, o2] -= s2
                ok = np.all((c >= 0) & (c < np.array(count.shape)), axis=1)
                np.add.at(total, tuple(c[ok].T), p[ok])
                np.add.at(count, tuple(c[ok].T), 1)
        inner = (e[:, o1] >= 1) & (e[:, o2] >= 1) & (e[:, o1] < f.shape[o1] - 1) & (e[:, o2] < f.shape[o2] - 1)
        e = e[inner]
        flip = (a[cross][inner] < 0)
        quads = []
        for s1, s2 in [(1, 1), (0, 1), (0, 0), (1, 0)]:
            c = e.copy()
            c[:, o1] -= s1
            c[:, o2] -= s2
            quads.append(c)
        quads = np.stack(quads, 1)
        quads[flip] = quads[flip][:, ::-1]
        faces.append(quads)
    active = count > 0
    vid = -np.ones(count.shape, dtype=np.int64)
    vid[active] = np.arange(active.sum())
    verts = total[active] / count[active][:, None]
    quads = np.concatenate(faces)
    quads = vid[quads[..., 0], quads[..., 1], quads[..., 2]]
    return verts, quads


def mesh_field(field):
    xs = [np.arange(LO[i], HI[i] + STEP, STEP) for i in range(3)]
    x, y, z = np.meshgrid(*xs, indexing="ij")
    verts, quads = surface_nets(field(x, y, z))
    return verts * STEP + LO, quads


def layers():
    def enamel(x, y, z):
        t = tooth(x, y, z)
        return smax(smax(t, CEJ - z, 0.02), -(t + ENAMEL), 0.01)

    def dentin(x, y, z):
        k = np.clip((z - CEJ + 0.12) / 0.24, 0, 1)
        d = tooth(x, y, z) + ENAMEL * k * k * (3 - 2 * k)
        return np.maximum(d, -pulp(x, y, z))

    return {"enamel": mesh_field(enamel), "dentin": mesh_field(dentin), "pulp": mesh_field(pulp)}
