"use strict";

var nullHelperName = "##DATA_EXPORTER##";
var posExpression = [
  'cam = thisComp.layer("{name}")\n',
  "cam.toWorld([0,0,0])\n",
].join("\n");
var rotExpression = [
  'srcLayer = thisComp.layer("{name}");',
  "",
  "// Create vectors pointing forward and up in layer space",
  "localForward = [0, 0, 1];",
  "localUp = [0, 1, 0];",
  "",
  "// Transform vectors to world space",
  "worldForward = srcLayer.toWorldVec(localForward);",
  "worldUp = srcLayer.toWorldVec(localUp);",
  "",
  "// Calculate orientation angles",
  "// X rotation (pitch)",
  "xRad = Math.atan2(worldForward[1], Math.sqrt(worldForward[0]*worldForward[0] + worldForward[2]*worldForward[2]));",
  "",
  "// Y rotation (yaw)",
  "yRad = -Math.atan2(worldForward[0], worldForward[2]);",
  "",
  "// Z rotation (roll) - calculated from up vector",
  "// First, get right vector by crossing forward and up",
  "worldRight = cross(worldForward, worldUp);",
  "// Then get the corrected up vector",
  "worldUpCorrected = cross(worldRight, worldForward);",
  "zRad = Math.atan2(worldUpCorrected[0], worldUpCorrected[1]);",
  "",
  "// Cross product function for vectors",
  "function cross(a, b) {",
  "    return [",
  "        a[1]*b[2] - a[2]*b[1],",
  "        a[2]*b[0] - a[0]*b[2],",
  "        a[0]*b[1] - a[1]*b[0]",
  "    ];",
  "}",
  "",
  "// Convert radians to degrees",
  "[-xRad, -yRad, -zRad] * 180/Math.PI;",
].join("\n");
var sclExpression = [
  'srcLayer = thisComp.layer("{name}");',
  "",
  "// Get world positions",
  "origin = srcLayer.toWorld([0,0,0]);",
  "xPoint = srcLayer.toWorld([1,0,0]);",
  "yPoint = srcLayer.toWorld([0,1,0]);",
  "",
  "// Calculate distances (actual world scale factors)",
  "xScale = length(xPoint - origin);",
  "yScale = length(yPoint - origin);",
  "",
  "// Convert to percentage",
  "[xScale * 100, yScale * 100]",
].join("\n");

function deleteHelperNull(comp) {
  try {
    for (var i = comp.layers.length; i >= 1; i--) {
      if (comp.layers[i].name === nullHelperName) {
        comp.layers[i].remove();
      }
    }
  } catch (error) {
    return;
  }
}

function createHelperNull(linkLayer) {
  var comp = linkLayer.containingComp;

  if (linkLayer.name === nullHelperName) {
    alert("Select another layer."); // Selecting temporary null is not allowed.
    deleteHelperNull(comp);
    return null;
  }

  deleteHelperNull(comp);

  // create a null
  nullHelper = comp.layers.addNull();
  nullHelper.name = nullHelperName;
  nullHelper.threeDLayer = true;

  // add controls
  var positionProperty = nullHelper
    .property("ADBE Transform Group")
    .property("ADBE Position");
  positionProperty.expression = posExpression.replace("{name}", linkLayer.name);

  var orientationFx = nullHelper
    .property("ADBE Transform Group")
    .property("ADBE Orientation");
  orientationFx.expression = rotExpression.replace("{name}", linkLayer.name);

  return nullHelper;
}

function getProjectDirectory() {
  var projectFile = app.project.file;
  if (projectFile) {
    return projectFile.path;
  } else {
    return null;
  }
}

function calcCameraData(cameraLayer, filmSizeMM) {
  // Get camera properties
  var cameraZoomPixels = cameraLayer.property("Zoom").value;
  var compWidth = cameraLayer.containingComp.width;

  // Calculate the focal length
  var focalLengthMM = (cameraZoomPixels * filmSizeMM) / compWidth;

  // Calculate angle of view
  var angleOfView =
    2 * Math.atan(filmSizeMM / (2 * focalLengthMM)) * (180 / Math.PI);

  return { focalLength: focalLengthMM.toFixed(2), angleOfView: angleOfView };
}

