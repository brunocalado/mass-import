const moduleName = 'mass-import';

import { deckImporter } from './deck-importer.js'
import { journalImporter } from './journal-importer.js'
import { sceneImporter } from './scene-importer.js'

Hooks.once('init', () => {
  // --------------------------------------------------
  // Load API
  game.modules.get(moduleName).deck = { deckImporter }; // Request with: const deckImporter = game.modules.get('mass-import')?.deck.deckImporter;
  game.modules.get(moduleName).journal = { journalImporter }; // Request with: const journalImporter = game.modules.get('mass-import')?.journal.journalImporter;
  game.modules.get(moduleName).scene = { sceneImporter }; // Request with: const sceneImporter = game.modules.get('mass-import')?.scene.sceneImporter;

  // --------------------------------------------------
  // SETTINGS
  
  
}); // END HOOKS

