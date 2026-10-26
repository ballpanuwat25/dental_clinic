"""Renders the blockout's frame sequence for the scroll test page.

Run: D:/blender.exe -b design/3d/hero-blockout.blend -P scripts/blender/render_sequence.py -- wide 2
     (crop: wide or tall; step: render every nth frame; optional third arg: frames for stills, e.g. 15,130,220)
Writes design/3d/seq/<crop>/0001.jpg ...
"""
import sys
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
crop = args[0] if args else "wide"
step = int(args[1]) if len(args) > 1 else 2
only = [int(f) for f in args[2].split(",")] if len(args) > 2 else None

scene = bpy.context.scene
if scene.render.engine == "CYCLES":
    # use the graphics card when there is one
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA", "HIP", "ONEAPI"):
        try:
            prefs.compute_device_type = kind
        except TypeError:
            continue
        prefs.get_devices()
        gpus = [d for d in prefs.devices if d.type == kind]
        if gpus:
            for d in prefs.devices:
                d.use = d.type == kind
            scene.cycles.device = "GPU"
            print("cycles on", kind, [d.name for d in gpus])
            break
scene.camera = bpy.data.objects[f"cam_{crop}"]
r = scene.render
r.resolution_x, r.resolution_y = (1600, 900) if crop == "wide" else (900, 1600)
r.resolution_percentage = 100
r.image_settings.file_format = "JPEG"
r.image_settings.quality = 86

out = ROOT / "design" / "3d" / ("stills" if only else "seq") / crop
out.mkdir(parents=True, exist_ok=True)
frames = only if only else range(scene.frame_start, scene.frame_end + 1, step)
for n, f in enumerate(frames, 1):
    scene.frame_set(f)
    r.filepath = str(out / (f"f{f:03d}.jpg" if only else f"{n:04d}.jpg"))
    bpy.ops.render.render(write_still=True)
print("rendered", len(frames), "frames to", out)
