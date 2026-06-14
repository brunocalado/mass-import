import { Common } from './common.js';
import { MODULE_ID, DEFAULT_FLOOR_HEIGHT } from './constants.js';

export class SceneImporter {

  static async imageToScene() {
    Common.log('Scene Importer opened');
    const base = `modules/${MODULE_ID}/templates`;

    // Pre-render BOTH mode bodies. Standard = one scene per image (default);
    // Levels = one scene whose levels[] holds every image (v14 native levels).
    const [standardHtml, levelsHtml] = await Promise.all([
      foundry.applications.handlebars.renderTemplate(`${base}/image-to-scene-dialog.hbs`, {}),
      foundry.applications.handlebars.renderTemplate(`${base}/image-to-scene-levels-dialog.hbs`, { defaultFloorHeight: DEFAULT_FLOOR_HEIGHT })
    ]);

    const sourceData = {
      activeSource: 'data',
      activeBucket: '',
      path: ''
    };

    // --- LOAD SAVED PREFERENCES ---
    const lastFolder = game.user.getFlag(MODULE_ID, 'lastSceneFolder') || '';
    if (lastFolder) sourceData.path = lastFolder;
    const startMode = game.user.getFlag(MODULE_ID, 'sceneImportMode') === 'levels' ? 'levels' : 'standard';

    // Shell = persistent mode toggle + a body whose innerHTML is swapped on toggle.
    const shell = `
      <div class="mi-mode-toggle">
        <label class="sr-switch">
          <input type="checkbox" name="levels-mode" ${startMode === 'levels' ? 'checked' : ''}>
          <span class="sr-slider"></span>
        </label>
        <div class="mi-toggle-text">
          <strong data-mode-label>${startMode === 'levels' ? 'Single Scene w/ Levels' : 'Multiple Scenes'}</strong>
          <span>Off: one scene per image. On: merge every image into one scene, each as a level.</span>
        </div>
      </div>
      <div class="mi-mode-body">${startMode === 'levels' ? levelsHtml : standardHtml}</div>
    `;

    // 1. Create Instance
    const dialog = new foundry.applications.api.DialogV2({
      classes: [MODULE_ID],
      window: {
        title: "Import Images/Videos to Scenes",
        icon: "fas fa-map",
        contentClasses: ["dialog-content"]
      },
      position: { width: 580 },
      content: shell,
      buttons: [
        {
          action: "create",
          label: startMode === 'levels' ? "Create Scene" : "Create Scenes",
          icon: "fas fa-check",
          default: true,
          callback: async (event, button, dialog) => {
             const html = dialog.element;
             const levels = html.querySelector("input[name='levels-mode']")?.checked;
             if (levels) await SceneImporter.processLevelsImport(html, sourceData);
             else await SceneImporter.processImport(html, sourceData);
          }
        },
        { action: "cancel", label: "Cancel", icon: "fas fa-times" }
      ]
    });

    // 2. Attach Listeners explicitly (the render hook fires on every render).
    dialog.addEventListener('render', () => {
        const html = dialog.element;
        SceneImporter.#bindModeListeners(html, sourceData);

        // Mode toggle: swap the body template, update labels, re-bind listeners.
        const toggle = html.querySelector("input[name='levels-mode']");
        if (toggle) toggle.onchange = async () => {
            const levels = toggle.checked;
            // Preserve a typed folder path across the body swap.
            const typed = html.querySelector("input[name='folder-path']")?.value;
            if (typed) sourceData.path = typed;

            html.querySelector(".mi-mode-body").innerHTML = levels ? levelsHtml : standardHtml;
            const label = html.querySelector("[data-mode-label]");
            if (label) label.textContent = levels ? 'Single Scene w/ Levels' : 'Multiple Scenes';
            const createBtn = html.querySelector("button[data-action='create']");
            if (createBtn) createBtn.innerHTML = `<i class="fas fa-check"></i> ${levels ? 'Create Scene' : 'Create Scenes'}`;

            await game.user.setFlag(MODULE_ID, 'sceneImportMode', levels ? 'levels' : 'standard');
            SceneImporter.#bindModeListeners(html, sourceData);
        };
    });

    // 3. Render
    dialog.render(true);
  }

  /**
   * (Re)binds the DOM listeners for whichever body template is currently mounted.
   * Idempotent — uses property-assignment handlers so it is safe to call after
   * every render and after each mode swap. Called from `_onRender` equivalent.
   * @param {HTMLElement} html - The dialog root element.
   * @param {object} sourceData - FilePicker source/bucket/path state.
   * @returns {void}
   */
  static #bindModeListeners(html, sourceData) {
    // Restore the folder path carried across mode swaps / sessions.
    const folderInput = html.querySelector("input[name='folder-path']");
    if (folderInput && !folderInput.value && sourceData.path) folderInput.value = sourceData.path;