function isValidInteger(str) {
  // Check if string is null, undefined, or not a string
  if (str === null || str === undefined || typeof str !== "string") {
    return false;
  }

  // Manual trim for ExtendScript
  var trimmed = str.replace(/^\s+|\s+$/g, "");

  // Check if empty after trimming
  if (trimmed === "") {
    return false;
  }

  // Check for valid integer pattern: optional sign followed by digits only
  if (!/^[-+]?\d+$/.test(trimmed)) {
    return false;
  }

  // Parse and check if it's a valid number
  var num = parseInt(trimmed, 10);
  if (isNaN(num)) {
    return false;
  }

  return true;
}

function sortLayersByZCoordinate() {
  reverse = reverseSort.value;
  try {
    var comp = app.project.activeItem;

    if (!comp || !(comp instanceof CompItem)) {
      alert("Please select a composition first.");
      return false;
    }

    var selectedLayers = comp.selectedLayers;

    if (selectedLayers.length === 0) {
      alert("No layers selected.");
      return false;
    }

    // Get the target index (index of the bottommost selected layer)
    var targetIndex = 0;
    for (var i = 0; i < selectedLayers.length; i++) {
      if (selectedLayers[i].index > targetIndex) {
        targetIndex = selectedLayers[i].index;
      }
    }

    // Convert collection to array for sorting
    var layersArray = [];
    for (var i = 0; i < selectedLayers.length; i++) {
      layersArray.push(selectedLayers[i]);
    }

    // Filter only 3D layers and extract Z coordinates
    var layersWithZ = [];
    for (var i = 0; i < layersArray.length; i++) {
      var layer = layersArray[i];

      // Skip non-3D layers
      if (!layer.threeDLayer) {
        continue;
      }

      try {
        var position = layer
          .property("ADBE Transform Group")
          .property("ADBE Position");
        if (position && position.numKeys === 0) {
          var zValue = position.value[2]; // Get current Z value
          layersWithZ.push({
            layer: layer,
            zValue: zValue,
            index: layer.index,
          });
        }
      } catch (e) {
        // Skip layers with errors
        continue;
      }
    }

    // Check if we have any 3D layers with Z coordinates
    if (layersWithZ.length === 0) {
      alert("No 3D layers with Z position found in selection.");
      return false;
    }

    // Sort by Z coordinate
    layersWithZ.sort(function (a, b) {
      return reverse ? b.zValue - a.zValue : a.zValue - b.zValue;
    });

    // Reorder layers - place them starting from the target index position
    app.beginUndoGroup("Sort Layers by Z Coordinate");

    // Move layers in reverse order to maintain correct stacking
    for (var i = layersWithZ.length - 1; i >= 0; i--) {
      try {
        // Move each layer to the target position (bottom of selection)
        // The last layer in the sorted array goes to the target index
        // Previous layers go above it (lower indices)
        layersWithZ[i].layer.moveAfter(comp.layer(targetIndex));
      } catch (e) {
        // Continue with other layers if one fails
        continue;
      }
    }

    app.endUndoGroup();

    alert(
      "Sorted " +
        layersWithZ.length +
        " layers by Z coordinate " +
        (reverse ? "(farthest first)" : "(nearest first)")
    );
    return true;
  } catch (error) {
    alert("Error sorting layers: " + error.message);
    return false;
  }
}

// UI Handlers
function setTimeInInput(inputField) {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem)) return;
  var currentFrame = timeToFrames(comp.time, comp.frameRate);
  inputField.text = currentFrame.toString();
}

function timeToFrames(time, fps) {
  return Math.round(time * fps);
}

