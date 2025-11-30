import bpy
from bpy.types import PropertyGroup
from bpy.props import StringProperty, CollectionProperty, IntProperty, BoolProperty, FloatProperty, FloatVectorProperty

class BL_JSON_Item(PropertyGroup):
    name: StringProperty(name="Name")
    type: StringProperty(name="Type")
    id: StringProperty(name="ID")

def register():
    bpy.utils.register_class(BL_JSON_Item)
    
    bpy.types.Scene.bl_json_file_path = StringProperty(
        name="JSON File",
        description="Path to JSON file exported from After Effects",
        subtype='FILE_PATH',
        default=""
    )
    
    bpy.types.Scene.bl_json_items = CollectionProperty(type=BL_JSON_Item)
    bpy.types.Scene.bl_active_json_index = IntProperty(default=0)
    
    # Camera-specific import options
    bpy.types.Scene.bl_camera_create_new_scene = BoolProperty(
        name="Create New Scene",
        description="Create a new scene for imported camera",
        default=True
    )
    
    bpy.types.Scene.bl_camera_enable_motion_blur = BoolProperty(
        name="Motion Blur",
        description="Enable motion blur in render settings",
        default=True
    )
    
    bpy.types.Scene.bl_camera_start_position = FloatVectorProperty(
        name="Start Position",
        description="Position to use as the starting point (origin) for camera movement",
        subtype='TRANSLATION',
        size=3,
        default=(0.0, 0.0, 0.0)
    )
    
    # Replaced IntProperty slider with a simple BoolProperty
    bpy.types.Scene.bl_camera_reduce_motion = BoolProperty(
        name="Reduce Motion",
        description="Lock camera position to the 'Start Position' (uses max reduction factor)",
        default=True
    )
    
    bpy.types.Scene.bl_camera_apply_comp_settings = BoolProperty(
        name="Apply Composition Settings",
        description="Apply composition width, height, FPS, and frame range",
        default=True
    )

    bpy.types.Scene.bl_camera_transparent_bg = BoolProperty(
        name="Transparent Background",
        description="Enable transparent background rendering (film_transparent)",
        default=True
    )

    # New property for the render output preset
    bpy.types.Scene.bl_camera_set_qt_preset = BoolProperty(
        name="Set QuickTime Transparent Preset",
        description="Set render output to FFmpeg > QuickTime > Animation (RGBA)",
        default=True
    )


def unregister():
    bpy.utils.unregister_class(BL_JSON_Item)
    
    del bpy.types.Scene.bl_json_file_path
    del bpy.types.Scene.bl_json_items
    del bpy.types.Scene.bl_active_json_index
    del bpy.types.Scene.bl_camera_create_new_scene
    del bpy.types.Scene.bl_camera_enable_motion_blur
    del bpy.types.Scene.bl_camera_start_position
    
    del bpy.types.Scene.bl_camera_reduce_motion
    del bpy.types.Scene.bl_camera_apply_comp_settings
    del bpy.types.Scene.bl_camera_transparent_bg
    del bpy.types.Scene.bl_camera_set_qt_preset