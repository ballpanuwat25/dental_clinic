"""Toy molars, the queue-to-booking story. "From waiting in line to booking a time."

Scroll path (frames 1-240):
  1-30    hold A  a long switchback queue of toy molars; the last in line stands close to the camera
  30-110  move    the camera rises while the teeth hop, front of the line first, into a timetable on the floor:
                  three rows (one per dentist), twenty half-hour columns from 10:00 to 20:00
  110-150 hold B  the day's timetable from above; the gaps are the times still free; the last tooth waits alone
  150-200 move    the camera swoops down to one gap (15:00 with Dr Prae) as the last tooth hops over into it
  200-240 hold C  the tooth in its slot between the others, with a small happy hop

The booked slots are the same as the sketch sites' data (design/directions/shared.js).
Run: D:/blender.exe -b --factory-startup -P scripts/blender/story_scene.py
Writes design/3d/story.blend. Render with render_sequence.py.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

sys.path.append(str(Path(__file__).parent))
import scene_kit  # noqa: E402
from blockout import FRAMES, HOLDS, smooth  # noqa: E402
from cute_scene import toy_mesh  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "design" / "3d" / "story.blend"

COL = 1.45  # half an hour along x
ROW = 1.9  # one dentist's row along y
LANE = 2.3  # between the queue's lanes
BOOKED = {  # minutes past midnight, as in shared.js
    0: [(600, 690), (720, 780), (840, 900), (960, 1050), (1110, 1170)],  # Dr Prae, the front row
    1: [(630, 750), (780, 870), (930, 990), (1020, 1140)],  # Dr Ton
    2: [(600, 660), (690, 810), (870, 960), (1050, 1110), (1140, 1200)],  # Dr Nid, the back row
}
TARGET = (0, 10)  # Dr Prae at 15:00


def slot(row, col):
    return Vector(((col - 9.5) * COL, (row - 1) * ROW, 0))


def queue_spot(k):
    """The k-th place in a four-lane switchback queue in front of the timetable; 0 is the front."""
    lane, i = divmod(k, 10)
    forward = 1 if lane % 2 else -1
    x = (-6.5 + i * 1.45) if forward > 0 else (6.5 - i * 1.45)
    return Vector((x, -5.4 - lane * LANE, 0)), (90 if forward > 0 else -90)


def hop(p0, p1, t, height):
    t = max(0.0, min(1.0, t))
    e = smooth(t)
    p = p0.lerp(p1, e)
    p.z += 4 * height * t * (1 - t)
    return p


def squash(t_since_land):
    """A quick squash on landing: 1 in the air, flat for a moment, then back."""
    if t_since_land < 0 or t_since_land > 8:
        return 1.0
    return 1 - 0.14 * math.sin(t_since_land / 8 * math.pi)


def look_at(eye, target, up):
    fwd = (target - eye).normalized()
    z = -fwd
    x = up.cross(z).normalized()
    y = z.cross(x)
    return Matrix((x, y, z)).transposed().to_euler()


def keyed(frame, keys):
    """Per-hold values, held in each hold and eased between; works for numbers and vectors."""
    (_, a1), (b0, b1), (c0, _) = HOLDS
    A, B, C = keys
    if frame <= a1:
        return A
    if frame < b0:
        k = smooth((frame - a1) / (b0 - a1))
        return A.lerp(B, k) if isinstance(A, Vector) else A + (B - A) * k
    if frame <= b1:
        return B
    if frame < c0:
        k = smooth((frame - b1) / (c0 - b1))
        return B.lerp(C, k) if isinstance(B, Vector) else B + (C - B) * k
    return C


def build():
    scene = bpy.context.scene
    for o in list(scene.objects):
        bpy.data.objects.remove(o)
    mesh = toy_mesh()

    floor_mesh = bpy.data.meshes.new("floor")
    floor_mesh.from_pydata([(-90, -90, 0), (90, -90, 0), (90, 90, 0), (-90, 90, 0)], [], [(0, 1, 2, 3)])
    floor_mesh.materials.append(scene_kit.material("floor", "#6db6e8", 0.85))
    scene.collection.objects.link(bpy.data.objects.new("floor", floor_mesh))

    # the hours, painted flat on the floor in front of the timetable
    paint = scene_kit.material("paint", "#f6fafc", 0.7)
    for h in range(10, 21):
        curve = bpy.data.curves.new(f"h{h}", "FONT")
        curve.body = f"{h}:00"
        curve.size = 0.42
        curve.align_x = "CENTER"
        curve.materials.append(paint)
        t = bpy.data.objects.new(f"h{h}", curve)
        t.location = ((h - 10) * 2 * COL - 9.5 * COL - COL / 2, -ROW - 1.25, 0.002)
        scene.collection.objects.link(t)

    # rope barriers between the lanes, open at the end where the line turns
    post_mat = scene_kit.material("post", "#2f7fb1", 0.35)
    rope_mat = scene_kit.material("rope", "#2f7fb1", 0.6)
    for gap in range(3):
        y = -5.4 - (gap + 0.5) * LANE
        xs = [-5.0 + 3.0 * i for i in range(5)] if gap % 2 == 0 else [5.0 - 3.0 * i for i in range(5)]
        tops = []
        for x in xs:
            bm = bmesh.new()
            bmesh.ops.create_cone(bm, cap_ends=True, segments=20, radius1=0.06, radius2=0.06, depth=0.9,
                                  matrix=Matrix.Translation((0, 0, 0.45)))
            bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.2, radius2=0.2, depth=0.05,
                                  matrix=Matrix.Translation((0, 0, 0.025)))
            bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.09, matrix=Matrix.Translation((0, 0, 0.92)))
            m = bpy.data.meshes.new("post")
            bm.to_mesh(m)
            bm.free()
            m.shade_smooth()
            m.materials.append(post_mat)
            o = bpy.data.objects.new("post", m)
            o.location = (x, y, 0)
            scene.collection.objects.link(o)
            tops.append(Vector((x, y, 0.86)))
        curve = bpy.data.curves.new("rope", "CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 0.035
        curve.materials.append(rope_mat)
        line = curve.splines.new("POLY")
        pts = []
        for a, b in zip(tops, tops[1:]):
            for i in range(12):
                t = i / 12
                p = a.lerp(b, t)
                p.z -= 0.28 * math.sin(t * math.pi)
                pts.append(p)
        pts.append(tops[-1])
        line.points.add(len(pts) - 1)
        for pt, p in zip(line.points, pts):
            pt.co = (*p, 1)
        scene.collection.objects.link(bpy.data.objects.new("rope", curve))

    slots = sorted(((c, r) for r, spans in BOOKED.items() for a, b in spans for c in range((a - 600) // 30, (b - 600) // 30)))
    teeth = []
    for k, (c, r) in enumerate(slots):
        o = bpy.data.objects.new(f"toy_{r}_{c}", mesh)
        scene.collection.objects.link(o)
        start = 38 + k * 1.5
        teeth.append((o, queue_spot(k), slot(r, c), start))
    hero = bpy.data.objects.new("hero", mesh)
    scene.collection.objects.link(hero)
    home, home_rot = queue_spot(len(slots))
    goal = slot(*TARGET)

    for f in range(1, FRAMES + 1):
        for o, (spot, rot), dest, start in teeth:
            t = (f - start) / 16
            o.location = hop(spot, dest, t, 2.4)
            o.rotation_euler = (0, 0, math.radians(rot * (1 - smooth(t))))
            s = squash(f - start - 16)
            o.scale = (1 / math.sqrt(s), 1 / math.sqrt(s), s)
            o.keyframe_insert("location", frame=f)
            o.keyframe_insert("rotation_euler", frame=f)
            o.keyframe_insert("scale", frame=f)
        # the last in line: three hops over to the free slot, then a little one for joy
        legs = [(152, 166, home, home.lerp(goal, 0.33), 1.0),
                (168, 182, home.lerp(goal, 0.33), home.lerp(goal, 0.66), 1.0),
                (184, 200, home.lerp(goal, 0.66), goal, 2.0),
                (216, 228, goal, goal, 0.35)]
        pos, land = home, None
        for a, b, p0, p1, h in legs:
            if f >= a:
                pos = hop(p0, p1, (f - a) / (b - a), h)
                land = b
        hero.location = pos
        hero.rotation_euler = (0, 0, math.radians(home_rot * (1 - smooth((f - 152) / 48))))
        s = squash(f - land) if land else 1.0
        hero.scale = (1 / math.sqrt(s), 1 / math.sqrt(s), s)
        hero.keyframe_insert("location", frame=f)
        hero.keyframe_insert("rotation_euler", frame=f)
        hero.keyframe_insert("scale", frame=f)

    # each crop: (eye, target, up, lens, f-stop, frame shift) per hold
    up = Vector((0, 0, 1))
    paths = {
        "cam_wide": dict(
            eye=(home + Vector((3.6, -7.4, 5.2)), Vector((0, -24, 21)), goal + Vector((3.0, -6.0, 3.4))),
            target=(home + Vector((-3.5, 4.0, 0.0)), Vector((0, -5.0, 0)), goal + Vector((-0.8, 0.6, 0.5))),
            up=(up, up, up), lens=(45, 33, 50), fstop=(4.0, 16, 4.5), shift=("shift_x", (-0.18, 0.0, -0.18))),
        "cam_tall": dict(
            eye=(home + Vector((2.2, -7.0, 5.0)), Vector((-1.5, -15, 25)), goal + Vector((1.6, -6.6, 3.6))),
            target=(home + Vector((-2.6, 3.6, 0.0)), Vector((0, -5.5, 0)), goal + Vector((-0.4, 0.5, 0.5))),
            up=(up, Vector((1, 0, 0.4)).normalized(), up), lens=(42, 30, 45), fstop=(2.8, 16, 4.5),
            shift=("shift_y", (-0.12, 0.0, -0.12))),
    }
    for name, p in paths.items():
        cam_data = bpy.data.cameras.new(name)
        cam_data.dof.use_dof = True
        cam_data.dof.focus_object = hero
        cam = bpy.data.objects.new(name, cam_data)
        scene.collection.objects.link(cam)
        prop, shifts = p["shift"]
        for f in range(1, FRAMES + 1):
            eye, target = keyed(f, p["eye"]), keyed(f, p["target"])
            cam.location = eye
            cam.rotation_euler = look_at(eye, target, keyed(f, p["up"]).normalized())
            cam.keyframe_insert("location", frame=f)
            cam.keyframe_insert("rotation_euler", frame=f)
            cam_data.lens = keyed(f, p["lens"])
            cam_data.keyframe_insert("lens", frame=f)
            cam_data.dof.aperture_fstop = keyed(f, p["fstop"])
            cam_data.dof.keyframe_insert("aperture_fstop", frame=f)
            setattr(cam_data, prop, keyed(f, shifts))
            cam_data.keyframe_insert(prop, frame=f)

    scene.frame_start, scene.frame_end = 1, FRAMES
    scene.render.fps = 24
    scene_kit.look(scene, sky="#a6cfe3", light="#d6eaf7", light_strength=0.3, sun_energy=3.0, sun_angle=0.22,
                   sun_rot=(48, 0, -75))
    # Cycles, tuned for speed: headless EEVEE drew no cast shadows, and the shadows are what stand the teeth up
    scene.render.engine = "CYCLES"
    c = scene.cycles
    c.samples = 10
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.max_bounces, c.diffuse_bounces, c.glossy_bounces, c.transmission_bounces = 4, 2, 1, 0
    c.caustics_reflective = c.caustics_refractive = False
    scene.render.use_persistent_data = True
    scene.camera = bpy.data.objects["cam_wide"]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT))
    print("saved", OUT)


if __name__ == "__main__":
    build()
