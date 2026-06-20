import { fileURLToPath } from 'url'
import * as fs from 'fs'
import * as path from 'path'
import CopyWebpackPlugin from 'copy-webpack-plugin'
import developmentOptions from './fvtt.config.js'

const rootFolder = path.dirname(fileURLToPath(import.meta.url))

/** `webpack --mode production` → argv[3] is `production` */
const buildMode = process.argv[3] === 'production' ? 'production' : 'development'

function buildDestination() {
  try {
    const { userDataPath } = developmentOptions
    const manifestPath = path.join(rootFolder, 'module.json')
    if (fs.existsSync(manifestPath)) {
      const json = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      if (json.id && fs.existsSync(userDataPath)) {
        return path.join(userDataPath, 'Data', 'modules', json.id)
      }
    }
  } catch {
    //
  }
  return path.join(rootFolder, 'build')
}

function scriptEntries() {
  const scriptsDir = path.join(rootFolder, 'scripts')
  const entries = {}
  for (const name of fs.readdirSync(scriptsDir)) {
    if (!name.endsWith('.js')) continue
    const key = `scripts/${name.replace(/\.js$/, '')}`
    entries[key] = path.join(scriptsDir, name)
  }
  return entries
}

function copyList() {
  const list = [
    { from: 'styles', to: 'styles' },
    { from: 'templates', to: 'templates' },
    { from: 'module.json', to: 'module.json' },
    { from: 'LICENSE', to: 'LICENSE', toType: 'file' }
  ]
  if (fs.existsSync(path.join(rootFolder, 'packs'))) {
    list.push({ from: 'packs', to: 'packs' })
  }
  if (fs.existsSync(path.join(rootFolder, 'macros'))) {
    list.push({ from: 'macros', to: 'macros' })
  }
  if (fs.existsSync(path.join(rootFolder, 'README.md'))) {
    list.push({ from: 'README.md', to: 'README.md', toType: 'file' })
  }
  return list
}

export default {
  bail: buildMode === 'production',
  context: rootFolder,
  devtool: buildMode === 'development' ? 'inline-source-map' : false,
  entry: scriptEntries(),
  mode: buildMode,
  output: {
    clean: true,
    path: buildDestination(),
    filename: '[name].js'
  },
  plugins: [
    new CopyWebpackPlugin({ patterns: copyList() })
  ],
  resolve: {
    extensions: ['.js']
  },
  watch: buildMode === 'development'
}
