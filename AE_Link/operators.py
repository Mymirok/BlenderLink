import bpy
import json
import os
from math import radians, exp
from bpy.props import StringProperty, BoolProperty, FloatProperty, FloatVectorProperty, IntProperty
from bpy.types import Operator
from bpy_extras.io_utils import ImportHelper

class BL_OT_select_json_file(Operator, ImportHelper):
    """Select a JSON file for import"""
    bl_idname = "bl.select_json_file"
    bl_label = "Select JSON File"
    bl_options = {'REGISTER', 'UNDO'}
    
    filter_glob: StringProperty(
        default='*.json',
        options={'HIDDEN'}
    )
    
    def execute(self, context):
        context.scene.bl_json_file_path = self.filepath
        self.refresh_json_items(context)
        return {'FINISHED'}
    
    def refresh_json_items(self, context):
        """Load JSON items from file"""
        filepath = context.scene.bl_json_file_path
        
        if not os.path.isfile(filepath):
            self.report({'WARNING'}, "File does not exist")
            return
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
        except Exception as e:
            self.report({'ERROR'}, f"Error reading JSON file: {str(e)}")
            return
        
        # Clear existing items
        context.scene.bl_json_items.clear()
        
        # Add items from JSON
        for item_id, item_data in data.items():
            item = context.scene.bl_json_items.add()
            item.name = item_data.get('layer_name', 'Unnamed')
            item.type = item_data.get('type', 'unknown')
            item.id = item_id
        
        self.report({'INFO'}, f"Loaded {len(context.scene.bl_json_items)} items from JSON")

class BL_OT_refresh_json_items(Operator):
    """Refresh JSON items list"""
    bl_idname = "bl.refresh_json_items"
    bl_label = "Sync"
    bl_options = {'REGISTER', 'UNDO'}
    
    def execute(self, context):
        if not context.scene.bl_json_file_path:
            self.report({'WARNING'}, "No JSON file selected")
            return {'CANCELLED'}
        
        BL_OT_select_json_file.refresh_json_items(self, context)
        self.report({'INFO'}, "Item list refreshed")
        return {'FINISHED'}

