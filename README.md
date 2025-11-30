# BlenderLink

BlenderLink is a tool that allows you to export camera motion from **Adobe After Effects** to Blender. It not only exports position and rotation, but also preseres composition settings, such as width, height, frame rate, focal length, and so on.
The project contains .JSX file, that is the script for After Effects, and the Blender add-on.
# Usage Guide
## AE Script
The **script** contains 4 main panels, which one serves important functionality.
### Frame Range panel
This panel defines the frame range that will be captured. You can set it manually (frame numeration starts from zero), or use the following buttons:
**Set From** – Sets the start frame to the one where your playhead is.
**Set To** – Sets the end frame to the one where your playhead is.
**Whole Layer** – Sets start and end frame to boundaries of the selected layer.
### Export Settings
This panel manages the path where exported data will be saved. The data **a one .json file**, all new saved content will just be **appended** to it.
You can choose the export path manually or use the saved project file directory.
### Camera Details
After Effects scripts for some reason can't access the focal length value of the camera, so you should manually fill in this field. If you didn't touch the default settings, this value is 36 (set in script by default).
### Sorting
This feature is needed in order to correctly display your render from Blender. In After Effects, the video clip will only be overlayed by these 3D layers which are above it in the timeline. This means that all layers should be sorted by distance from the camera, so you can place the render clip between layers and be sure that everything will be displayed correctly.
**Reverse order** checkbox means that the closest layer is the top one (this is what you wanna get for the effect above)
## Blender add-on
ima too lazy for this one bye
maybe later
