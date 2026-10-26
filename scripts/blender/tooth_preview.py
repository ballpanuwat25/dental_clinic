"""Stills of the molar alone from a few angles, to judge its shape before it goes into the scene.

Run: D:/blender.exe -b --factory-startup -P scripts/blender/tooth_preview.py
Writes design/3d/stills/tooth-<angle>.jpg.
"""
import math
import sys
import time
from pathlib import Path

import bpy

sys.path.append(str(Path(__file__).parent))
import scene_kit  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
scene = bpy.context.scene
for o in list(scene.objects):
    bpy.data.objects.remove(o)

t0 = time.time()
parts = scene_kit.tooth_objects()
print("meshed in", round(time.time() - t0, 1), "s", {k: len(o.data.polygons) for k, o in parts.items()})
scene_kit.look(scene)

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 60
scene.collection.objects.link(cam)
aim = bpy.data.objects.new("aim", None)
aim.location = (0, 0, -0.05)
scene.collection.objects.link(aim)
tr = cam.constraints.new("TRACK_TO")
tr.target = aim
scene.camera = cam
r = scene.render
r.resolution_x, r.resolution_y = 900, 900
r.image_settings.file_format = "JPEG"

out = ROOT / "design" / "3d" / "stills"
out.mkdir(parents=True, exist_ok=True)
for name, th, ph in [("front", 0, 8), ("three-quarter", -40, 18), ("top", -20, 60)]:
    th, ph = math.radians(th), math.radians(ph)
    d = 6.5
    cam.location = (d * math.cos(ph) * math.sin(th), -d * math.cos(ph) * math.cos(th), -0.05 + d * math.sin(ph))
    r.filepath = str(out / f"tooth-{name}.jpg")
    bpy.ops.render.render(write_still=True)
# the layers apart, for the exploded hold
parts["enamel"].location.z = 1.4
parts["pulp"].location.x = 1.6
cam.location = (-2.0, -7.5, 1.6)
aim.location = (0.8, 0, 0.2)
r.filepath = str(out / "tooth-apart.jpg")
bpy.ops.render.render(write_still=True)
