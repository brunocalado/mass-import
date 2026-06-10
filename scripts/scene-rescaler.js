import { Common } from './common.js';
import { MODULE_ID } from './constants.js';

/**
 * Handles batch rescaling of the current scene's grid distance, grid units,
 * ambient light radii, and ambient sound radii.
 */
export class SceneRescaler {

  /**
   * Entry point. Renders the rescaler dialog and executes on confirm.
   * Triggered via the MassImport.SceneRescaler() API call.
   * @returns {Promise<void>}
   */
  static async rescaleScene() {
    if (!canvas.scene) {
      ui.notifications.warn("Mass Import: No scene is currently active.");
      return;
    }

    const templatePath = `modules/${MODULE_ID}/templates/scene-rescaler-dialog.hbs`;
    const htmlContent = await foundry.applications.handlebars.renderTemplate(templatePath, {});

    const dialog = new foundry.applications.api.DialogV2({
      classes: [MODULE_ID],
      window: {
        title: "Scene Rescaler",
        icon: "fas fa-expand-arrows-alt",
        contentClasses: ["dialog-content"]
      },
      position: { width: 520 },
      content: htmlContent,
      buttons: [
        {
          action: "update",
          label: "Update Scene",
          icon: "fas fa-check",
          default: true,
          callback: async (event, button, dialog) => {
            const formData = new FormDataExtended(button.form).object;
            await SceneRescaler._executeUpdate(formData);
          }
        },
        { action: "cancel", label: "Cancel", icon: "fas fa-times" }
      ]
    });

    dialog.render(true);
  }

  /**
   * Applies the scale operation to all relevant documents in the current scene.
   * Updates AmbientLight radii, AmbientSound radii, grid distance, and grid units.
   * @param {Object} formData - Deserialized form values from FormDataExtended.
   * @returns {Promise<void>}
   */
  static async _executeUpdate(formData) {
    const operation = formData.operation;
    const factor = Number(formData.factor);
    const newGridUnit = formData.newUnit;
    const backupScene = formData.backupScene;

    if (!factor || factor <= 0) {
      ui.notifications.error("Mass Import: Invalid scale factor.");
      return;
    }

    const currentScene = canvas.scene;

    // Backup must succeed before any mutation is attempted.
    if (backupScene) {
      try {
        ui.notifications.info("Mass Import: Creating scene backup...");
        await currentScene.clone({ name: `${currentScene.name} (Backup)` }, { save: true });
      } catch (error) {
        Common.error("Scene Rescaler — Backup failed:", error);
        ui.notifications.error("Mass Import: Backup failed. Aborting to prevent data loss.");
        return;
      }
    }

    /**
     * Applies divide or multiply and rounds to two decimal places.
     * Rounding prevents floating-point drift on repeated operations.
     * @param {number} value
     * @returns {number}
     */
    const calculate = (value) => {
      const result = operation === "multiply" ? value * factor : value / factor;
      return Math.round(result * 100) / 100;
    };

    // Build embedded-document update arrays upfront so a DB error on lights
    // does not leave sounds in a partially-scaled state.
    const lightUpdates = currentScene.lights.map(light => ({
      _id: light.id,
      config: {
        bright: calculate(light.config.bright),
        dim: calculate(light.config.dim)
      }
    }));

    const soundUpdates = currentScene.sounds.map(sound => ({
      _id: sound.id,
      radius: calculate(sound.radius)
    }));

    const currentGridDist = currentScene.grid.distance;
    const newGridDist = calculate(currentGridDist);

    try {
      if (lightUpdates.length > 0) {
        await currentScene.updateEmbeddedDocuments("AmbientLight", lightUpdates);
      }

      if (soundUpdates.length > 0) {
        await currentScene.updateEmbeddedDocuments("AmbientSound", soundUpdates);
      }

      await currentScene.update({
        "grid.distance": newGridDist,
        "grid.units": newGridUnit
      });

      const symbol = operation === "multiply" ? "×" : "÷";
      ui.notifications.info(
        `Mass Import: Scene rescaled (${symbol} ${factor}). Grid distance: ${currentGridDist} → ${newGridDist}.`
      );
    } catch (error) {
      Common.error("Scene Rescaler — Update failed:", error);
      ui.notifications.error("Mass Import: An error occurred while rescaling. Check the console (F12).");
    }
  }
}
