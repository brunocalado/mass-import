/*!
 * Mass Import Folder
 * Copyright (c) 2022 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID } from './constants.js';

// Content migrated from the retired "Journal - Mass Import" compendium
// (README! Mass Import). @UUID links point at macros-mass-import, which
// is still shipped, so the content-links keep resolving after the move.
const SCENE_CONTENT = '<p>Open the macro @UUID[Compendium.mass-import.macros-mass-import.rSs7DZ8tEuvhrO7L]{Scene Import} and pick a folder.</p><img src="modules/mass-import/docs/docs-example-scene.webp" /><p></p><h2>Notes</h2><p>The options in the dialog match the scene options. They will be applied to all imported scenes.</p>';

const DECK_CONTENT = '<p>Open the macro @UUID[Compendium.mass-import.macros-mass-import.CypEuahKU6HX3jzv]{Deck Import} and pick a folder.</p><img src="modules/mass-import/docs/docs-example-deck.webp" /><p></p><h2>Notes</h2><ul><li><p>The Card Back is an image which will be applied to all cards.</p></li><li><p>If you leave Width or Height with zero it will not add any dimension to the cards.</p></li></ul>';

const JOURNAL_CONTENT = '<p>Open the macro @UUID[Compendium.mass-import.macros-mass-import.XqbrduL3l6hefq15]{Journal Import} and pick a folder.</p><p></p><h2>Import Images</h2><img src="modules/mass-import/docs/docs-example-journal-image.webp" /><ol><li><p>You can import the images into one image page each (<strong>Each Image One Image Page</strong>).</p></li><li><p>You can import each image into one journal with one image page (<strong>Each Image One Journal with One Image Page</strong>).</p></li><li><p>You can add all images into one single text page (<strong>All images into One Text Page</strong>).</p></li><li><p>You can import each image into one text page (<strong>Each Image One Text Page</strong>).</p></li></ol><p></p><h2>Import PDFs</h2><img src="modules/mass-import/docs/docs-example-journal-pdf.webp" /><p></p><h2>Import Video</h2><img src="modules/mass-import/docs/docs-example-journal-video.webp" /><ol><li><p>You can import each video into one video page (<strong>Each Video One Video Page</strong>)</p></li><li><p>You can import all videos into one text page (<strong>All Video into One Text Page</strong>)</p></li></ol><p></p><h2>Notes</h2><ul><li><p>Ignore video options if aren\'t importing video</p></li></ul>';

/**
 * Standalone usage instructions, opened from the module settings menu.
 * Replaces the old "Journal - Mass Import" compendium entry so the help
 * content ships as part of the module UI instead of a world-visible pack.
 */
export class HelpDialog extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: 'mass-import-help',
    classes: [MODULE_ID],
    window: {
      title: 'Mass Import — How to Use',
      icon: 'fas fa-circle-question',
      resizable: true
    },
    position: { width: 640, height: 640 }
  };

  static PARTS = {
    content: { template: `modules/${MODULE_ID}/templates/help-dialog.hbs`, scrollable: [""] }
  };

  /** @override */
  async _prepareContext(options) {
    const enrichHTML = foundry.applications.ux.TextEditor.implementation.enrichHTML;
    const [scene, deck, journal] = await Promise.all([
      enrichHTML(SCENE_CONTENT),
      enrichHTML(DECK_CONTENT),
      enrichHTML(JOURNAL_CONTENT)
    ]);
    return { scene, deck, journal };
  }

  /** @override */
  _onRender(context, options) {
    this.element.querySelectorAll('.mi-tab').forEach(tab => {
      tab.onclick = (event) => {
        event.preventDefault();
        HelpDialog.#activateTab(this.element, tab.dataset.tab);
      };
    });
  }

  /**
   * Shows the requested tab panel and highlights its nav button.
   * @param {HTMLElement} html - The application's root element.
   * @param {string} tabName - The `data-tab` value to activate.
   * @returns {void}
   */
  static #activateTab(html, tabName) {
    html.querySelectorAll('.mi-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabName));
    html.querySelectorAll('.mi-tab-panel').forEach(p => p.classList.toggle('active', p.dataset.tabPanel === tabName));
  }
}
