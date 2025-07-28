import { common } from './common.js'

export class journalImporter {

  // ---------------------------------------------------------
  //
  static async imageToJournal() {   
    const basePath = 'modules/mass-import/WORKSPACE/taroticum'; // 'modules/mymaps/animatedmaps'
    
    const templateData = {basePath: basePath}; 
    const dialogTemplate = await foundry.applications.handlebars.renderTemplate( `modules/mass-import/templates/image-to-journal-dialog.html`, templateData );                
    const sourceData = {
      activeSource: 'data', // data is default
      activeBucket: '',
      path: ''
    }

    // App V2
    // Configurar o dialog sem usar prompt()
    const dialogOptions = {
      window: { 
        title: "Journals",
        resizable: true
      },
      content: dialogTemplate,
      buttons: [
        {
          action: "create",
          label: "Create",
          default: true,
          callback: (event, button, dialog) => {
            const html = $(dialog.element);
            this.createJournal(html, sourceData);
          }
        },
        {
          action: "cancel",
          label: "Cancel"
        }
      ]
    };

    // Criar o dialog
    const dialog = new foundry.applications.api.DialogV2(dialogOptions);
    
    // Hook para configurar listeners após render
    dialog.addEventListener('render', () => {
      const html = $(dialog.element);
      listener(html);
    });
    
    dialog.render(true);

    function listener(html) {
        html.find(".picker-button").on("click", function(e){
            e.preventDefault();
            e.stopPropagation();
            
            new foundry.applications.apps.FilePicker.implementation({
                type: "folder",
                callback: function (path) {
                  sourceData.activeSource = this.activeSource;
                  sourceData.activeBucket = this.activeSource==='s3' ? this.sources.s3.bucket : '';
                  sourceData.path = path;
                  html.find("input[name=folder-path]").val(path);
            }}).render(true);
        });
    }    
    
  }
  
  // ---------------------------------------------------------
  //  
  static async createJournal(html, sourceData) {
    const folderName = html.find("input[id=folder_name").val();  
    const journalName = html.find("input[id=journal_name").val() || '';  
    // const folderPath = html.find("input[name=folder-path]").val();  
    const importType = parseInt( html.find("select[name=select_import_type]").val() );  
    // all images to text
    const widthName = html.find("input[id=width_name").val();  
    const heightName = html.find("input[id=height_name").val();  
    //video
    const videoVolume = html.find("input[id=video_volume]").val();
    const videoShowVideoControls = html.find("input[name=video_show_video_controls]")[0].checked;
    const videoAutoplay = html.find("input[name=video_autoplay]")[0].checked;
    const videoLoop = html.find("input[name=video_loop]")[0].checked;
    let journalData = {};

    // Split files
    let {files} = await FilePicker.browse(
      sourceData.activeSource, 
      sourceData.path, 
      { bucket: sourceData.activeBucket || '' });
    
    // Folder
    const createdFolder = await Folder.createDocuments([{name: folderName, type: "JournalEntry"}]);
    const folderID = createdFolder[0].id;
    
    // Data
    journalData.journalName = journalName;
    journalData.folderID = folderID;
    journalData.widthName = widthName;
    journalData.heightName = heightName;
    journalData.videoVolume = videoVolume;
    journalData.videoShowVideoControls = videoShowVideoControls;
    journalData.videoLoop = videoLoop;
    journalData.videoAutoplay = videoAutoplay;
    
    /* Import Types
    0 - Each Image One Page
    1 - Each Image One Journal Image
    2 - Each Image One Text Page
    3 - All Images into Text Page
    4 - PDF
    5 - Each Video One Video Page
    6 - All Video Into One Text Page
    */
    switch(importType) {
      case 0:
        this.oneImageOnePage(files, journalData);
        break;
      case 1:
        this.oneImageOneJournalImage(files, journalData);        
        break;           
      case 2:
        this.oneImageOneTextPage(files, journalData);        
        break;           
      case 3:
        this.allImagesToOneTextPage(files, journalData);        
        break;   
      case 4:
        this.folderToJournalPDF(files, journalData);        
        break;   
      case 5:
        this.oneVideoOnePage(files, journalData);        
        break;           
      case 6:
        this.allVideoToOneTextPage(files, journalData);        
        break;          
      default:
        // code block
    }    
    
  }   
  
  // --------------------------------
  // Functions
  // ---------------------------------------------------------
  