function handleWholeLayer() {
  var comp = app.project.activeItem;
  if (!comp || !(comp instanceof CompItem) || comp.selectedLayers[0] == null) {
    alert("Select a layer.");
    return;
  }

  try {
    var layer = comp.selectedLayers[0];
    var fps = comp.frameRate;

    var inPoint = timeToFrames(layer.inPoint, fps);
    var outPoint = timeToFrames(layer.outPoint, fps) - 1;

    fromInput.text = inPoint.toString();
    toInput.text = outPoint.toString();
  } catch (error) {
    alert(error);
  }
}

function handleBrowse() {
  var saveFile = File.saveDialog("Save camera data", "Data Files:*.json;*.txt");
  if (saveFile) {
    var fileName = saveFile.toString();
    filePathInput.text = fileName;
  }
}

function handleProjectPath() {
  var projectDir = getProjectDirectory();
  if (projectDir === null) {
    alert("The project is either not saved or no project is open.");
    return;
  }
  filePathInput.text = projectDir + "/blenderlink.json";
}

function handleExport() {
  try {
    // Validate pre-requirements and fields
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
      alert("Please select a composition first.");
      return;
    }

    if (filePathInput.text === "") {
      alert("Provide path for data saving.");
      return;
    }

    if (fromInput.text === "" || toInput.text === "") {
      alert("Set a frame range to export.");
      return;
    }

    var selectedLayers = comp.selectedLayers;
    if (selectedLayers.length === 0) {
      alert("Please select a layer.");
      return;
    }

    if (selectedLayers.length > 1) {
      alert("Select one layer.");
      return;
    }

    // Determine layer type
    var layer = selectedLayers[0];
    var type = undefined;
    if (layer instanceof CameraLayer) {
      // Camera
      type = "camera";
    } else if (
      // Video, image (everything that has a visual and a path)
      layer instanceof AVLayer &&
      layer.hasVideo &&
      layer.source.mainSource instanceof FileSource
    ) {
      type = "av";
      var path = layer.source.file.absoluteURI;
      return;
    }

    if (type === undefined) {
      alert("This type of layer is not currently supported.");
      layer.property("ADBE Transform Group").property("ADBE Scale").expression =
        sclExpression.replace("{name}", "catty");
      return;
    }

    // Make frame bounds
    try {
      if (!isValidInteger(fromInput.text) || !isValidInteger(fromInput.text)) {
        alert("Failed to parse frame range.");
        return;
      }
      var startFrame = parseInt(fromInput.text);
      var endFrame = parseInt(toInput.text);
    } catch (error) {
      alert(error.toString());
    }

    if (startFrame > endFrame) {
      // Swap
      temp = startFrame;
      startFrame = endFrame;
      endFrame = temp;
    }

    var frameDiff = endFrame - startFrame;
    if (frameDiff == 0) {
      alert("Frame range must include at least one frame.");
      return;
    }

    // Create a retriever null
    var dataNull = createHelperNull(layer);
    if (dataNull == null) {
      return;
    }

    // Prepare a data for an export
    var exportData = {
      layer_name: layer.name,
      type: type,
      comp: layer.containingComp.name,
      comp_details: {
        fps: comp.frameRate,
        width: comp.width,
        height: comp.height,
        shutter_angle: comp.shutterAngle,
        shutter_phase: comp.shutterPhase,
      },
      transform_data: {
        start_frame: startFrame,
        end_frame: endFrame,
        frames: [],
      },
    };

    // Calculate camera-specific data
    if (type == "camera") {
      sensorSize = parseFloat(camFilmSize.text);
      cameraData = calcCameraData(layer, sensorSize);
      exportData.camera_data = {
        focal_length: cameraData.focalLength,
        sensor_size: sensorSize,
      };
    }

    // AVItem-specific data
    if (type == "av") {
      exportData.avData = {
        path: path,
      };
    }

    // Make a progressBar
    var win = new Window(
      "window{text:'Progress',bar:Progressbar{value:0,maxvalue:100,preferredSize: [250, 20]}};"
    );
    win.bar.maxValue = frameDiff + 1;
    win.show();

    // Export frame-by-frame
    var transform = dataNull.transform;
    var positionProp = transform.position;
    var orientationProp = transform.orientation;

    for (var frame = startFrame; frame <= endFrame; frame++) {
      var time = frame / comp.frameRate;

      // Position
      var posValue = positionProp.valueAtTime(time, false);
      var position = {
        x: posValue[0],
        y: posValue[1],
        z: posValue[2],
      };

      // Orientation
      var oriValue = orientationProp.valueAtTime(time, false);
      var orientation = {
        x: oriValue[0],
        y: oriValue[1],
        z: oriValue[2],
      };

      exportData.transform_data.frames.push({
        frame: frame,
        position: position,
        orientation: orientation,
      });

      win.bar.value += 1;
      win.update();
    }
    deleteHelperNull(comp);

    // Write to file
    var exportFile = new File(filePathInput.text);
    var allData = {};

    if (exportFile.exists) {
      try {
        exportFile.encoding = "UTF-8";
        exportFile.open("r");
        allData = JSON.parse(exportFile.read());
        exportFile.close();
      } catch (error) {
        alert("Error reading existing file. Creating new one...");
      }
    }

    allData[layer.id] = exportData;

    try {
      exportFile.encoding = "UTF-8";
      exportFile.open("w");
      exportFile.write(JSON.stringify(allData, null, 2));
      exportFile.close();
    } catch (error) {
      alert("Error writing a file. Check file path or extension.");
      return;
    }

    win.close();
    alert("Added layer data to " + filePathInput.text + ".");
  } catch (error) {
    alert("Error: " + error.toString());
  }
}