class BL_OT_import_item(Operator):
    """Import selected item from JSON"""
    bl_idname = "bl.import_item"
    bl_label = "Import Item"
    bl_options = {'REGISTER', 'UNDO'}
    
    @classmethod
    def poll(cls, context):
        return (context.scene.bl_json_file_path and 
                len(context.scene.bl_json_items) > 0 and
                0 <= context.scene.bl_active_json_index < len(context.scene.bl_json_items))
    
    def execute(self, context):
        filepath = context.scene.bl_json_file_path
        active_index = context.scene.bl_active_json_index
        
        if not os.path.isfile(filepath):
            self.report({'ERROR'}, "JSON file does not exist")
            return {'CANCELLED'}
        
        try:
            with open(filepath, 'r') as f:
                data = json.load(f)
        except Exception as e:
            self.report({'ERROR'}, f"Error reading JSON file: {str(e)}")
            return {'CANCELLED'}
        
        # Get the selected item
        item_id = context.scene.bl_json_items[active_index].id
        item_data = data.get(item_id)
        
        if not item_data:
            self.report({'ERROR'}, "Selected item not found in JSON")
            return {'CANCELLED'}
        
        # Handle different item types
        item_type = item_data.get('type', 'unknown')
        
        if item_type == 'camera':
            self.import_camera(context, item_data)
        else:
            self.report({'WARNING'}, f"Unsupported item type: {item_type}")
        
        return {'FINISHED'}
    
    def import_camera(self, context, camera_data):
        """Import camera data from JSON"""
        # --- MODIFIED ---
        # Read new/changed properties from scene
        create_new_scene = context.scene.bl_camera_create_new_scene
        apply_comp_settings = context.scene.bl_camera_apply_comp_settings
        enable_motion_blur = context.scene.bl_camera_enable_motion_blur
        transparent_bg = context.scene.bl_camera_transparent_bg
        start_position = context.scene.bl_camera_start_position
        reduce_motion = context.scene.bl_camera_reduce_motion # New boolean
        set_qt_preset = context.scene.bl_camera_set_qt_preset # New boolean
        # --- END MODIFIED ---
        
        if create_new_scene:
            # Create a new scene
            scene = bpy.data.scenes.new(name=camera_data['layer_name'])
            # Make the new scene persistent (not temporary)
            context.window.scene = scene
        else:
            scene = context.scene
        
        # Apply composition settings if enabled
        comp_details = camera_data.get('comp_details', {})
        if apply_comp_settings:
            scene.render.fps = comp_details.get('fps', 24)
            scene.render.resolution_x = comp_details.get('width', 1920)
            scene.render.resolution_y = comp_details.get('height', 1080)
            scene.render.resolution_percentage = 100
        
        # Enable motion blur if requested
        if enable_motion_blur:
            scene.render.use_motion_blur = True

            # Set motion blur properties if available
            if 'shutter_angle' in comp_details:
                scene.render.motion_blur_shutter = comp_details['shutter_angle'] / 360
        
        # Enable transparent background if requested
        if transparent_bg:
            scene.render.film_transparent = True
            
        # --- ADDED ---
        # Apply QuickTime transparent render preset if requested
        if set_qt_preset:
            scene.render.image_settings.file_format = 'FFMPEG'
            scene.render.ffmpeg.format = 'QUICKTIME'
            scene.render.ffmpeg.codec = 'QTRLE' # QuickTime Animation
            scene.render.image_settings.color_mode = 'RGBA'
            scene.render.film_transparent = True # Also force this
        # --- END ADDED ---
        
        # Create camera
        camera = bpy.data.cameras.new(name=camera_data['layer_name'])
        camera_obj = bpy.data.objects.new(camera_data['layer_name'], camera)
        scene.collection.objects.link(camera_obj)
        
        # Set camera as active
        scene.camera = camera_obj
        
        # Set camera properties
        camera_data_details = camera_data.get('camera_data', {})
        if 'focal_length' in camera_data_details:
            camera.lens = float(camera_data_details['focal_length'])
        
        if 'sensor_size' in camera_data_details:
            camera.sensor_width = float(camera_data_details['sensor_size'])
        
        # Import animation data
        transform_data = camera_data.get('transform_data', {})
        frames = transform_data.get('frames', [])
        
        if frames:
            # Adjust frame numbers for Blender convention (starting at 1 instead of 0)
            ae_start_frame = transform_data.get('start_frame', 0)
            ae_end_frame = transform_data.get('end_frame', len(frames) - 1)
            
            # Set scene frame range if composition settings are enabled
            if apply_comp_settings:
                scene.frame_start = 1
                scene.frame_end = ae_end_frame - ae_start_frame + 1
            
            # --- MODIFIED (Bug/UX Fix) ---
            # Calculate offset to make first position equal to the user's 'start_position'
            first_frame_data = frames[0]
            first_pos = first_frame_data['position']
            
            # The offset is (TargetBlenderPos - FirstFrameAECoordsInBlenderSpace)
            position_offset = (
                start_position[0] - first_pos['x'],  # Offset X
                start_position[1] - first_pos['z'],  # Offset Y (from AE Z)
                start_position[2] + first_pos['y']   # Offset Z (from AE Y)
            )
            # --- END MODIFIED ---
            
            # Set keyframes for position and rotation
            for frame_data in frames:
                # Adjust frame number for Blender convention (frame + 1)
                ae_frame = frame_data['frame']
                blender_frame = ae_frame - ae_start_frame + 1
                
                # Position conversion from AE to Blender coordinate system:
                # AE: X, Y, Z (Z is depth)
                # Blender: X, Z, -Y (Y is up)
                # Apply offset to make first position the user-defined 'start_position'
                pos = frame_data['position']
                camera_obj.location = (
                    pos['x'] + position_offset[0],  # X axis with offset
                    pos['z'] + position_offset[1],  # Z in Blender = Y in AE with offset
                    -pos['y'] + position_offset[2]  # -Y in Blender = Z in AE with offset
                )
                camera_obj.keyframe_insert(data_path="location", frame=blender_frame)
                
                # Rotation conversion from AE to Blender coordinate system:
                # AE: X (pitch), Y (yaw), Z (roll)
                # Blender: X (pitch), Z (yaw), Y (roll) with sign adjustments
                # Add +90 degrees to X rotation to fix camera pointing at floor
                rot = frame_data['orientation']
                camera_obj.rotation_euler = (
                    radians(-rot['x'] + 90),  # Pitch (inverted) + 90 degrees offset
                    radians(rot['z']),        # Roll (swapped from Z)
                    radians(-rot['y'])        # Yaw (swapped from Y, inverted)
                )
                camera_obj.keyframe_insert(data_path="rotation_euler", frame=blender_frame)
            
            # --- MODIFIED ---
            # Apply motion reduction if the new checkbox is enabled
            if reduce_motion:
                # Hard-code the factor to 100 as requested
                self.apply_motion_reduction(camera_obj, 100, start_position)
            # --- END MODIFIED ---
        
        self.report({'INFO'}, f"Imported camera: {camera_data['layer_name']}")
    
    def apply_motion_reduction(self, camera_obj, reduce_motion_factor, start_position):
        """Apply motion reduction using constraints to an empty object"""
        # Create an empty object at the specified start position
        empty = bpy.data.objects.new(f"{camera_obj.name}_Parent", None)
        bpy.context.collection.objects.link(empty)
        empty.location = start_position
        
        # Calculate influence using exponential function
        # Map the factor from [1, 100] to influence [0, 1] with exponential curve
        normalized_factor = (reduce_motion_factor - 1) / 99.0  # Map to [0, 1]
        
        # Exponential function that gives most values in the 0.9-1.0 range
        # For factor=100, normalized_factor=1.0, influence = 1.0 - exp(-5.5) = ~0.9959
        influence = 1.0 - exp(-5.5 * normalized_factor)
        
        # Add copy location constraint to camera with the calculated influence
        loc_constraint = camera_obj.constraints.new(type='COPY_LOCATION')
        loc_constraint.target = empty
        loc_constraint.influence = influence
        
        # Add copy rotation constraint to camera with the same influence and ADD mix mode
        rot_constraint = camera_obj.constraints.new(type='COPY_ROTATION')
        rot_constraint.target = empty
        rot_constraint.influence = influence
        rot_constraint.mix_mode = 'ADD'  # Additive rotation mixing
        
        # Don't keyframe it - apply it once as requested

