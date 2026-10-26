"""Idea G, stills only: today's timetable as the hero, one mint tooth as the visitor, cloud shadows on the floor.

The teeth stand in their booked slots from the start; the mint tooth waits in front of the free 15:00 slot.
Clouds hang high above, out of shot, so only their soft shadows cross the floor.
Run: D:/blender.exe -b --factory-startup -P scripts/blender/g_scene.py
Writes design/3d/g.blend and design/3d/stills/g-<shot>-<crop>.jpg.
"""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

sys.path.append(str(Path(__file__).parent))
import scene_kit  # noqa: E402
from cute_scene import toy_mesh  # noqa: E402
from story_scene import BOOKED, COL, ROW, TARGET, look_at, slot  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]


def build():
    scene = bpy.context.scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    mesh = toy_mesh()
    mint = toy_mesh()
    mint.materials[0] = scene_kit.material("mint", "#a9e6d0", 0.5, sss=0.15)

    floor_mesh = bpy.data.meshes.new("floor")
    floor_mesh.from_pydata([(-90, -90, 0), (90, -90, 0), (90, 90, 0), (-90, 90, 0)], [], [(0, 1, 2, 3)])
    floor_mesh.materials.append(scene_kit.material("floor", "#6db6e8", 0.85))
    scene.collection.objects.link(bpy.data.objects.new("floor", floor_mesh))

    paint = scene_kit.material("paint", "#f6fafc", 0.7)
    for h in range(10, 21):
        curve = bpy.data.curves.new(f"h{h}", "FONT")
        curve.body = f"{h}:00"
        curve.size = 0.5
        curve.align_x = "CENTER"
        curve.materials.append(paint)
        t = bpy.data.objects.new(f"h{h}", curve)
        t.location = ((h - 10) * 2 * COL - 9.5 * COL - COL / 2, -ROW - 1.3, 0.002)
        scene.collection.objects.link(t)

    for r, spans in BOOKED.items():
        for a, b in spans:
            for c in range((a - 600) // 30, (b - 600) // 30):
                o = bpy.data.objects.new(f"toy_{r}_{c}", mesh)
                o.location = slot(r, c)
                scene.collection.objects.link(o)
    goal = slot(*TARGET)
    visitor = bpy.data.objects.new("visitor", mint)
    visitor.location = goal + Vector((0.3, -3.2, 0))
    visitor.rotation_euler = (0, 0, math.radians(-12))
    scene.collection.objects.link(visitor)

    # clouds high overhead: the camera never sees them, the floor gets their shadows
    for i, (x, y, s) in enumerate([(-14, -4, 3.6), (2, 6, 3.0), (14, -8, 3.4)]):
        puffs = [((x + dx * s, y + dy * s, 14 + dz), r * s) for dx, dy, dz, r in
                 [(0, 0, 0, 0.8), (0.9, 0.2, -0.2, 0.6), (-0.8, -0.1, -0.2, 0.55), (0.3, 0.6, 0.3, 0.5), (-0.4, -0.6, 0.1, 0.5)]]
        c = scene_kit.blob(f"cloud{i}", puffs, "#ffffff", voxel=0.25)
        c.visible_camera = False
        # half see-through, so the shadow is a soft dimming rather than a dark hole
        b = c.data.materials[0].node_tree.nodes["Principled BSDF"]
        b.inputs["Alpha"].default_value = 0.35

    scene_kit.look(scene, sky="#a6cfe3", light="#d6eaf7", light_strength=0.3, sun_energy=3.0, sun_angle=0.22,
                   sun_rot=(38, 0, -60))
    scene.render.engine = "CYCLES"
    c = scene.cycles
    c.samples = 12
    c.use_denoising = True
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces = 4, 2, 1, 0

    up = Vector((0, 0, 1))
    shots = {
        # the whole day from the front left, the board running off to the right, floor left clear for the headline
        "hero-wide": (Vector((-4, -17, 10)), Vector((4, -1.0, 0)), 30, (1600, 900), -0.16),
        "hero-tall": (Vector((0, -16, 16)), Vector((1, -2.5, 0)), 28, (900, 1600), 0.0),
        "slot-wide": (goal + Vector((3.0, -6.0, 3.4)), goal + Vector((-0.8, -0.8, 0.5)), 50, (1600, 900), -0.18),
        "slot-tall": (goal + Vector((1.6, -6.6, 3.6)), goal + Vector((-0.4, -0.8, 0.5)), 45, (900, 1600), 0.0),
    }
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    out = ROOT / "design" / "3d" / "stills"
    out.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / "design" / "3d" / "g.blend"))
    for name, (eye, target, lens, (w, h), shift) in shots.items():
        cam.location = eye
        cam.rotation_euler = look_at(eye, target, up)
        cam.data.lens = lens
        cam.data.shift_x = shift
        cam.data.dof.use_dof = name.startswith("slot")
        cam.data.dof.focus_object = visitor
        cam.data.dof.aperture_fstop = 4.5
        scene.render.resolution_x, scene.render.resolution_y = w, h
        scene.render.image_settings.file_format = "JPEG"
        scene.render.filepath = str(out / f"g-{name}.jpg")
        bpy.ops.render.render(write_still=True)
    print("rendered G stills")


if __name__ == "__main__":
    build()
