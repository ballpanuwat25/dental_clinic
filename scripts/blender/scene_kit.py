"""Shared pieces of the hero scene: the molar's layers as Blender objects, the clouds, and the look."""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

import tooth


def hex_rgba(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)


def material(name, color, roughness, coat=0.0, sss=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgba(color)
    b.inputs["Roughness"].default_value = roughness
    b.inputs["Coat Weight"].default_value = coat
    b.inputs["Subsurface Weight"].default_value = sss
    b.inputs["Subsurface Radius"].default_value = (0.08, 0.06, 0.04)
    return mat


LOOK = {
    "enamel": ("#f5f6f1", 0.22, 0.4, 0.25),
    "dentin": ("#ecdcbc", 0.45, 0.0, 0.15),
    "pulp": ("#d65a6a", 0.5, 0.0, 0.0),
}


def tooth_objects():
    out = {}
    for name, (verts, quads) in tooth.layers().items():
        mesh = bpy.data.meshes.new(name)
        mesh.from_pydata(verts.tolist(), [], quads.tolist())
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bm.to_mesh(mesh)
        bm.free()
        mesh.shade_smooth()
        obj = bpy.data.objects.new(name, mesh)
        bpy.context.scene.collection.objects.link(obj)
        # surface nets leave faint terracing; a light smooth irons it out without losing the grooves
        sm = obj.modifiers.new("iron", "CORRECTIVE_SMOOTH")
        sm.iterations = 6
        sm.use_only_smooth = True
        mesh.materials.append(material(name, *LOOK[name]))
        out[name] = obj
    return out


def blob(name, spheres, color, voxel=0.08):
    """Spheres melted into one smooth mesh: the clouds."""
    mesh = bpy.data.meshes.new(name)
    bm = bmesh.new()
    for c, r in spheres:
        m = Matrix.Translation(Vector(c)) @ Matrix.Diagonal((r, r, r, 1.0))
        bmesh.ops.create_uvsphere(bm, u_segments=24, v_segments=16, radius=1.0, matrix=m)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    rm = obj.modifiers.new("melt", "REMESH")
    rm.mode = "VOXEL"
    rm.voxel_size = voxel
    rm.use_smooth_shade = True
    mesh.materials.append(material(name, color, 0.9))
    return obj


def look(scene, sky="#dcedf7", light="#bcd9ee", light_strength=0.55, sun_energy=3.0, sun_angle=0.35, sun_rot=(50, 0, -30)):
    """Quick EEVEE on a pale sky: the camera sees the sky at full brightness, the light it throws is dimmer."""
    scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 24
    scene.view_settings.view_transform = "Standard"
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))
    sun.data.energy = sun_energy
    sun.data.color = hex_rgba("#fff3e2")[:3]
    sun.data.angle = sun_angle
    sun.rotation_euler = tuple(math.radians(v) for v in sun_rot)
    scene.collection.objects.link(sun)
    if scene.world is None:
        scene.world = bpy.data.worlds.new("sky")
    scene.world.use_nodes = True
    nt = scene.world.node_tree
    seen = nt.nodes["Background"]
    seen.inputs["Color"].default_value = hex_rgba(sky)
    lit = nt.nodes.new("ShaderNodeBackground")
    lit.inputs["Color"].default_value = hex_rgba(light)
    lit.inputs["Strength"].default_value = light_strength
    ray = nt.nodes.new("ShaderNodeLightPath")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(ray.outputs["Is Camera Ray"], mix.inputs["Fac"])
    nt.links.new(lit.outputs["Background"], mix.inputs[1])
    nt.links.new(seen.outputs["Background"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], nt.nodes["World Output"].inputs["Surface"])
