"""The standing toy molar turning half round on the spot, as transparent frames for a scroll sequence.

Same light and camera as tooth_cutout.py's "stand" view; only the tooth turns, so its shadow turns with it.
Every frame is cropped to the same box (the union of all frames), so the frames stack without jumping.
Run: D:/blender.exe -b --factory-startup -P scripts/blender/tooth_turn.py [-- test]
With "test" it renders only the first frame under a few sun angles, small, to design/hero/turn-test-N.png.
Writes design/directions/turn/tNN.webp and prints where the body sits in the crop.
"""
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

sys.path.append(str(Path(__file__).parent))
import scene_kit  # noqa: E402
from cute_scene import toy_mesh  # noqa: E402
from story_scene import look_at  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "directions" / "turn"
FRAMES = 48
SIZE = 1800  # sharp at twice the size the page shows it in the packages scene

scene = bpy.context.scene
for o in list(scene.objects):
    bpy.data.objects.remove(o)
tooth = bpy.data.objects.new("tooth", toy_mesh())
scene.collection.objects.link(tooth)
floor_mesh = bpy.data.meshes.new("floor")
floor_mesh.from_pydata([(-20, -20, 0), (20, -20, 0), (20, 20, 0), (-20, 20, 0)], [], [(0, 1, 2, 3)])
floor = bpy.data.objects.new("floor", floor_mesh)
floor.is_shadow_catcher = True
scene.collection.objects.link(floor)

TEST = "--" in sys.argv and "test" in sys.argv[sys.argv.index("--") + 1:]
SUN = (24, 0, -160)
scene_kit.look(scene, sky="#f3f6f6", light="#d8e6ee", light_strength=0.6, sun_energy=3.2, sun_angle=0.7, sun_rot=SUN)
scene.view_settings.exposure = -0.2
scene.render.engine = "CYCLES"
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.use_persistent_data = True
scene.render.film_transparent = True
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"

cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
cam.data.lens = 70
scene.collection.objects.link(cam)
scene.camera = cam
# straight in front, a little above: the tooth faces the visitor, and the turn shows its back
eye = Vector((0, -7.2, 1.8))
cam.location = eye
cam.rotation_euler = look_at(eye, Vector((0, 0, 0.62)), Vector((0, 0, 1)))

if TEST:
    scene.render.resolution_x = scene.render.resolution_y = 700
    sun = bpy.data.objects["sun"]
    for n, rot in enumerate([(12, 0, -150), (24, 0, -160), (30, 0, 160), (35, 0, -130)]):
        sun.rotation_euler = tuple(math.radians(v) for v in rot)
        scene.render.filepath = str(ROOT / "design" / "hero" / f"turn-test-{n}.png")
        bpy.ops.render.render(write_still=True)
    sys.exit(0)

OUT.mkdir(parents=True, exist_ok=True)
tmp = OUT / "_raw"
tmp.mkdir(exist_ok=True)
for i in range(FRAMES):
    # an even turn: the page does the easing
    tooth.rotation_euler = (0, 0, math.pi * i / (FRAMES - 1))
    scene.render.filepath = str(tmp / f"r{i:02d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"frame {i + 1}/{FRAMES}")

# one crop box for all frames, read one frame at a time to keep memory down
def load(i):
    img = bpy.data.images.load(str(tmp / f"r{i:02d}.png"))
    px = np.empty(SIZE * SIZE * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(SIZE, SIZE, 4)
    bpy.data.images.remove(img)
    return px


alpha = np.zeros((SIZE, SIZE), dtype=np.float32)
for i in range(FRAMES):
    alpha = np.maximum(alpha, load(i)[..., 3])
ys, xs = np.where(alpha > 0.03)
pad = SIZE // 60
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, SIZE)
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, SIZE)
w, h = x1 - x0, y1 - y0
for i in range(FRAMES):
    f = load(i)
    if i == 0:
        first = f[y0:y1, x0:x1].copy()
    out = bpy.data.images.new(f"t{i:02d}", w, h, alpha=True)
    out.pixels.foreach_set(np.ascontiguousarray(f[y0:y1, x0:x1]).ravel())
    out.filepath_raw = str(OUT / f"t{i:02d}.webp")
    out.file_format = "WEBP"
    out.save(quality=86)
    bpy.data.images.remove(out)

# where the body stands in frame 0: Blender's rows run bottom-up, so flip y for the page
body = first[..., 3] > 0.8
bys, bxs = np.where(body)
print(f"crop {w}x{h}; body centre x {bxs.mean() / w:.4f}; feet y {1 - bys.min() / h:.4f}; "
      f"body top y {1 - bys.max() / h:.4f}; body width {(bxs.max() - bxs.min()) / w:.4f}")
for p in tmp.iterdir():
    p.unlink()
tmp.rmdir()
