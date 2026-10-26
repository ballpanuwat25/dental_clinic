"""Stage 1 blockout for the home hero: a lower molar floating in a pale sky.

Scroll path (frames 1-240):
  1-30    hold A  hero: the whole tooth three-quarter, sitting right of the headline
  30-110  move    the camera swings round while the tooth comes apart in layers
  110-150 hold B  apart: enamel lifted off, dentin and roots in place, the pulp dropped below
  150-200 move    the layers close up again as the camera comes round to the front
  200-240 hold C  front view of the whole tooth, ready to book

Run: D:/blender.exe -b --factory-startup -P scripts/blender/blockout.py
Writes design/3d/hero-blockout.blend. The tooth itself is in tooth.py, the look in scene_kit.py.
"""
import math
import sys
from pathlib import Path

import bpy

sys.path.append(str(Path(__file__).parent))
import scene_kit  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "3d" / "hero-blockout.blend"

FRAMES = 240
HOLDS = [(1, 30), (110, 150), (200, 240)]
SCALE = 1.5  # the tooth is modelled about 2 units tall; the cameras were framed for 3


def smooth(k):
    k = max(0.0, min(1.0, k))
    return k * k * (3 - 2 * k)


def lerp(a, b, k):
    return a + (b - a) * k


def at(frame, keys):
    """Value at a frame from per-hold values, held inside each hold and eased between."""
    (_, a1), (b0, b1), (c0, _) = HOLDS
    A, B, C = keys
    if frame <= a1:
        return A
    if frame < b0:
        return lerp(A, B, smooth((frame - a1) / (b0 - a1)))
    if frame <= b1:
        return B
    if frame < c0:
        return lerp(B, C, smooth((frame - b1) / (c0 - b1)))
    return C


def explode(frame):
    if frame <= 50:
        return 0.0
    if frame < 110:
        return smooth((frame - 50) / 60)
    if frame <= 150:
        return 1.0
    if frame < 196:
        return 1 - smooth((frame - 150) / 46)
    return 0.0


def build():
    scene = bpy.context.scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)

    parts = scene_kit.tooth_objects()
    for obj in parts.values():
        obj.scale = (SCALE,) * 3
    # how far each layer travels when the tooth comes apart
    layers = {parts["enamel"]: 1.4, parts["dentin"]: 0.0, parts["pulp"]: -2.8}

    clouds = []
    for i, (c, s) in enumerate([((-4.2, 2.5, 2.2), 1.3), ((4.8, 3.5, -0.2), 1.5), ((-6.0, 3.0, -3.5), 1.0),
                                ((3.2, -1.2, 3.0), 0.9), ((0.5, 6.0, -1.8), 1.8), ((-6.5, 5.0, -0.1), 1.4)]):
        puffs = [((c[0] + dx * s, c[1] + dy * s, c[2] + dz * s), r * s)
                 for dx, dy, dz, r in [(0, 0, 0, 0.7), (0.75, 0.1, -0.15, 0.55), (-0.7, -0.1, -0.2, 0.5),
                                       (0.25, 0.2, 0.35, 0.5), (-0.3, 0.15, 0.25, 0.45), (1.2, 0, -0.3, 0.35)]]
        clouds.append(scene_kit.blob(f"cloud{i}", puffs, "#ffffff"))

    # key every frame: our own easing decides the path, Blender only plays it
    for f in range(1, FRAMES + 1):
        e = explode(f)
        for obj, dz in layers.items():
            obj.location = (0, 0, dz * e)
            obj.keyframe_insert("location", frame=f)
        for i, cl in enumerate(clouds):
            cl.location = (math.sin(f / 240 * math.tau + i) * 0.25, 0, math.cos(f / 160 * math.tau + i) * 0.12)
            cl.keyframe_insert("location", frame=f)

    # (angle round the tooth, elevation, distance, aim height, frame shift) per hold, for each crop
    paths = {
        "cam_wide": dict(theta=(-35, -72, 0), phi=(14, 4, 6), d=(7.5, 14, 7.8), tz=(-0.05, -0.75, -0.05), shift=("shift_x", (-0.17, 0.17, -0.17))),
        "cam_tall": dict(theta=(-35, -72, 0), phi=(14, 4, 6), d=(7.5, 12.5, 7), tz=(0.15, -0.75, -0.5), shift=("shift_y", (-0.12, -0.2, -0.08))),
    }
    for name, p in paths.items():
        cam_data = bpy.data.cameras.new(name)
        cam_data.lens = 35
        cam = bpy.data.objects.new(name, cam_data)
        scene.collection.objects.link(cam)
        # each camera looks at its own aim point, which rises and falls with the tooth
        aim = bpy.data.objects.new(f"aim_{name}", None)
        scene.collection.objects.link(aim)
        track = cam.constraints.new("TRACK_TO")
        track.target = aim
        track.track_axis = "TRACK_NEGATIVE_Z"
        track.up_axis = "UP_Y"
        prop, shifts = p["shift"]
        for f in range(1, FRAMES + 1):
            th = math.radians(at(f, p["theta"]))
            ph = math.radians(at(f, p["phi"]))
            d = at(f, p["d"])
            tz = at(f, p["tz"])
            cam.location = (d * math.cos(ph) * math.sin(th), -d * math.cos(ph) * math.cos(th), tz + d * math.sin(ph))
            cam.keyframe_insert("location", frame=f)
            setattr(cam_data, prop, at(f, shifts))
            cam_data.keyframe_insert(prop, frame=f)
            aim.location = (0, 0, tz)
            aim.keyframe_insert("location", frame=f)

    scene.frame_start, scene.frame_end = 1, FRAMES
    scene.render.fps = 24
    scene_kit.look(scene)
    scene.camera = bpy.data.objects["cam_wide"]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
    print("saved", OUT)


if __name__ == "__main__":
    build()
