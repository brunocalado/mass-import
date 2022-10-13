import { common } from './common.js'

export class sceneImporter {

  // ---------------------------------------------------------
  //
  static async imageToScene() {   
    const basePath = 'modules/mymaps/animatedmaps/cavern'; // 'modules/mymaps/animatedmaps'
    
    const templateData = {basePath: basePath}; 
    const dialogTemplate = await renderTemplate( `modules/mass-import/templates/image-to-scene-dialog.html`, templateData );                
    
    new Dialog({
      title: `Image Folder To Scene`,
      content: dialogTemplate,
      buttons: {
        roll: {
          label: "Create",
          callback: (html) => {
            this.createScenesFolder(html);
          }
        }, 
        cancel: {
          label: "Cancel"
        }
      },
      render: (html) => listener(html)
    }).render(true);

    function listener(html) {
        html.find(".picker-button").on("click", function(){
            new FilePicker({
                type: "folder",
                callback: function (path) {
                  html.find("input[name=folder-path]").val(path);
            }}).render(true);
        });
    }    
    
  }
  
  // ---------------------------------------------------------
  //  
  static async createScenesFolder(html) {
    const folderPath = html.find("input[name=folder-path]").val();  
    const folderName = html.find("#folderName")[0].value;  

    const gridType = html.find("select[name=select_grid_type]").val();  
    const gridAlpha = html.find("input[id=grid_alpha]").val();
    const gridDistance = html.find("input[id=grid_distance]").val();
    const gridSize = html.find("input[id=grid_size]").val();
    const gridUnits = html.find("input[id=grid_units]").val();
    
    const navigation = html.find("input[name=select_navigation]")[0].checked;
    const backgroundColor = html.find("input[id=background_color]").val();
    const scenePadding = html.find("input[id=scene_padding]").val();
    
    const tokenVision = html.find("input[name=token_vision]")[0].checked;
    const fogExploration = html.find("input[name=fog_exploration]")[0].checked;

    // Create Folder
    const createdFolder = await Folder.createDocuments([{name: folderName, type: "Scene"}]);
    const folderID = createdFolder[0].id;  
    let {files} = await FilePicker.browse("data", folderPath);

    const sceneDefaults = {
      folderID: folderID,
      gridType: gridType,
      gridAlpha: gridAlpha,
      gridDistance: gridDistance,
      gridUnits: gridUnits,
      gridSize: gridSize,
      navigation: navigation,
      backgroundColor: backgroundColor,
      scenePadding: scenePadding,
      tokenVision: tokenVision,
      fogExploration: fogExploration
    };
    
    for (let imagePath of files) {
      const myScene = await this.createScene(imagePath, sceneDefaults);
    }
    
  } 
  
  // --------------------------------
  // Functions
  // ---------------------------------------------------------
  //  
  static async getDimensions(path) {
    const dimensions={};
    const texture = await loadTexture(path, {fallback: 'icons/svg/hazard.svg'});
    dimensions.width = texture.width
    dimensions.height = texture.height    
    return dimensions;
  }

  // ---------------------------------------------------------
  //  
  static async createScene(imagePath, sceneDefaults) {
    const dimensions = await this.getDimensions(imagePath);
    const sceneWidth = dimensions.width;
    const sceneHeight = dimensions.height;    
  
    // --------------------------
    // Scene Optons
    let data = {
      name: common.splitPath(imagePath),
      width: sceneWidth,
      height: sceneHeight,
      img: imagePath,
      grid: sceneDefaults.gridSize,
      folder: sceneDefaults.folderID,
      gridDistance: sceneDefaults.gridDistance,
      gridUnits: sceneDefaults.gridUnits,
      fogExploration: sceneDefaults.fogExploration,
      tokenVision: sceneDefaults.tokenVision,
      gridType: sceneDefaults.gridType,
      backgroundColor: sceneDefaults.backgroundColor,
      padding: sceneDefaults.scenePadding,
      gridAlpha: sceneDefaults.gridAlpha,
      navigation: sceneDefaults.navigation
    };

    await Scene.create(data);
  }
  
} // END CLASS

