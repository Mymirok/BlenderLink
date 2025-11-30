import bpy
from bpy.types import Panel, UIList

class BL_UL_json_items(UIList):
    """Display JSON items in a list"""
    def draw_item(self, context, layout, data, item, icon, active_data, active_propname):
        # Set icon based on item type
        icon = 'OUTLINER_OB_CAMERA' if item.type == 'camera' else 'QUESTION'
        
        layout.label(text=item.name, icon=icon)
        layout.label(text=item.type, icon='BLANK1')

class BL_PT_main_panel(Panel):
    bl_label = "AE Link"
    bl_idname = "AE_LINK_PT_MAIN_PANEL"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "AE Link"

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        
        # File selection
        box = layout.box()
        row = box.row()
        row.operator("bl.select_json_file", icon='FILE')
        
        if scene.bl_json_file_path:
            # Display file path
            box.label(text=f"File: {scene.bl_json_file_path}", icon='FILE')
            
            # Sync button
            row = box.row()
            row.operator("bl.refresh_json_items", icon='FILE_REFRESH')
            
            # Items list
            if scene.bl_json_items:
                layout.separator()
                layout.label(text="Items:")
                layout.template_list(
                    "BL_UL_json_items", "",
                    scene, "bl_json_items",
                    scene, "bl_active_json_index",
                    rows=4
                )
                
                # --- MODIFIED (UX Improvement) ---
                # Moved Import/Delete buttons to be directly under the list
                row = layout.row()
                row.operator("bl.import_item", icon='IMPORT', text="Import Selected")
                
                # Add delete button
                row.operator("bl.delete_item", icon='TRASH', text="Delete")
                # --- END MODIFIED ---
                
                # Show import options only if an item is selected
                if 0 <= scene.bl_active_json_index < len(scene.bl_json_items):
                    selected_item = scene.bl_json_items[scene.bl_active_json_index]
                    
                    # Import options header
                    layout.separator()
                    layout.label(text="Import Options:", icon='SETTINGS')
                    
                    # Show options based on item type
                    if selected_item.type == 'camera':
                        self.draw_camera_options(layout, scene)
                    
                    # --- REMOVED ---
                    # The import button was moved up
                    # --- END REMOVED ---
            else:
                layout.label(text="No items found in JSON file", icon='ERROR')
    
    def draw_camera_options(self, layout, scene):
        """Draw camera-specific import options"""
        box = layout.box()
        
        # Composition settings
        box.prop(scene, "bl_camera_apply_comp_settings")
        
        # Render settings
        box.prop(scene, "bl_camera_transparent_bg")
        # --- ADDED ---
        box.prop(scene, "bl_camera_set_qt_preset")
        # --- END ADDED ---
        
        box.prop(scene, "bl_camera_enable_motion_blur")
        
        # Camera placement
        box.prop(scene, "bl_camera_start_position")
        
        # Motion smoothing
        # --- MODIFIED ---
        # Replaced slider with new checkbox
        box.prop(scene, "bl_camera_reduce_motion")
        # --- END MODIFIED ---
        
        # Scene creation
        box.prop(scene, "bl_camera_create_new_scene")
        
        # --- REMOVED (UX Improvement) ---
        # Delete button was moved up
        # --- END REMOVED ---

def register():
    bpy.utils.register_class(BL_UL_json_items)
    bpy.utils.register_class(BL_PT_main_panel)

def unregister():
    bpy.utils.unregister_class(BL_PT_main_panel)
    bpy.utils.unregister_class(BL_UL_json_items)