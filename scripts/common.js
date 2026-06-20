import { MODULE_ID } from './constants.js';

/**
 * Utility class for common operations
 */
export class Common {

  /**
   * Log message to console only if Debug setting is enabled
   */
  static log(...args) {
    try {
        if (game.settings.get(MODULE_ID, 'debug')) {
            console.log("Mass Import |", ...args);
        }
    } catch (e) {
    }
  }

  /**
   * Log error to console only if Debug setting is enabled
   */
  static error(...args) {
    try {
        if (game.settings.get(MODULE_ID, 'debug')) {
            console.error("Mass Import |", ...args);
        }
    } catch (e) {}
  }

  /**
   * Cleans a file path to return a readable name
   * @param {string} str - The file path
   * @returns {string} The cleaned name
   */
  static splitPath(str) {
    if (!str) return "";
    let imageName = str.split('\\').pop().split('/').pop();
    imageName = imageName.substring(0, imageName.lastIndexOf('.')) || imageName;
    imageName = imageName.replace(/[_-]/g, " ");
    return decodeURI(imageName);
  }

  /**
   * Helper to attach FilePicker to an input
   * @param {HTMLElement} html - The dialog html element
   * @param {string} triggerSelector - CSS selector for the button
   * @param {string} inputSelector - CSS selector for the input to update
   * @param {string} type - FilePicker type (folder, image, etc)
   * @param {object} sourceData - Object to store current source config
   */
  static bindFilePicker(html, triggerSelector, inputSelector, type, sourceData) {
    const button = html.querySelector(triggerSelector);
    const input = html.querySelector(inputSelector);

    if (!button) {
        Common.error(`Button not found for selector: ${triggerSelector}`);
        return;
    }
    if (!input) {
        Common.error(`Input not found for selector: ${inputSelector}`);
        return;
    }

    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();

      const FilePickerClass = foundry.applications.apps.FilePicker.implementation ?? foundry.applications.apps.FilePicker;
      const fp = new FilePickerClass({
        type: type,
        current: input.value,
        callback: (path) => {
          input.value = path;
          if (sourceData) {
            sourceData.activeSource = fp.activeSource;
            sourceData.activeBucket = fp.source?.bucket ?? '';
            sourceData.path = path;
          }
        }
      });
      fp.render(true);
    };
  }

  /**
   * @param {string} path
   * @returns {boolean}
   */
  static isValidImage(path) {
    return /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i.test(path);
  }

  /**
   * @param {string} path
   * @returns {boolean}
   */
  static isValidPDF(path) {
    return /\.pdf$/i.test(path);
  }

  /**
   * @param {string} path
   * @returns {boolean}
   */
  static isValidVideo(path) {
    return /\.(webm|mp4|m4v|ogg)$/i.test(path);
  }
}