"""Stage 1 blockout, toy version: one cute molar on a sky-blue floor, then a whole field of them.

Scroll path (frames 1-240):
  1-30    hold A  hero: one toy molar close up, right of the headline, the floor soft behind it
  30-110  move    the camera rises and pulls back while the other teeth pop up from the floor in a ripple
  110-150 hold B  the field from above: rows running across the frame, the top-left corner left empty for text
  150-200 move    the camera comes back down to the first tooth as it hops up off the floor
  200-240 hold C  that tooth floating above its shadow: "the next one is you"

Run: D:/blender.exe -b --factory-startup -P scripts/blender/cute_scene.py
Writes design/3d/cute.blend. Render with render_sequence.py (it takes the .blend as its file).
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy

sys.path.append(str(Path(__file__).parent))
import cute  # noqa: E402
import scene_kit  # noqa: E402
from blockout import FRAMES, at, smooth  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "3d" / "cute.blend"
GAP = 1.75


def toy_mesh():
    verts, quads = cute.mesh()
    mesh = bpy.data.meshes.new("toy")
    mesh.from_pydata(verts.tolist(), [], quads.tolist())
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for _ in range(4):
        bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    mesh.materials.append(scene_kit.material("toy", "#f8f6f1", 0.5, sss=0.15))
    return mesh


def pop(t):
    """0 to 1 with a little overshoot, for a tooth springing up out of the floor."""
    t = max(0.0, min(1.0, t))
    c = 1.9
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2


def build():
    scene = bpy.context.scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)

    mesh = toy_mesh()
    floor_mesh = bpy.data.meshes.new("floor")
    floor_mesh.from_pydata([(-80, -80, 0), (80, -80, 0), (80, 80, 0), (-80, 80, 0)], [], [(0, 1, 2, 3)])
    floor_mesh.materials.append(scene_kit.material("floor", "#6db6e8", 0.85))
    floor = bpy.data.objects.new("floor", floor_mesh)
    scene.collection.objects.link(floor)

    hero = bpy.data.objects.new("hero", mesh)
    scene.collection.objects.link(hero)
    # the field: a square grid, cut on a diagonal so one corner of the frame stays empty floor
    field = []
    for i in range(-7, 8):
        for j in range(-7, 8):
            if (i, j) == (0, 0) or j - i > 1:
                continue
            o = bpy.data.objects.new(f"toy_{i}_{j}", mesh)
            o.location = (i * GAP, j * GAP, 0)
            scene.collection.objects.link(o)
            field.append((o, math.hypot(i, j)))

    # each tooth springs up when the ripple from the first one reaches it
    for o, r in field:
        start = 34 + r * 7
        for f in (1, start, start + 6, start + 10, start + 14):
            k = pop((f - start) / 14) if f > start else 0.0
            o.scale = (max(k, 0.0001),) * 3
            o.keyframe_insert("scale", frame=int(f))
        # and sinks back down, nearest first, so the first tooth has the floor to itself again
        back = 152 + r * 2.5
        for f, k in ((back, 1.0), (back + 4, 1.06), (back + 12, 0.0001)):
            o.scale = (k,) * 3
            o.keyframe_insert("scale", frame=int(f))

    # the first tooth hops up and floats, bobbing a little
    for f in range(1, FRAMES + 1):
        lift = 0.0
        if f > 150:
            lift = 0.75 * smooth((f - 150) / 40) + (0.06 * math.sin((f - 190) / 24 * math.tau) if f > 190 else 0)
        hero.location = (0, 0, lift)
        hero.rotation_euler = (0, 0, math.radians(8 * smooth((f - 150) / 50)) if f > 150 else 0)
        hero.keyframe_insert("location", frame=f)
        hero.keyframe_insert("rotation_euler", frame=f)

    paths = {
        "cam_wide": dict(theta=(-38, -40, -24), phi=(20, 48, 18), d=(5.4, 21, 6.0), tz=(0.7, -1.0, 1.2),
                         fstop=(1.8, 6.0, 2.2), shift=("shift_x", (-0.16, 0.0, -0.16))),
        "cam_tall": dict(theta=(-38, -40, -24), phi=(22, 52, 20), d=(6.2, 26, 6.8), tz=(0.7, -1.0, 1.2),
                         fstop=(1.8, 6.0, 2.2), shift=("shift_y", (-0.14, 0.0, -0.12))),
    }
    for name, p in paths.items():
        cam_data = bpy.data.cameras.new(name)
        cam_data.lens = 50
        cam_data.dof.use_dof = True
        cam_data.dof.focus_object = hero
        cam = bpy.data.objects.new(name, cam_data)
        scene.collection.objects.link(cam)
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
            cam_data.dof.aperture_fstop = at(f, p["fstop"])
            cam_data.dof.keyframe_insert("aperture_fstop", frame=f)
            aim.location = (0, 0, tz)
            aim.keyframe_insert("location", frame=f)

    scene.frame_start, scene.frame_end = 1, FRAMES
    scene.render.fps = 24
    # soft light from the top left of the frame, long gentle shadows, the floor's own blue as the horizon
    scene_kit.look(scene, sky="#8cc6ec", light="#d6eaf7", light_strength=0.3, sun_energy=3.0, sun_angle=0.22,
                   sun_rot=(48, 0, -75))
    # Cycles: headless EEVEE drew no shadows, and the soft shadow each tooth throws is what makes it stand there
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 24
    scene.cycles.use_denoising = True
    scene.camera = bpy.data.objects["cam_wide"]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
    print("saved", OUT)


if __name__ == "__main__":
    build()
