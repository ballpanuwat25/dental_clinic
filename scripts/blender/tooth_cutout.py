"""One toy molar on a transparent background, with its soft shadow, for the hero layouts.

Run: D:/blender.exe -b --factory-startup -P scripts/blender/tooth_cutout.py [-- stand]
Writes design/hero/tooth-<view>.png (RGBA). With "stand" the sun is nearly overhead, so the shadow stays
a short pool under the roots and the tooth can stand on a drawn floor line; that writes tooth-stand.png.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.append(str(Path(__file__).parent))
import scene_kit  # noqa: E402
from cute_scene import toy_mesh  # noqa: E402
from story_scene import look_at  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "hero"

scene = bpy.context.scene
for o in list(scene.objects):
    bpy.data.objects.remove(o)
tooth = bpy.data.objects.new("tooth", toy_mesh())
scene.collection.objects.link(tooth)
# the floor only catches the shadow; everything else is see-through
floor_mesh = bpy.data.meshes.new("floor")
floor_mesh.from_pydata([(-20, -20, 0), (20, -20, 0), (20, 20, 0), (-20, 20, 0)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new("floor", floor_mesh)
floor.is_shadow_catcher = True
scene.collection.objects.link(floor)

# light from above and slightly behind: the white keeps its form and the shadow falls soft toward the viewer's right
STAND = "stand" in sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else False
scene_kit.look(scene, sky="#f3f6f6", light="#d8e6ee", light_strength=0.6, sun_energy=3.2, sun_angle=0.7,
               sun_rot=(12, 0, -150) if STAND else (30, 0, -150))
scene.view_settings.exposure = -0.2
scene.render.engine = "CYCLES"
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = 1400
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 70
scene.collection.objects.link(cam)
scene.camera = cam
OUT.mkdir(parents=True, exist_ok=True)
views = [("stand", Vector((-3.4, -6.2, 2.0)))] if STAND else [
    ("three-quarter", Vector((-3.4, -6.2, 2.6))), ("front", Vector((0, -7.2, 1.6)))]
for name, eye in views:
    cam.location = eye
    cam.rotation_euler = look_at(eye, Vector((0, 0, 0.62)), Vector((0, 0, 1)))
    scene.render.filepath = str(OUT / f"tooth-{name}.png")
    bpy.ops.render.render(write_still=True)
print("cutouts done")

# trim each cutout to the tooth and its shadow, with a little room
import numpy as np  # noqa: E402

for path in [OUT / f"tooth-{name}.png" for name, _ in views]:
    img = bpy.data.images.load(str(path))
    w, h = img.size
    px = np.array(img.pixels[:]).reshape(h, w, 4)
    ys, xs = np.where(px[..., 3] > 0.03)
    pad = 40
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, w)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, h)
    crop = px[y0:y1, x0:x1]
    out = bpy.data.images.new(path.stem, x1 - x0, y1 - y0, alpha=True)
    out.pixels = crop.ravel()
    out.filepath_raw = str(path)
    out.file_format = "PNG"
    out.save()
print("trimmed")
