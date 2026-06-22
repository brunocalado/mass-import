# Mass Import

**Mass Import** streamlines your world-building process in Foundry VTT. It allows you to select a folder containing images, videos, or PDFs and automatically converts them into Foundry entities such as Scenes, Journals, or Card Decks.

Stop dragging and dropping files one by one—import entire collections in seconds.

> ☁️ **Cloud storage ready:** Import directly from your **local data**, an **Amazon S3** bucket, or **The Forge's Assets Library**. Just pick the source in the file browser when choosing your folder — Mass Import detects the active source/bucket and remembers it for next time.

<video src="https://github.com/user-attachments/assets/ad55324a-3063-4516-aa31-7ed71e4b106d" 
       controls 
       width="720"
       autoplay 
       loop 
       muted></video>

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Donate-red?style=for-the-badge&logo=buy-me-a-coffee)](https://buymeacoffee.com/mestredigital)

## 🚀 Key Features

### 🗺️ Scene Importer

Turn a folder of map images into configured Scenes instantly. A toggle switches between two modes:

* **Multiple Scenes (default):** Creates one Scene for each image in the folder.
* **Single Scene with Levels:** Merges every image in the folder into one Scene, placing each image on its own **level** (Foundry VTT V14 feature) — ideal for multi-floor dungeons and buildings. Scan the folder to list the images, then name each level, set its bottom/top elevation (auto-filled from a **Floor Height** value), drag rows to reorder them, and pick the level shown when the scene opens. The first image (natural name order) becomes the ground level.
* **Configuration:** Set grid type, size, background color, and token vision settings once, and apply them to all imported scenes (both modes).

### 🃏 Deck Importer

Perfect for custom tarot decks, playing cards, or item cards.

* **Automatic Decks:** Reads a folder of images and creates a fully populated Card Deck.
* **Custom Backs:** Select a specific image to serve as the card back for the entire deck.

### 📖 Journal Importer

The most versatile tool for lore, handouts, and assets. Now features **Smart Persistence** (remembers your last settings) and **Strict File Filtering** (only imports the correct file type for the selected mode).

* **Image Handling:**
  * **Images as image page in one journal:** Creates a single journal with one image entry per page.
  * **Image to page image in one journal:** Creates a separate Journal Entry for each image file.
  * **Image to one text page in one journal:** Embeds images vertically into standard text pages.
  * **All images in one text page:** Stacks all images in a single text page.
  * **All images in one text page side by side:** Creates a responsive, grid-based gallery of all images on a single line/page (Flex Layout).

* **PDF Support:**
  * **PDFs: convert to journal pages:** Bulk import PDFs as individual journal pages.

* **Video Support:**
  * **One video to one video page in one journal:** Import videos as native video pages with autoplay/loop options.
  * **All videos to one text page in one journal:** Embeds all videos into a single text gallery.

## 📦 Installation

1. Open Foundry VTT and go to the **Add-on Modules** tab.
2. Click **Install Module**.
3. Paste the Manifest URL:

```js   
https://raw.githubusercontent.com/brunocalado/mass-import/main/module.json
```

4. Click **Install**.

## 🛠️ How to Use

### 1. Using the Launcher (Recommended)

This module includes a **Macros - Mass Import** compendium with ready-to-use macros.

Alternatively, create a script macro with this simple command to open the launcher menu:
```javascript
MassImport.showImporters();
```

### 2. Using the API

You can also call the importers directly via the browser console or your own scripts using the global `MassImport` object:

```javascript
MassImport.scene();   // Opens Scene Importer
MassImport.journal(); // Opens Journal Importer
MassImport.deck();    // Opens Deck Importer
MassImport.SceneRescaler();
```

## 🧰 Included Macros

Check the **Macros - Mass Import** compendium for these additional utilities:

* **Regenerate Thumbnails:** Allows you to quickly regenerate thumbnails for imported scenes.
* **Universal Scene Rescaler:** Batch updates the Grid Distance, Grid Units, Light radius, and Sound radius for the current scene in a single click.

## 🤝 Community & Support

* **Suggestions:** Have an idea to improve this module? [Share it here!](https://github.com/brunocalado/mass-import/issues)
* **Bug Reports:** Found an issue? [Report it here!](https://github.com/brunocalado/mass-import/issues)

### 💎 Contributors

* [@Achoobert](https://github.com/Achoobert)

## 📜 License

* **Code License:** [GNU GPLv3](LICENSE).

