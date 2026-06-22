import { Common } from './common.js';
import { MODULE_ID } from './constants.js';

export class DeckImporter {

  static async imageToDeck() {
    Common.log('Deck Importer opened');
    const templatePath = `modules/${MODULE_ID}/templates/image-to-deck-dialog.hbs`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});
    
    const sourceData = { activeSource: 'data', activeBucket: '', path: '' };

    // --- LOAD SAVED PREFERENCES ---
    // lastDeckFolder may be a legacy plain string (path only) or an object
    // carrying the browse source/bucket for S3. Handle both for back-compat.
    const lastDeckPref = game.user.getFlag(MODULE_ID, 'lastDeckFolder');
    let lastFolder = '';
    if (typeof lastDeckPref === 'string') {
      lastFolder = lastDeckPref;
    } else if (lastDeckPref && typeof lastDeckPref === 'object') {
      lastFolder = lastDeckPref.path || '';
      sourceData.activeSource = lastDeckPref.activeSource || 'data';
      sourceData.activeBucket = lastDeckPref.activeBucket || '';
    }
    const lastBackImg = game.user.getFlag(MODULE_ID, 'lastDeckBackImage') || '';

    // 1. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      classes: [MODULE_ID],
      window: {
        title: "Import Folder to Card Deck",
        icon: "fas fa-cards",
        contentClasses: ["dialog-content"]
      },
      content: htmlContent,
      buttons: [
        {
          action: "create",
          label: "Create Deck",
          default: true,
          callback: async (event, button, dialog) => {
            await DeckImporter.processDeck(dialog.element, sourceData);
          }
        },
        { action: "cancel", label: "Cancel" }
      ]
    });

    // 2. Attach Listener explicitly
    dialog.addEventListener('render', (event) => {
        const html = dialog.element;

        // --- APPLY SAVED PREFERENCES TO INPUTS ---
        if (lastFolder) {
            const folderInput = html.querySelector("input[name='folder-path']");
            if(folderInput) {
                folderInput.value = lastFolder;
                sourceData.path = lastFolder;
            }
        }
        if (lastBackImg) {
             const backInput = html.querySelector("input[name='card-back-image']");
             if(backInput) backInput.value = lastBackImg;
        }

        Common.bindFilePicker(html, ".picker-button-folder", "input[name='folder-path']", "folder", sourceData);
        Common.bindFilePicker(html, ".picker-button-image", "input[name='card-back-image']", "image", null);
    });

    // 3. Render
    dialog.render(true);
  }

  static async processDeck(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const backImg = html.querySelector("input[name='card-back-image']").value;
    const deckName = html.querySelector("#deck_name").value || "My Deck";
    
    let width = parseInt(html.querySelector("#card_width").value);
    let height = parseInt(html.querySelector("#grid_height").value);
    if (!width) width = undefined;
    if (!height) height = undefined;

    if (!folderPath) return ui.notifications.error("Select a folder path!");

    try {
        // --- SAVE LAST USED OPTIONS ---
        await game.user.setFlag(MODULE_ID, 'lastDeckFolder', {
            path: folderPath,
            activeSource: sourceData.activeSource,
            activeBucket: sourceData.activeBucket
        });
        if (backImg) await game.user.setFlag(MODULE_ID, 'lastDeckBackImage', backImg);

        const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
        const result = await FilePickerClass.browse(sourceData.activeSource, folderPath, { bucket: sourceData.activeBucket });
        
        const deck = await Cards.create({
            name: deckName,
            type: "deck",
            img: backImg || "icons/svg/card-back.svg",
            width: width,
            height: height
        });

        const cardData = result.files
            .filter(f => Common.isValidImage(f))
            .map(file => {
                const name = Common.splitPath(file);
                return {
                    name: name,
                    type: "base",
                    faces: [{ img: file, name: name }],
                    back: { img: backImg },
                    width: width,
                    height: height,
                    origin: deck.id
                };
            });

        if (cardData.length === 0) return ui.notifications.warn("No images found.");

        await deck.createEmbeddedDocuments("Card", cardData);
        
        deck.sheet.render(true);

    } catch (e) {
        Common.error(e);
        ui.notifications.error("Error creating deck.");
    }
  }
}