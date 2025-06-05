import { is } from '@electron-toolkit/utils'
import { BrowserWindow, WebContentsView, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null
let searchView: WebContentsView | null = null

export function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools({ mode: 'undocked' })
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export function registerSearchMenu(mainWindow: BrowserWindow) {
  if (searchView) return

  searchView = new WebContentsView({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      transparent: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  searchView.setBounds({
    x: (mainWindow?.getBounds().width ?? 0) - 418,
    y: 0,
    width: 418,
    height: 86
  })
  mainWindow?.contentView.addChildView(searchView)

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    searchView.webContents.loadURL(
      process.env['ELECTRON_RENDERER_URL'] + '/searchbar/index.html'
    )
  } else {
    searchView.webContents.loadFile(
      join(__dirname, '../renderer/searchbar/index.html')
    )
  }

  mainWindow?.on('resize', () => {
    if (!mainWindow || !searchView) {
      return
    }
    const bounds = mainWindow.getBounds()
    searchView.setBounds({
      x: bounds.width - 418,
      y: 0,
      width: 418,
      height: 86
    })
  })

  mainWindow?.webContents.on('found-in-page', (_event, result) => {
    searchView?.webContents.send('find-in-page-result', result)
  })

  searchView.webContents.once('did-finish-load', () => {
    searchView?.webContents.focus()
  })
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function getSearchView(): WebContentsView | null {
  return searchView
}

export function setSearchView(view: WebContentsView | null) {
  searchView = view
}
