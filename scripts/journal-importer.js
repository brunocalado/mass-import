import { common } from './common.js'

export class journalImporter {

  // ---------------------------------------------------------
  //
  static async imageToJournal() {
   
    const basePath = 'modules/mass-import/WORKSPACE/taroticum'; // 'modules/mymaps/animatedmaps'
    
    const templateData = {basePath: basePath}; 
    const dialogTemplate = await renderTemplate( `modules/mass-import/templates/image-to-journal-dialog.html`, templateData );                
    
    new Dialog({
      title: `Folder To Journal`,
      content: dialogTemplate,
      buttons: {
        roll: {
          label: "Create",
          callback: (html) => {
            this.createJournal(html);
          }
        }, 
        cancel: {
          label: "Cancel"
        }
      },
      render: (html) => listener(html)
    }).render(true);

    function listener(html) {
      html.find(".picker-button").on("click", function() {
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
  static async createJournal(html) {
    const folderName = html.find("input[id=folder_name").val();  
    const journalName = html.find("input[id=journal_name").val();  
    const folderPath = html.find("input[name=folder-path]").val();  
    const importType = parseInt( html.find("select[name=select_import_type]").val() );  
    let journalData = {};

    // Split files
    let {files} = await FilePicker.browse("data", folderPath);
    
    // Folder
    const createdFolder = await Folder.createDocuments([{name: folderName, type: "JournalEntry"}]);
    const folderID = createdFolder[0].id;    
    
    // Data
    journalData.journalName = journalName;
    journalData.folderID = folderID;
    
    /* Import Types
    0 - Each Image One Page
    1 - All Images into Text Page
    2 - PDF
    3 - Video
    */
    switch(importType) {
      case 0:
        this.oneImageOnePage(files, journalData);
        break;
      case 1:
        this.allImagesToOneTextPage(files, journalData);        
        break;   
      case 2:
        this.folderToJournalPDF(files, journalData);        
        break;   
      case 3:
        this.oneVideoOnePage(files, journalData);        
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
      images.push({
        "name": common.splitPath(imagePath),
        "type": "image",
        "src": imagePath,
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
  } // END oneImageOnePage

  // This will create one journal with one text page with all images.
  static async allImagesToOneTextPage(files, data) {
    let images = ``;
    let pages = [];
    for (let imagePath of files) {
      images = images + `<img src=\"${imagePath}\" />`;
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
  }    
    
} // END CLASS