function createUI(thisObj) {
  var myPanel = createMainPanel(thisObj);

  var keyframeData = createKeyframePanel(myPanel);
  var exportData = createExportPanel(myPanel);
  var detailsData = createDetailsPanel(myPanel);
  var sortingData = createSortingPanel(myPanel);

  fromInput = keyframeData.fromInput;
  toInput = keyframeData.toInput;
  filePathInput = exportData.filePathInput;
  camFilmSize = detailsData.camFilmSize;
  reverseSort = sortingData.reverseSort;

  finalizeLayout(myPanel);

  return myPanel;
}

function createMainPanel(thisObj) {
  var myPanel =
    thisObj instanceof Panel
      ? thisObj
      : new Window("palette", "Blender Camera Export", undefined, {
          resizeable: true,
        });
  myPanel.orientation = "column";

  return myPanel;
}

// KEYFRAME PANEL ***************
function createKeyframePanel(parent) {
  var keyframePanel = parent.add("panel", undefined, "Frame Range");
  keyframePanel.orientation = "column";
  keyframePanel.alignChildren = "fill";
  keyframePanel.alignment = ["fill", "top"];

  // Input row
  var rangeInputGroup = keyframePanel.add("group");
  rangeInputGroup.orientation = "row";
  rangeInputGroup.alignment = ["center", "top"];

  rangeInputGroup.add("statictext", undefined, "From");
  var fromInput = rangeInputGroup.add("edittext");
  fromInput.preferredSize.width = 50;
  fromInput.text = "0";

  rangeInputGroup.add("statictext", undefined, "To");
  var toInput = rangeInputGroup.add("edittext");
  toInput.preferredSize.width = 50;
  toInput.text = "10";

  // Button row
  var rangeButtonGroup = keyframePanel.add("group");
  rangeButtonGroup.orientation = "row";

  var fromButton = rangeButtonGroup.add("button", undefined, "Set From");
  fromButton.alignment = ["fill", "center"];
  fromButton.helpTip =
    "Use frame number from the current time as a beginning of the range.";

  var toButton = rangeButtonGroup.add("button", undefined, "Set To");
  toButton.alignment = ["fill", "center"];
  toButton.helpTip =
    "Use frame number from the current time as an ending of the range.";

  var wholeLayerButton = rangeButtonGroup.add(
    "button",
    undefined,
    "Whole Layer"
  );
  wholeLayerButton.alignment = ["fill", "center"];
  wholeLayerButton.helpTip = "Use selected layer bounds as frame range values.";

  // Assign handlers
  fromButton.onClick = function () {
    setTimeInInput(fromInput);
  };
  toButton.onClick = function () {
    setTimeInInput(toInput);
  };
  wholeLayerButton.onClick = handleWholeLayer;

  return { panel: keyframePanel, fromInput: fromInput, toInput: toInput };
}