  // This will create one journal with one image page for each image.
  static async oneImageOnePage(files, data) {
    let images = []; 
    for (let imagePath of files) { 
      const imageName = common.splitPath(imagePath).capitalize();
      // 
      images.push({
        "name": imageName,
        "type": "image",
        "src": imagePath,
        "title": {
          "show": false
        },
        "image": {
          "caption": imageName
        }
      });
    }    

    await JournalEntry.create({
      name: data.journalName,
      folder: data.folderID,
      pages: images      
    });    
  } // END oneImageOnePage

  // This will create one journal with one text page for each image.
  static async oneImageOneTextPage(files, data) {
    let textPages = []; 
    for (let imagePath of files) { 
      const imageName = common.splitPath(imagePath).capitalize();
      let tempsize="";
      let imageFormated="";
      if(data.heightName!="" ) {
        tempsize =  ` height="${data.heightName}"`;
      }
      if(data.widthName!="" ) {
        tempsize = tempsize + ` width="${data.widthName}"`;
      } 

      imageFormated = `<img src=\"${imagePath}\" ${tempsize}/>`;
     
      textPages.push({
        "name": imageName,
        "type": "text",
        "title": {
          "show": false
        },
        "text": {
          "content": imageFormated
        }
      });
    }    

    await JournalEntry.create({
      name: data.journalName,
      folder: data.folderID,
      pages: textPages      
    });    
  } // END oneImageOneTextPage

  // This will create one journal with one image.
  static async oneImageOneJournalImage(files, data) {
    for (let imagePath of files) {
      var myImage;
      let imageName = common.splitPath(imagePath).capitalize();
      myImage = [{
        "name": imageName,
        "type": "image",
        "src": imagePath,
        "title": {
          "show": false
        },
        "image": {
          "caption": imageName
        }
      }];
      await JournalEntry.create({
        name: data.journalName ? `${data.journalName} - ${imageName}` : imageName,
        folder: data.folderID,
        pages: myImage      
      });        
    }
  
  } // END oneImageOnePage


  // This will create one journal with one text page with all images.
  static async allImagesToOneTextPage(files, data) {
    let images = ``;
    let pages = [];
    for (let imagePath of files) {
      let tempsize="";
      if(data.heightName!="" ) {
        tempsize =  ` height="${data.heightName}"`;
      }
      if(data.widthName!="" ) {
        tempsize = tempsize + ` width="${data.widthName}"`;
      } 

      images = images + `<img src=\"${imagePath}\" ${tempsize}/>`;

    }    
    
    pages.push(
      {
        "name": 'My Images',
        "type": "text",
        "title": {
          "show": false
        },
        "text": {
          "content": images
        },        
      }    
    );
    
    await JournalEntry.create({
      name: data.journalName,
      folder: data.folderID,
      pages: pages      
    });    
  } // END oneImageOnePage

  // 
  static async folderToJournalPDF(files, data) {
    let images = [];
    for (let pdfPath of files) {
      images.push({
        "name": common.splitPath(pdfPath),
        "type": "pdf",
        "src": pdfPath,
        "title": {
          "show": false
        }
      })
    }

    await JournalEntry.create({
      name: data.journalName,
      folder: data.folderID,
      pages: images      
    });       
  }
  
  // 
  static async oneVideoOnePage(files, data) {
    let images = [];
    for (let videoPath of files) {
      images.push({
        "name": common.splitPath(videoPath),
        "type": "video",
        "src": videoPath,
        "title": {
          "show": false
        },
        "video": {
          "controls": data.videoShowVideoControls,
          "volume": data.videoVolume,
          "loop": data.videoLoop,
          "autoplay": data.videoAutoplay
        }      
      })
    }    

    await JournalEntry.create({
      name: data.journalName,
      folder: data.folderID,
      pages: images      
    });      
  }    
    
  // This will create one journal with one text page with all images.
  static async allVideoToOneTextPage(files, data) {
    let videos = ``;
    let pages = [];
    for (let imagePath of files) {
      let tempsize="";
      if(data.heightName!="" ) {
        tempsize =  ` height="${data.heightName}"`;
      }
      if(data.widthName!="" ) {
        tempsize = tempsize + ` width="${data.widthName}"`;
      } 

      videos = videos + `<video ${tempsize} src="${imagePath}" controls></video><p></p>`;

    }    
    
    pages.push(
      {
        "name": 'My Videos',
        "type": "text",
        "title": {
          "show": false
        },
        "text": {
          "content": videos
        },        
      }    
    );
    
    await JournalEntry.create({
      name: data.journalName,
      folder: data.folderID,
      pages: pages      
    });    
  } // END oneImageOnePage    
    
} // END CLASS


