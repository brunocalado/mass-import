import { Common } from './common.js';
import { MODULE_ID } from './constants.js';

export class JournalImporter {

  static async imageToJournal() {
    Common.log('Journal Importer opened');
    const templatePath = `modules/${MODULE_ID}/templates/image-to-journal-dialog.hbs`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});
    const sourceData = { activeSource: 'data', activeBucket: '', path: '' };

    // 1. Load User Preferences (Defaults if none exist)
    const savedConfig = game.user.getFlag(MODULE_ID, 'journalConfig') || {};
    const defaults = foundry.utils.mergeObject({
        path: '',
        activeSource: 'data',
        activeBucket: '',
        mode: 0,
        journalName: 'Mass Import Journal',
        folderName: 'Mass Import',
        width: '',
        height: '',
        video: { controls: true, loop: true, autoplay: true }
    }, savedConfig);

    // 2. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      classes: [MODULE_ID],
      window: {
        title: "Mass Journal Import",
        icon: "fas fa-book-open",
        contentClasses: ["dialog-content"]
      },
      content: htmlContent,
      buttons: [
        {
          action: "import",
          label: "Start Import",
          default: true,
          callback: (event, button, dialog) => JournalImporter.dispatchImport(dialog.element, sourceData)
        },
        { action: "cancel", label: "Cancel" }
      ]
    });

    // 3. Attach Listener explicitly & Populate Fields
    dialog.addEventListener('render', (event) => {
        const html = dialog.element;
        
        // Populate inputs with saved defaults
        if (defaults.path) {
            html.querySelector("input[name='folder-path']").value = defaults.path;
            sourceData.path = defaults.path; 
        }
        
        sourceData.activeSource = defaults.activeSource || 'data';
        sourceData.activeBucket = defaults.activeBucket || '';

        const modeSelect = html.querySelector("select[name='select_import_type']");
        if (modeSelect) modeSelect.value = defaults.mode;

        const journalInput = html.querySelector("#journal_name");
        if (journalInput) journalInput.value = defaults.journalName;

        const folderInput = html.querySelector("#folder_name");
        if (folderInput) folderInput.value = defaults.folderName;

        const widthInput = html.querySelector("#width_name");
        if (widthInput) widthInput.value = defaults.width;

        const heightInput = html.querySelector("#height_name");
        if (heightInput) heightInput.value = defaults.height;

        // Video checkboxes
        if (html.querySelector("input[name='video_controls']")) 
            html.querySelector("input[name='video_controls']").checked = defaults.video.controls;
        if (html.querySelector("input[name='video_loop']")) 
            html.querySelector("input[name='video_loop']").checked = defaults.video.loop;
        if (html.querySelector("input[name='video_autoplay']")) 
            html.querySelector("input[name='video_autoplay']").checked = defaults.video.autoplay;

        // Bind FilePicker
        Common.bindFilePicker(html, ".picker-button", "input[name='folder-path']", "folder", sourceData);
    });

    // 4. Render
    dialog.render(true);
  }

  static async dispatchImport(html, sourceData) {
    const config = JournalImporter.extractConfig(html);
    if (!config.path) return ui.notifications.error("Path is required.");

    // Save preferences for next time (include browse source for S3)
    await game.user.setFlag(MODULE_ID, 'journalConfig', {
      ...config,
      activeSource: sourceData.activeSource,
      activeBucket: sourceData.activeBucket
    });

    try {
        const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
        const result = await FilePickerClass.browse(sourceData.activeSource, config.path, { bucket: sourceData.activeBucket });
        
        let files = result.files;
        
        if (!files.length) return ui.notifications.warn("No files found.");

        // Filter files based on mode to ensure we don't import wrong types
        if (config.mode === 4) {
            // PDF Mode
            files = files.filter(f => Common.isValidPDF(f));
        } else if (config.mode === 5 || config.mode === 6) {
            // Video Modes
            files = files.filter(f => Common.isValidVideo(f));
        } else {
            // Image Modes
            files = files.filter(f => Common.isValidImage(f));
        }

        if (!files.length) return ui.notifications.warn("No matching files found for the selected mode.");

        let folder = game.folders.find(f => f.name === config.folderName && f.type === "JournalEntry");
        if (!folder) folder = await Folder.create({ name: config.folderName, type: "JournalEntry" });
        config.folderId = folder.id;

        ui.notifications.info(`Starting import of ${files.length} items...`);

        switch(config.mode) {
            case 0: await JournalImporter.createOneJournalWithPages(files, config, "image"); break;
            case 1: await JournalImporter.createSeparateJournals(files, config, "image"); break;
            case 2: await JournalImporter.createOneJournalTextGallery(files, config, false); break;
            case 3: await JournalImporter.createOneJournalTextGallery(files, config, true); break;
            case 4: await JournalImporter.createOneJournalWithPages(files, config, "pdf"); break;
            case 5: await JournalImporter.createOneJournalWithPages(files, config, "video"); break;
            case 6: await JournalImporter.createOneJournalTextGallery(files, config, true, "video"); break;
            case 7: await JournalImporter.createOneJournalFlexLayout(files, config); break;
        }
        ui.notifications.info("Import Complete!");

    } catch (e) {
        Common.error(e);
        ui.notifications.error("Import failed.");
    }
  }

  static extractConfig(html) {
    return {
        path: html.querySelector("input[name='folder-path']")?.value ?? '',
        mode: parseInt(html.querySelector("select[name='select_import_type']")?.value ?? '0'),
        journalName: html.querySelector("#journal_name")?.value ?? 'Mass Import Journal',
        folderName: html.querySelector("#folder_name")?.value ?? 'Mass Import',
        width: html.querySelector("#width_name")?.value ?? '',
        height: html.querySelector("#height_name")?.value ?? '',
        video: {
            controls: html.querySelector("input[name='video_controls']")?.checked ?? true,
            loop: html.querySelector("input[name='video_loop']")?.checked ?? true,
            autoplay: html.querySelector("input[name='video_autoplay']")?.checked ?? true
        }
    };
  }

  // --- Logic Methods ---

  static async createOneJournalWithPages(files, config, type) {
    const pages = files.map(file => {
        const name = Common.splitPath(file);
        const pageData = { name: name, type: type, src: file, title: { show: false } };
        
        if (type === 'image') pageData.image = { caption: name };
        if (type === 'video') pageData.video = config.video;
        
        return pageData;
    });

    await JournalEntry.create({
        name: config.journalName,
        folder: config.folderId,
        pages: pages
    });
  }

  static async createSeparateJournals(files, config, type) {
    const documentsData = files.map(file => {
        const name = Common.splitPath(file);
        return {
            name: name,
            folder: config.folderId,
            pages: [{
                name: name,
                type: type,
                src: file,
                image: { caption: name }
            }]
        };
    });
    await JournalEntry.implementation.createDocuments(documentsData);
  }

  static async createOneJournalTextGallery(files, config, singlePage, mediaType='image') {
     let pages = [];
     
     const buildTag = (src) => {
         let style = "";
         if (config.width) style += `width:${config.width}px;`;
         if (config.height) style += `height:${config.height}px;`;
         
         if (mediaType === 'video') {
            return `<video src="${src}" ${style} controls></video>`;
         }
         return `<img src="${src}" style="${style}">`;
     };

     if (singlePage) {
         const content = files.map(f => buildTag(f)).join("<br>");
         pages.push({ name: "Gallery", type: "text", text: { content, format: 1 } });
     } else {
         pages = files.map(f => ({
             name: Common.splitPath(f),
             type: "text",
             text: { content: buildTag(f), format: 1 }
         }));
     }

     await JournalEntry.create({
        name: config.journalName,
        folder: config.folderId,
        pages: pages
     });
  }

  static async createOneJournalFlexLayout(files, config) {
    const itemsHtml = files.map(file => `
    <div style="flex: 1 1 150px; min-width: 120px; max-width: 200px; height: 150px; overflow: hidden; border: 1px solid #333;">
        <img src="${file}" style="width: 100%; height: 100%; object-fit: cover; border: none; display: block;">
    </div>`).join("");

    const content = `
<div style="display: flex; flex-wrap: wrap; gap: 5px; width: 100%; justify-content: center;">
${itemsHtml}
</div>`;

    await JournalEntry.create({
        name: config.journalName,
        folder: config.folderId,
        pages: [{
            name: "Flex Gallery",
            type: "text",
            text: { content: content, format: 1 }
        }]
    });
  }
}