// EXPORT PANEL ***************
function createExportPanel(parent) {
  var exportPanel = parent.add("panel", undefined, "Export Settings");
  exportPanel.orientation = "column";
  exportPanel.alignChildren = "fill";
  exportPanel.alignment = ["fill", "top"];

  // Path input
  var filePathInput = exportPanel.add(
    "edittext {properties: {readonly: true}}"
  );

  // Path buttons
  var pathButtonsGroup = exportPanel.add("group");
  pathButtonsGroup.orientation = "row";
  pathButtonsGroup.alignChildren = ["fill", "center"];

  var browseButton = pathButtonsGroup.add("button", undefined, "Browse...");
  // browseButton.alignment = ["fill", "center"];

  var orText = pathButtonsGroup.add("statictext");
  orText.text = "or";
  orText.justify = "center";
  orText.minimumSize.width = 14;
  // orText.alignment = ["fill", "center"];

  var projectPathButton = pathButtonsGroup.add(
    "button",
    undefined,
    "Use project dir"
  );
  // projectPathButton.alignment = ["fill", "center"];

  var exportButton = exportPanel.add("button", undefined, "Export layer");
  exportButton.helpTip =
    "Export layer position and rotation data to a file. Values are taken " +
    "from the specified frame range. Please note that this feaute does not override " +
    "a file, but appends data to it. However, it overrides same existing layers.";

  // Assign handlers
  browseButton.onClick = handleBrowse;
  projectPathButton.onClick = handleProjectPath;
  exportButton.onClick = handleExport;

  return {
    panel: exportPanel,
    filePathInput: filePathInput,
  };
}

// DETAILS PANEL ***************
function createDetailsPanel(parent) {
  var detailsPanel = parent.add("panel", undefined, "Camera Delails");
  detailsPanel.orientation = "column";

  var filmSizeGroup = detailsPanel.add("group");
  filmSizeGroup.orientation = "row";

  filmSizeGroup.add("statictext", undefined, "Film Size");
  var camFilmSize = filmSizeGroup.add("edittext");
  camFilmSize.preferredSize.width = 60;
  camFilmSize.text = "36";
  camFilmSize.helpTip =
    "When exporting a camera layer, this setting helps the script automatically set the camera's sensor size in Blender.";

  return { panel: detailsPanel, camFilmSize: camFilmSize };
}

// SORTING PANEL ***************
function createSortingPanel(parent) {
  var sortPanel = parent.add("panel", undefined, "Sorting");
  sortPanel.orientation = "column";
  sortPanel.alignChildren = ["center", "center"];
  sortPanel.margins.top = 18;

  var reverseOrder = sortPanel.add("checkbox");
  reverseOrder.text = "Reverse order";
  reverseOrder.value = true;
  reverseOrder.helpTip =
    "Reverse checkbox means that top layers have the lowest Z value. Usually, this is what you want for your render compositing";

  var sortButton = sortPanel.add("button");
  sortButton.text = "Sort selected by Z";
  sortButton.onClick = sortLayersByZCoordinate;

  return { panel: sortPanel, reverseSort: reverseOrder };
}

function finalizeLayout(panel) {
  panel.layout.layout(true);

  panel.onResizing = panel.onResize = function () {
    this.layout.resize();

    // Responsive behavior
    var minWidthForSingleRow = 300;
    var elements = [
      this.children[0].children[1], // setButtonGroup in keyframePanel
      this.children[1].children[1], // pathChooseGroup in filePanel
    ];

    elements.forEach(function (group) {
      if (group && group.orientation) {
        group.orientation =
          panel.size[0] < minWidthForSingleRow ? "column" : "row";
      }
    });

    this.layout.layout(true);
  };
}

var myPanel = createUI(this);

if (myPanel instanceof Window) {
  myPanel.center();
  myPanel.show();
}
