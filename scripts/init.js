/*!
 * Mass Import Folder
 * Copyright (c) 2022 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { DeckImporter } from './deck-importer.js';
import { JournalImporter } from './journal-importer.js';
import { SceneImporter } from './scene-importer.js';
import { SceneRescaler } from './scene-rescaler.js';
import { HelpDialog } from './help-dialog.js';
import { Common } from './common.js';
import { MODULE_ID } from './constants.js';

Hooks.once('init', () => {

  // Register Debug Setting
  game.settings.register(MODULE_ID, 'debug', {
    name: 'Debug Mode',
    hint: 'If enabled, displays log messages and errors in the console (F12).',
    scope: 'client',
    config: true,
    type: Boolean,
    default: false
  });

  // Register Help menu button (opens usage instructions from the module's
  // entry in the Manage Modules / Module Settings sidebar).
  game.settings.registerMenu(MODULE_ID, 'help', {
    name: 'How to Use',
    label: 'Open Instructions',
    hint: 'Open the Mass Import usage guide (Scene, Deck, and Journal importers).',
    icon: 'fas fa-circle-question',
    type: HelpDialog,
    restricted: false
  });

  Common.log(`Initializing Mass Import Module`);

  // Define the API object with direct methods
  const api = {
    deck: () => DeckImporter.imageToDeck(),
    journal: () => JournalImporter.imageToJournal(),
    scene: () => SceneImporter.imageToScene(),
    SceneRescaler: () => SceneRescaler.rescaleScene(),
    help: () => new HelpDialog().render(true),
    showImporters: () => {
        new foundry.applications.api.DialogV2({
            window: { title: "Mass Import Launcher", icon: "fas fa-file-import" },
            content: "<p>Select the type of content you wish to import:</p>",
            buttons: [
                {
                    action: "scene",
                    label: "Scene Importer",
                    icon: "fas fa-map",
                    callback: () => SceneImporter.imageToScene()
                },
                {
                    action: "journal",
                    label: "Journal Importer",
                    icon: "fas fa-book-open",
                    callback: () => JournalImporter.imageToJournal()
                },
                {
                    action: "deck",
                    label: "Deck Importer",
                    icon: "fas fa-cards",
                    callback: () => DeckImporter.imageToDeck()
                }
            ]
        }).render(true);
    }
  };

  // Expose API via the module registration
  game.modules.get(MODULE_ID).api = api;

  // Expose a global variable for easier access (e.g., MassImport.scene())
  globalThis.MassImport = api;
});