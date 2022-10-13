const moduleName = 'mass-import';
import { sceneImporter } from './scene-importer.js'
import { deckImporter } from './deck-importer.js'

Hooks.once('init', () => {
  // --------------------------------------------------
  // Load API
  game.modules.get(moduleName).scene = { sceneImporter }; // Request with: const sceneImporter = game.modules.get('mass-import')?.scene.sceneImporter;
  game.modules.get(moduleName).deck = { deckImporter }; // Request with: const deckImporter = game.modules.get('mass-import')?.deck.deckImporter;

  // --------------------------------------------------
  // SETTINGS
  
  
}); // END HOOKS

