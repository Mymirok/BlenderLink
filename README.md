# BlenderLink

BlenderLink is a tool that allows you to export camera motion from **Adobe After Effects** to Blender. It not only exports position and rotation, but also preseres composition settings, such as width, height, frame rate, focal length, and so on.
The project contains .JSX file, that is the script for After Effects, and the Blender add-on.
# Usage Guide

## AE Script
The script contains **4 main panels**, and every single one is important.

### Frame Range Panel
This panel defines the frame range that will be captured. You can set it manually (frame numeration starts from zero), or use the buttons:

**Set From** and **Set To** buttons are used to set the start/end frames of range to the frame where your playhead is at.

**Whole Layer** button sets the range to the bounds of the selected layer.

### Export Settings Panel
Here you can choose the saving path of the data. The data itself is a **a one .json file**, which contains baked motion frames and metadata. All new saved content is just **appended** to it.

> This is generally a good idea to keep the file in your project directory. This panel contains a button with such functionality.

### Camera Details Panel
AE scripts for some reason can't access the focal length parameter of camera, so you should manually fill in this field.

> If you didn't touch the default settings, this value is 36 *(this is the default value in the script)*.

### Sorting Panel
This feature is needed in order to correctly display your render from Blender.

In After Effects, a video clip can only be overlayed by 3D layers that are above it on the timeline. Place your rendered clip in the timeline where you want the overlay effect. This script will sort the other layers so the closest objects appear correctly in front.

**Reverse Order**: Check this box to make the closest layer the top layer in the timeline. (Use this for the standard overlay effect).

## Blender add-on

After installing an add-on, you must select the data file. After that, the list will appear, containing all the exported items. By clicking on an item you'll see its import options. Hover on each one to see the tooltip, and click on import button to apply all the options and import the item to Blender.
