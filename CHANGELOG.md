# 0.3.2

- [Changed] Added `Common.log()` calls to `SceneImporter.imageToScene`, `JournalImporter.imageToJournal`, and `DeckImporter.imageToDeck` — log helper now meets the ≥3 call-site threshold and provides a debug trail in the browser console when the debug setting is on

# 0.3.1

- https://github.com/brunocalado/mass-import/issues/17
- [Fixed] Scene Importer now uses the V14 `levels` schema for background images — `Scene#background` is deprecated in V14 and silently discarded; background is now set on the default level via `levels[{ background: { src } }]` with `initialLevel` pointing to it
- [Fixed] Scene Importer replaced `foundry.canvas.loadTexture` with a native `Image` element to read image dimensions — canvas texture loading requires an active scene and fails silently when none is loaded
- [Fixed] Scene Importer fog field updated from deprecated `fog.exploration` (boolean) to `fog.mode` (number) per V14 schema

# 0.3.0

- [Changed] `MODULE_ID` extracted to `scripts/constants.js` — single source of truth imported across all scripts
- [Fixed] `Common.isValidImage/PDF/Video` moved inside the class body
- [Fixed] `FilePicker.implementation` now falls back to `FilePicker` base class in all four call sites
- [Fixed] `extractConfig` in Journal Importer uses optional chaining to prevent crashes on missing DOM elements
- [Fixed] `createSeparateJournals` now uses a single batched `createDocuments()` call instead of sequential per-file creates
- [Fixed] Notification message in Scene Rescaler now shows the correct symbol (`×` or `÷`) based on the selected operation
- [Changed] Portuguese comments in Deck Importer translated to English

# 0.2.4

- https://github.com/brunocalado/mass-import/issues/15
- Universal Scene Rescaler Improved
- [Fixed] CSS isolation — dialog styles are now scoped at the ApplicationV2 root element, preventing system CSS from making text unreadable
- [Changed] Templates renamed from .html to .hbs
- [Changed] Inline styles moved from scene template to CSS classes

# 0.2.3
- Switched to foundry.applications.apps.FilePicker.implementation; to work with the forge. https://github.com/brunocalado/mass-import/issues/14

# 0.2.2
- fix: https://github.com/brunocalado/mass-import/issues/13
- removed Deprecated warnings

0.2.0
Smart Persistence: Journal Importer now automatically saves and remembers your last configuration settings (path, mode, dimensions, video options).

Strict File Filtering: Importers now strictly filter files based on the selected mode (e.g., PDF mode ignores non-PDF files in the folder) to prevent errors.

Simplified API: Added global MassImport object for easier programmatic access (e.g., MassImport.scene(), MassImport.journal()).

UX Improvements: Renamed Journal Import dropdown options to "Sentence case" for improved readability.

Documentation: Updated README and internal help journal to reflect new feature names and the Macro Launcher instructions

0.1.6
- small fix

0.1.5
- V13

0.1.4
- https://github.com/brunocalado/mass-import/issues/8

0.1.3
- S3

0.1.2
- https://github.com/brunocalado/mass-import/issues/5

0.1.1
- small fix

0.1.0
- regenerate thumbnails macro

0.0.9
- width heigh for journal import

0.0.8
- v12
- scene fix
- compedium Folder

0.0.7
- v11

0.0.6
- https://github.com/brunocalado/mass-import/issues/2
- docs

0.0.5
- https://github.com/brunocalado/mass-import/issues/1
- docs

0.0.4
- add label from images

0.0.3
name change: Mass Import Folder

0.0.2
module name change