    Common.bindFilePicker(html, ".picker-button", "input[name='folder-path']", "folder", sourceData);

    const range = html.querySelector("#grid_alpha");
    const rangeOut = html.querySelector(".range-value");
    if (range && rangeOut) range.oninput = e => rangeOut.textContent = e.target.value;

    // Levels-mode-only controls (absent in standard mode).
    const scanBtn = html.querySelector(".mi-scan-button");
    if (scanBtn) scanBtn.onclick = (event) => {
      event.preventDefault();
      SceneImporter.#scanLevelsFolder(html, sourceData);
    };

    const floorHeight = html.querySelector("#floor_height");
    if (floorHeight) floorHeight.onchange = () => SceneImporter.#recalcElevations(html);

    // Tab navigation (levels mode only).
    html.querySelectorAll(".mi-tab").forEach(tab => {
      tab.onclick = (event) => {
        event.preventDefault();
        SceneImporter.#activateTab(html, tab.dataset.tab);
      };
    });

    // Re-bind drag handles for any rows already present (e.g. after re-render).
    SceneImporter.#bindLevelDrag(html);
  }

  /**
   * Shows the requested tab panel and highlights its nav button.
   * @param {HTMLElement} html - The dialog root element.
   * @param {string} tabName - The `data-tab` value to activate.
   * @returns {void}
   */
  static #activateTab(html, tabName) {
    html.querySelectorAll(".mi-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tabName));
    html.querySelectorAll(".mi-tab-panel").forEach(p => p.classList.toggle("active", p.dataset.tabPanel === tabName));
  }

  /**
   * Enables drag-to-reorder on the level rows via their grip handles.
   * Reordering renumbers the rows and recomputes elevations so the stack
   * stays consistent. Call after rows are (re)rendered.
   * @param {HTMLElement} html - The dialog root element.
   * @returns {void}
   */
  static #bindLevelDrag(html) {
    const container = html.querySelector("#mi-levels-rows");
    if (!container) return;
    let dragged = null;

    container.querySelectorAll(".mi-level-handle").forEach(handle => {
      handle.setAttribute("draggable", "true");
      handle.ondragstart = (event) => {
        dragged = handle.closest(".mi-level-row");
        if (!dragged) return;
        dragged.classList.add("mi-dragging");
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", "");
      };
      handle.ondragend = () => {
        if (dragged) dragged.classList.remove("mi-dragging");
        dragged = null;
        SceneImporter.#renumberLevels(html);
      };
    });

    container.ondragover = (event) => {
      if (!dragged) return;
      event.preventDefault();
      const after = SceneImporter.#getRowAfter(container, event.clientY);
      if (after == null) container.appendChild(dragged);
      else container.insertBefore(dragged, after);
    };
  }

  /**
   * Finds the row that the dragged element should be inserted before, based
   * on the pointer's vertical position.
   * @param {HTMLElement} container - The rows container.
   * @param {number} y - The pointer clientY.
   * @returns {HTMLElement|null} The reference row, or null to append at end.
   */
  static #getRowAfter(container, y) {
    const rows = [...container.querySelectorAll(".mi-level-row:not(.mi-dragging)")];
    let closest = { offset: Number.NEGATIVE_INFINITY, element: null };
    for (const row of rows) {
      const box = row.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) closest = { offset, element: row };
    }
    return closest.element;
  }

  /**
   * Renumbers the level index badges to current DOM order and recomputes
   * elevations from Floor Height. Called after a drag reorder.
   * @param {HTMLElement} html - The dialog root element.
   * @returns {void}
   */
  static #renumberLevels(html) {
    html.querySelectorAll("#mi-levels-rows .mi-level-row").forEach((row, i) => {
      const idx = row.querySelector(".mi-level-idx");
      if (idx) idx.textContent = String(i);
    });
    SceneImporter.#recalcElevations(html);
  }

  /**
   * Browses the chosen folder and renders one editable row per image into the
   * levels table. First image (natural name order) = ground level.
   * @param {HTMLElement} html - The dialog root element.
   * @param {object} sourceData - FilePicker source/bucket/path state.
   * @returns {Promise<void>}
   */
  static async #scanLevelsFolder(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const container = html.querySelector("#mi-levels-rows");
    if (!folderPath) {
      ui.notifications.warn("Mass Import: Please select a folder path before scanning.");
      return;
    }
    sourceData.path = folderPath;

    try {
      const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
      const filesResult = await FilePickerClass.browse(sourceData.activeSource, folderPath, { bucket: sourceData.activeBucket || '' });

      const files = (filesResult.files || [])
        .filter(f => Common.isValidImage(f) || Common.isValidVideo(f))
        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

      if (!files.length) {
        if (container) container.innerHTML = '';
        ui.notifications.warn("Mass Import: No valid images or videos found in the selected folder.");
        return;
      }

      const h = parseInt(html.querySelector("#floor_height")?.value, 10) || DEFAULT_FLOOR_HEIGHT;
      const levels = files.map((src, i) => ({
        idx: i,
        src,
        name: Common.splitPath(src),
        bottom: i === 0 ? 0 : i * h + 1,
        top: (i + 1) * h,
        first: i === 0,
        isImage: Common.isValidImage(src)
      }));

      const rowsHtml = await foundry.applications.handlebars.renderTemplate(`modules/${MODULE_ID}/templates/scene-level-rows.hbs`, { levels });
      if (container) container.innerHTML = rowsHtml;

      // Wire reordering on the freshly rendered rows and reveal the table.
      SceneImporter.#bindLevelDrag(html);
      SceneImporter.#activateTab(html, "levels");
    } catch (err) {
      Common.error(err);
      ui.notifications.error("Mass Import: Failed to scan the folder. Check console (F12) if debug is enabled.");
    }
  }

  /**
   * Recomputes every level row's bottom/top elevation from the Floor Height
   * field. Mirrors da-level-importer's uniform recalc.
   * @param {HTMLElement} html - The dialog root element.
   * @returns {void}
   */
  static #recalcElevations(html) {
    const h = parseInt(html.querySelector("#floor_height")?.value, 10);
    if (!Number.isFinite(h) || h < 1) return;
    const rows = html.querySelectorAll("#mi-levels-rows .mi-level-row");
    rows.forEach((row, i) => {
      const bottom = row.querySelector(".mi-level-bottom");
      const top = row.querySelector(".mi-level-top");
      if (bottom) bottom.value = String(i === 0 ? 0 : i * h + 1);
      if (top) top.value = String((i + 1) * h);
    });
  }

  /**
   * Levels mode: builds ONE scene whose `levels[]` array holds every scanned
   * image as a stacked level. A single `Scene.create` — no per-file loop.
   * @param {HTMLElement} html - The dialog root element.
   * @param {object} sourceData - FilePicker source/bucket/path state.
   * @returns {Promise<void>}
   */
  static async processLevelsImport(html, sourceData) {
    const folderPath = html.querySelector("input[name='folder-path']").value;
    const folderName = html.querySelector("#folderName")?.value || "Imported Scenes";
    const sceneName = html.querySelector("#sceneName")?.value?.trim();

    if (!folderPath) {
      ui.notifications.error("Mass Import: Please select a folder path.");
      return;
    }

    const rows = [...html.querySelectorAll("#mi-levels-rows .mi-level-row")];
    if (!rows.length) {
      ui.notifications.warn("Mass Import: Click 'Scan' to load the images first.");
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

      // Collect Defaults (shared with the standard mode form fields)
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

      // Initial level = the row whose Start radio is checked (DOM order is the
      // source of truth, since rows can be drag-reordered).
      const checkedRow = html.querySelector('input[name="initialLevel"]:checked')?.closest('.mi-level-row');
      const initialIdx = checkedRow ? rows.indexOf(checkedRow) : 0;

      // Build the levels array from the (possibly edited / reordered) table rows.
      const levels = rows.map((row, i) => {
        const src = row.dataset.src;
        const name = row.querySelector(".mi-level-name")?.value?.trim() || Common.splitPath(src);
        const bottom = parseFloat(row.querySelector(".mi-level-bottom")?.value) || 0;
        const top = parseFloat(row.querySelector(".mi-level-top")?.value) || 0;
        return {
          _id: foundry.utils.randomID(),
          name,
          elevation: { bottom, top },
          background: { src },
          sort: i
        };
      });

      // Scene size comes from the first (ground) image.
      const { width, height } = await SceneImporter.#getImageDimensions(levels[0].background.src);

      const progressNotice = ui.notifications.info(
          `Mass Import: Creating scene with ${levels.length} levels...`,
          { progress: true }
      );

      const sceneData = {
        name: sceneName || Common.splitPath(folderPath) || "Imported Levels Scene",
        width,
        height,
        initialLevel: (levels[initialIdx] ?? levels[0])._id,
        levels,
        grid: { ...defaults.grid },
        padding: 0.25,
        folder: defaults.folder,
        fog: { mode: defaults.fogExploration ? 1 : 0 },
        tokenVision: defaults.tokenVision,
        backgroundColor: defaults.backgroundColor,
        navigation: defaults.navigation
      };

      await Scene.create(sceneData);

      progressNotice.update({
          pct: 1,
          message: `Mass Import: Scene "${sceneData.name}" created with ${levels.length} levels!`
      });

    } catch (err) {
      Common.error(err);
      ui.notifications.error("Mass Import: An error occurred. Check console (F12) if debug is enabled.");
    }
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