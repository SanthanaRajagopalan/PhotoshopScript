/**
* Layer Exporter
**/

#target photoshop
 
 // Global Config
var config = {
    convertVisibleOnly: true,
    convertAll: false,
    merge: false,
    folderName: 'Output',
    logFile: 'log',
    dpi: 150
   };

var createProgressWindow, 
        mainWindow,
        docRef = app.activeDocument,
        activeLay = docRef.activeLayer,
        count = 0,
        dpiArr = [72, 150, 300 ],
        progWin,
        selectedLayers,
        visibleLayers, 
        allLayers,
        layerQueue = [],
        errorCount = 0;
        
mainWindow = function() {  
    var win, windowResource;
     
    windowResource = "dialog {  \
        orientation: 'column', \
        alignChildren: ['fill', 'top'],  \
        preferredSize:[300, 130], \
        text: 'Layer Exporter',  \
        margins:15, \
        \
      grpLayers: Group {\
        orientation: 'row',\
        radioLayersAll: RadioButton {text: 'All layers', preferredSize: [155, 20], value: true},\
        radioLayersVis: RadioButton {text: 'Visible only', preferredSize: [155, 20]}\
      }\
       grpDpi: Group {\
        orientation: 'row',\
        txtDpi: StaticText {text: 'DPI settings:', preferredSize: [70, 20]},\
        listDpi: DropDownList {preferredSize: [140, 20], properties: {items: ['72', '150', '300']}}\
      }\
        \
        bottomGroup: Group{ \
            cancelButton: Button { text: 'Cancel', properties:{name:'cancel'}, size: [120,24], alignment:['right', 'center'] }, \
            exportBtn: Button { text: 'Export', properties:{name:'ok'}, size: [120,24], alignment:['right', 'center'] }, \
        }\
    }"
     
    win = new Window(windowResource);
     
    win.bottomGroup.cancelButton.onClick = function() {
      return win.close();
    };
    
    win.bottomGroup.exportBtn.onClick = function() {
        try {
                win.grpDpi.listDpi.selection.index ;
            } catch (e){
                alert("select a proper dpi setting");
                return false;
           }
       if(win.grpDpi.listDpi.selection.index > -1) {
            config['dpi'] = dpiArr[win.grpDpi.listDpi.selection.index];
            progWin = new createProgressWindow(null,"Collecting layers", false);
            selectedLayers = collectLayers(); 
            $.writeln("layers count: "+ selectedLayers.layers.length);

            visibleLayers = selectedLayers.visibleLayers;
            allLayers = selectedLayers.layers;
            $.writeln("VISIBLE LAYERS: " + visibleLayers.length);
            $.writeln("TOTAL NO OF LAYERS: " + allLayers.length);
            if (config.convertVisibleOnly == true){
                layerQueue = visibleLayers;
                }
            if (config.convertAll == true){
                layerQueue = allLayers;
                }
            layerExport();
            
       }       
      return win.close();
    };
     
    win.show();
 }


// Progress bar module
createProgressWindow = function(title, message, hasCancelButton) {  
  var win;  
  if (title == null) {  
    title = "Work in progress";  
  }  
  if (message == null) {  
    message = "Please wait...";  
  }  
  if (hasCancelButton == null) {  
    hasCancelButton = false;  
  }  
  win = new Window("palette", "" + title, undefined);  
  win.bar = win.add("progressbar", {  
    x: 20,  
    y: 12,  
    width: 300,  
    height: 20  
  }, 0, 100);  
  win.stMessage = win.add("statictext", {  
    x: 10,  
    y: 36,  
    width: 320,  
    height: 20  
  }, "" + message);  
  win.stMessage.justify = 'center';  
  
  if (hasCancelButton) {  
    win.cancelButton = win.add('button', undefined, 'Cancel');  
    win.cancelButton.onClick = function() {  
      return win.exception = new Error('User canceled the pre-processing!');  
    };  
  }  
  this.reset = function(message) {  
    win.bar.value = 0;  
    win.stMessage.text = message;  
    return win.update();  
  };  
  this.updateProgress = function(perc, message) {  
    if (win.exception) {  
      win.close();  
      throw win.exception;  
    }  
    if (perc != null) {  
      win.bar.value = perc;  
    }  
    if (message != null) {  
      win.stMessage.text = message;  
    }  
    return app.refresh();  
  };  
  this.close = function() {  
    return win.close();  
  };  
  win.center(win.parent);  
  return win.show();  
}; 

// Create output folder
 var outFolder = new Folder(Folder.desktop + "/" + config.folderName);  
 if (!outFolder.exists) {
    outFolder.create();
}

 
 //Create logfile FOLDER on the desktop
