import { common } from './common.js'

export class deckImporter {

  // ---------------------------------------------------------
  //
  static async imageToDeck() {
   
    const basePath = 'modules/mass-import/WORKSPACE/taroticum'; // 'modules/mymaps/animatedmaps'
    
    const templateData = {basePath: basePath}; 
    const dialogTemplate = await foundry.applications.handlebars.renderTemplate( `modules/mass-import/templates/image-to-deck-dialog.html`, templateData );                
    const sourceData = {
      activeSource: 'data', // data is default
      activeBucket: '',
      path: ''
    }
    
    // App V2
    const result = await foundry.applications.api.DialogV2.prompt({
      window: { title: "Image Folder To Deck" },
      content: dialogTemplate,
      ok: {
        label: "Create",
        callback: (event, button, dialog) => {
          const html = $(dialog.element); // ← Esta linha resolve o problema
          this.createDeck(html, sourceData);
        }
      },
      render: (event, dialog) => {
        const html = $(dialog.element); // ← E esta também
        listener(html);
      }
    });  
    
/*
    new Dialog({
      title: `Image Folder To Deck`,
      content: dialogTemplate,
      buttons: {
        roll: {
          label: "Create",
          callback: (html) => {
            this.createDeck(html, sourceData);
          }
        }, 
        cancel: {
          label: "Cancel"
        }
      },
      render: (html) => listener(html)
    }).render(true);
*/
    function listener(html) {
        html.find(".picker-button").on("click", function() {
            new foundry.applications.apps.FilePicker.implementation({
                type: "folder",
                callback: function (path) {
                  sourceData.activeSource = this.activeSource;
                  sourceData.activeBucket = this.activeSource==='s3' ? this.sources.s3.bucket : '';
                  sourceData.path = path;
                  html.find("input[name=folder-path]").val(path);
            }}).render(true);
        });
        html.find(".card-back-picker-button").on("click", function() {
            new foundry.applications.apps.FilePicker.implementation({
                type: "data",
                callback: function (path) {
                  html.find("input[name=card-back-image]").val(path);
            }}).render(true);
        });        
    }    
    
  }
  
  // ---------------------------------------------------------
  //  
  static async createDeck(html, sourceData) {
    const folderPath = html.find("input[name=folder-path]").val();  
    const cardBackImage = html.find("input[name=card-back-image]").val();  
    const deckName = html.find("#deck_name")[0].value;  
    const cardWidth = html.find("#card_width")[0].value;  
    const gridHeight = html.find("#grid_height")[0].value;  
  
    // 
    let {files} = await FilePicker.browse(
      sourceData.activeSource, 
      sourceData.path, 
      { bucket: sourceData.activeBucket || '' });
    
    //create the empty deck
    const deck = await Cards.create({
      name: deckName,
      type: 'deck',
    });
    
    //map the entry data to the raw card data
    const rawCardData = files.map((file) => {
      // file = imagePath and splitPath(file) = image name
      const imagePath = file;
      const imageName = common.splitPath(imagePath).capitalize();

      if ( cardWidth==0 || gridHeight==0 ) {
        return {
          name: imageName,
          type: 'base',
          faces: [
            {
              img: imagePath,
              name: imageName,
            },
          ],
          back: {
            name: '',
            text: '',
            img: cardBackImage
          },      
          face: 0,
          origin: deck?.id
        }; // END RETURN
      } else {      
        return {
          name: imageName,
          type: 'base',
          faces: [
            {
              img: imagePath,
              name: imageName,
            },
          ],
          back: {
            name: '',
            text: '',
            img: cardBackImage
          },      
          face: 0,
          origin: deck?.id,
          width: cardWidth,
          height: gridHeight        
        }; // END RETURN
      } // END ELSE
    });
    
    //create the cards in the deck
    deck?.createEmbeddedDocuments('Card', rawCardData);
    
    //open the sheet once we're done
    deck?.sheet?.render(true);  
    
  } 
  
  // --------------------------------
  // Functions
  // ---------------------------------------------------------
  
} // END CLASS