import { Common } from './common.js';
import { MODULE_ID } from './constants.js';

export class SceneImporter {

  static async imageToScene() {
    Common.log('Scene Importer opened');
    const templatePath = `modules/${MODULE_ID}/templates/image-to-scene-dialog.hbs`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});

    const sourceData = {
      activeSource: 'data',
      activeBucket: '',
      path: ''
    };

    // --- LOAD SAVED PREFERENCE ---
    const lastFolder = game.user.getFlag(MODULE_ID, 'lastSceneFolder') || '';

    // 1. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      classes: [MODULE_ID],
      window: {
        title: "Import Images/Videos to Scenes",
        icon: "fas fa-map",
        contentClasses: ["dialog-content"]
      },
      content: htmlContent,
      buttons: [
        {
          action: "create",
          label: "Create Scenes",
          icon: "fas fa-check",
          default: true,
          callback: async (event, button, dialog) => {
             const html = dialog.element;
             await SceneImporter.processImport(html, sourceData);
          }
        },
        { action: "cancel", label: "Cancel", icon: "fas fa-times" }
      ]
    });

    // 2. Attach Listener explicitly
    dialog.addEventListener('render', (event) => {
        const html = dialog.element;
        
        // --- APPLY PREFERENCE TO INPUT ---
        if (lastFolder) {
            const folderInput = html.querySelector("input[name='folder-path']");
            if (folderInput) {
                folderInput.value = lastFolder;
                sourceData.path = lastFolder;
            }
        }

        // Bind FilePicker
        Common.bindFilePicker(html, ".picker-button", "input[name='folder-path']", "folder", sourceData);
        
        const range = html.querySelector("#grid_alpha");
        const rangeOut = html.querySelector(".range-value");
        if(range && rangeOut) range.addEventListener('input', e => rangeOut.textContent = e.target.value);
    });

    // 3. Render
    dialog.render(true);
  }

  static async processImport(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const folderName = html.querySelector("#folderName").value || "Imported Scenes";

    if (!folderPath) {
      ui.notifications.error("Mass Import: Please select a folder path.");
      return;
    }

    try {
      // --- SAVE LAST USED FOLDER ---
      await game.user.setFlag(MODULE_ID, 'lastSceneFolder', folderPath);

      // Find or Create Folder
      let folder = game.folders.find(f => f.name === folderName && f.type === "Scene");
      if (!folder) {
        folder = await Folder.create({ name: folderName, type: "Scene" });
      }

      const browseOptions = { bucket: sourceData.activeBucket || '' };
      
      const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
      const filesResult = await FilePickerClass.browse(sourceData.activeSource, folderPath, browseOptions);
      
      if (!filesResult.files || filesResult.files.length === 0) {
        ui.notifications.warn("Mass Import: No files found in the selected folder.");
        return;
      }

      // Collect Defaults
      const defaults = {
        folder: folder.id,
        grid: {
            type: parseInt(html.querySelector("select[name='select_grid_type']").value),
            alpha: parseFloat(html.querySelector("#grid_alpha").value),
            distance: parseFloat(html.querySelector("#grid_distance").value),
            units: html.querySelector("#grid_units").value,
            size: parseInt(html.querySelector("#grid_size").value)
        },
        navigation: html.querySelector("input[name='select_navigation']").checked,
        backgroundColor: html.querySelector("#background_color").value,
        tokenVision: html.querySelector("input[name='token_vision']").checked,
        fogExploration: html.querySelector("input[name='fog_exploration']").checked
      };

      // Filter valid files first to get accurate count for progress bar
      const validFiles = filesResult.files.filter(filePath => 
          Common.isValidImage(filePath) || Common.isValidVideo(filePath)
      );
      const total = validFiles.length;

      if (total === 0) {
          ui.notifications.warn("Mass Import: No valid images or videos found.");
          return;
      }

      // --- PROGRESS BAR START ---
      const progressNotice = ui.notifications.info(
          `Mass Import: Starting (0/${total})`, 
          { progress: true }
      );

      let count = 0;
      for (let i = 0; i < total; i++) {
        const filePath = validFiles[i];
        
        try {
            await SceneImporter.createScene(filePath, defaults);
            count++;
        } catch (innerErr) {
            Common.error(`Failed to import ${filePath}:`, innerErr);
        }

        // Update Progress
        const percent = (i + 1) / total;
        progressNotice.update({
            pct: percent,
            message: `Mass Import: Processing (${i + 1}/${total})`
        });
      }

      // --- PROGRESS BAR END ---
      progressNotice.update({
          pct: 1,
          message: `Mass Import: ${count} scenes created successfully!`
      });

    } catch (err) {
      Common.error(err);
      ui.notifications.error("Mass Import: An error occurred. Check console (F12) if debug is enabled.");
    }
  }

  static async createScene(filePath, defaults) {
    const { width, height } = await SceneImporter.#getImageDimensions(filePath);

    const sceneData = {
      name: Common.splitPath(filePath),
      width: width,
      height: height,
      initialLevel: "defaultLevel0000",
      levels: [{
        _id: "defaultLevel0000",
        name: "Level",
        background: { src: filePath }
      }],
      grid: { ...defaults.grid },
      padding: 0.25,
      folder: defaults.folder,
      fog: { mode: defaults.fogExploration ? 1 : 0 },
      tokenVision: defaults.tokenVision,
      backgroundColor: defaults.backgroundColor,
      navigation: defaults.navigation
    };

    return await Scene.create(sceneData);
  }

  /**
   * Resolves pixel dimensions of an image file using a browser Image element.
   * Videos always return the fallback since Image cannot decode them.
   * @param {string} src - Relative or absolute file path
   * @returns {Promise<{width: number, height: number}>}
   */
  static async #getImageDimensions(src) {
    if (Common.isValidVideo(src)) return { width: 1920, height: 1080 };
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1920, height: img.naturalHeight || 1080 });
      img.onerror = () => resolve({ width: 1920, height: 1080 });
      img.src = src;
    });
  }
}