var LogFolder = new Folder(Folder.desktop + "/" + config.folderName +"/log");  
if(!LogFolder.exists) LogFolder.create();

//Append to LOGFILE
var Loginfo = new File(Folder.desktop + "/" + config.folderName +"/log/" + "log.txt");
Loginfo.open("a", "TEXT");


  
// Get current document and current layer
var docRef = app.activeDocument,
       activeLay = docRef.activeLayer,
       count = 0;

// Collecting Layers
mainWindow();
function layerExport () {
        var curLayer = layerQueue.pop();
        if (curLayer) {
                    Loginfo.write("Exporting layer: "+ curLayer.name + "\r");
                    progWin.updateProgress ((count/selectedLayers.layers.length) * 100, "Exporting layer "+ count + " of " + selectedLayers.layers.length);
                    saveLayer (curLayer, curLayer.name, Folder.desktop, false,layerExport);               

            } else {
                    if(errorCount > 0){
                        alert('Layers has been exported.. There might be some layers that are having some problems. Check the log');
                        } else {
                            alert('Layers has been exported successfully');
                       }                   
                   Loginfo.write('Layers has been exported successfully');
                   Loginfo.close();
            }
    }

//Write the info to the file

// Collect all layers visible and invisible
// reference 1: https://github.com/jwa107/Photoshop-Export-Layers-as-Images
//  reference 2: https://forums.adobe.com/message/2666611

