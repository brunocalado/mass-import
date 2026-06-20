/**
 * Copy to fvtt.config.js and set userDataPath to your Foundry user data folder
 * (Foundry → Configure Settings → User Data Path).
 *
 * Examples:
 *   Windows: %localappdata%/FoundryVTT
 *   macOS:   ~/Library/Application Support/FoundryVTT
 *   Linux:   /home/$USER/.local/share/FoundryVTT
 *
 * Then: npm run watch  (dev, copies to Data/modules/mass-import)
 *       npm run build   (production, same destination)
 */

const developmentOptions = {
  userDataPath: '/Users/YOUR_USERNAME/foundrydata',
  baseURL: 'http://localhost:30000'
}

export default developmentOptions