class BL_OT_delete_item(Operator):
    """Delete selected item from JSON file"""
    bl_idname = "bl.delete_item"
    bl_label = "Delete Item"
    bl_options = {'REGISTER', 'UNDO'}
    
    @classmethod
    def poll(cls, context):
        return (context.scene.bl_json_file_path and 
                len(context.scene.bl_json_items) > 0 and
                0 <= context.scene.bl_active_json_index < len(context.scene.bl_json_items))
    
    def execute(self, context):
        filepath = context.scene.bl_json_file_path
        active_index = context.scene.bl_active_json_index
        
        if not os.path.isfile(filepath):
            self.report({'ERROR'}, "JSON file does not exist")
            return {'CANCELLED'}
        
        try:
            # Read the current JSON data
            with open(filepath, 'r') as f:
                data = json.load(f)
        except Exception as e:
            self.report({'ERROR'}, f"Error reading JSON file: {str(e)}")
            return {'CANCELLED'}
        
        # Get the selected item ID to delete
        item_id = context.scene.bl_json_items[active_index].id
        
        # Remove the item from the data
        if item_id in data:
            del data[item_id]
            
            # Write the updated data back to the file
            try:
                with open(filepath, 'w') as f:
                    json.dump(data, f, indent=2)
            except Exception as e:
                self.report({'ERROR'}, f"Error writing JSON file: {str(e)}")
                return {'CANCELLED'}
            
            # Refresh the items list
            BL_OT_select_json_file.refresh_json_items(self, context)
            self.report({'INFO'}, f"Deleted item: {item_id}")
        else:
            self.report({'WARNING'}, "Item not found in JSON file")
        
        return {'FINISHED'}

def register():
    bpy.utils.register_class(BL_OT_select_json_file)
    bpy.utils.register_class(BL_OT_refresh_json_items)
    bpy.utils.register_class(BL_OT_import_item)
    bpy.utils.register_class(BL_OT_delete_item)

def unregister():
    bpy.utils.unregister_class(BL_OT_delete_item)
    bpy.utils.unregister_class(BL_OT_import_item)
    bpy.utils.unregister_class(BL_OT_refresh_json_items)
    bpy.utils.unregister_class(BL_OT_select_json_file)