function collectLayers()
{
  var layers = [],
           visibleLayers = [],
           layerCount = 0,
           ref = null,
           desc = null;
  
  const idOrdn = charIDToTypeID("Ordn");
  
  // Get layer count reported by the active Document object - it never includes the background.
  ref = new ActionReference();
  ref.putEnumerated(charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt"));
  desc = executeActionGet(ref);
  layerCount = desc.getInteger(charIDToTypeID("NmbL"));

  if (layerCount == 0) {
    // This is a flattened image that contains only the background (which is always visible).
        activeDocument.backgroundLayer.locked = false;
    var bg = activeDocument.backgroundLayer;
      layers.push(bg);
    visibleLayers.push(bg);
  }
  else {
    // There are more layers that may or may not contain a background. The background is always at 0;
    // other layers are indexed from 1.
    
    const idLyr = charIDToTypeID("Lyr ");
    const idLayerSection = stringIDToTypeID("layerSection");
    const idVsbl = charIDToTypeID("Vsbl");
    const idNull = charIDToTypeID("null");
    const idSlct = charIDToTypeID("slct");
    const idMkVs = charIDToTypeID("MkVs");
    
        ref = new ActionReference();
    ref.putEnumerated(idLyr, idOrdn, charIDToTypeID("Trgt"));
    var selectionDesc = executeActionGet(ref);
    
    try {
      // Collect normal layers.
      var visibleInGroup = [true];
      var layerVisible;
      for (var i = layerCount; i >= 1; --i) {
        // check if it's an art layer (not a group) that can be selected
        ref = new ActionReference();
        ref.putIndex(idLyr, i);
        desc = executeActionGet(ref);
        layerVisible = desc.getBoolean(idVsbl);
        layerSection = typeIDToStringID(desc.getEnumerationValue(idLayerSection));
        if (layerSection == "layerSectionContent") {
          // select the layer and then retrieve it via Document.activeLayer
          desc.clear();
          desc.putReference(idNull, ref);  
          desc.putBoolean(idMkVs, false);  
          executeAction(idSlct, desc, DialogModes.NO);
          
          var activeLayer = activeDocument.activeLayer;
          layers.push(activeLayer);
          if (layerVisible && visibleInGroup[visibleInGroup.length - 1]) {
            visibleLayers.push(activeLayer);
          }       
        }
        else if (layerSection == "layerSectionStart") {
          visibleInGroup.push(layerVisible && visibleInGroup[visibleInGroup.length - 1]);
        }
        else if (layerSection == "layerSectionEnd") {
          visibleInGroup.pop();
        }       
      }
      
      // Collect the background.
      ref = new ActionReference();
      ref.putIndex(idLyr, 0);
      try {
        desc = executeActionGet(ref);
        var bg = activeDocument.backgroundLayer;
        layers.push(bg);
        if (bg.visible) {
          visibleLayers.push(bg);
        }

      }
      catch (e) {
        // no background, move on
      }   
    }
    catch (e) {
      if (e.message != "cancel") throw e;
    }

    // restore selection (unfortunately CS2 doesn't support multiselection, so only the topmost layer is re-selected)
    desc.clear();
    ref = new ActionReference();
    const totalLayerCount = selectionDesc.getInteger(charIDToTypeID("Cnt "));
    ref.putIndex(idLyr, selectionDesc.getInteger(charIDToTypeID("ItmI")) - (totalLayerCount - layerCount));
    desc.putReference(idNull, ref);  
    desc.putBoolean(idMkVs, false);  
    executeAction(idSlct, desc, DialogModes.NO);
  }
    
  return {layers: layers, visibleLayers: visibleLayers};
}

function saveLayer(layer, lname, path, shouldMerge,callback) {
    var saveFile= File(path +"/output/"+lname+".png");
    layer = unlockLayer(layer);
    $.writeln("LAYER" + layer.allLocked);
    var newLayer = layer.duplicate();
    newLayer.rasterize(RasterizeType.ENTIRELAYER);
    docRef.activeLayer = newLayer;
    raterizeLayerStyle();
    
    // Unclocking layer
     newLayer.locked = false;
    //Copy the content of the layer in the clipboard
    
    try {
            newLayer.copy();
            count++;
        } catch (e){
            errorCount++;
             Loginfo.write("Error while exporting layer: "+ layer.name + "\r");
           }
    
     
    //Get the dimensions of the content of the layer
    var tempWidth = newLayer.bounds[2] - newLayer.bounds[0];
    var tempHeight = newLayer.bounds[3] - newLayer.bounds[1];
    //Create a new document with the correct dimensions and a transparent background
    var myNewDoc = app.documents.add(tempWidth,tempHeight,config.dpi,"exportedLayer", NewDocumentMode.RGB,DocumentFill.TRANSPARENT);//150 is the pixels per inch
    //Add an empty layer and paste the content of the clipboard inside
    var targetLayer = myNewDoc.artLayers.add();
    myNewDoc.paste();
     
    //Set the opacity
    targetLayer.opacity = activeLay.opacity;
     
    //Options to export to PNG files
    var options = new ExportOptionsSaveForWeb();
     options.format = SaveDocumentType.PNG;
     options.PNG8 = false;
     options.transparency = true;
     options.optimized = true;
        
    //Export Save for Web in the current folder
    myNewDoc.exportDocument(File(saveFile),ExportType.SAVEFORWEB, options);
     
    //Close the temp document without saving the changes
    myNewDoc.close (SaveOptions.DONOTSAVECHANGES);
     
    //Remove the temp layer
    newLayer.remove();
    Loginfo.write("Layer Exported: "+ layer.name + "\r");
    callback.call();
}

function savePng(saveFile, callback){
    var pngOpts = new ExportOptionsSaveForWeb; 
    pngOpts.format = SaveDocumentType.PNG
    pngOpts.PNG8 = false; 
    pngOpts.transparency = true; 
    pngOpts.interlaced = false; 
    pngOpts.quality = 100;
    activeDocument.exportDocument(new File(saveFile),ExportType.SAVEFORWEB,pngOpts); 
    callback.call();
}
 
//  Action recorded through scriptlistener plugin
//  https://forums.adobe.com/message/4500399
function raterizeLayerStyle(){
    var idrasterizeLayer = stringIDToTypeID( "rasterizeLayer" );
    var desc5 = new ActionDescriptor();
    var idnull = charIDToTypeID( "null" );
        var ref4 = new ActionReference();
        var idLyr = charIDToTypeID( "Lyr " );
        var idOrdn = charIDToTypeID( "Ordn" );
        var idTrgt = charIDToTypeID( "Trgt" );
        ref4.putEnumerated( idLyr, idOrdn, idTrgt );
    desc5.putReference( idnull, ref4 );
    var idWhat = charIDToTypeID( "What" );
    var idrasterizeItem = stringIDToTypeID( "rasterizeItem" );
    var idlayerStyle = stringIDToTypeID( "layerStyle" );
    desc5.putEnumerated( idWhat, idrasterizeItem, idlayerStyle );
    executeAction( idrasterizeLayer, desc5, DialogModes.NO );
}
 
 function unlockLayer(layerObj) {
  var layer = layerObj;
  if (layer.isBackgroundLayer ) layer.name = 'From Background';
  if (layer.allLocked) layer.allLocked = false;
  if (layer.pixelsLocked && layer.kind != LayerKind.TEXT) layer.pixelsLocked = false;
  if (layer.positionLocked) layer.positionLocked = false;
  if (layer.transparentPixelsLocked && layer.kind != LayerKind.TEXT) layer.transparentPixelsLocked = false;
  
  return layer;
}
