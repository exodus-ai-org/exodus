import { is } from '@electron-toolkit/utils'
import { BrowserWindow, WebContentsView, app, screen, shell } from 'electron'
import { join } from 'path'
import icon from '../../../resources/icon.png?asset'

let mainWindow: BrowserWindow | null = null
let searchView: WebContentsView | null = null
let shortcutChatView: BrowserWindow | null = null
let isQuitting = false

export function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    title: '',
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 16,
      y: 16
    },
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

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('activate', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    mainWindow.webContents.openDevTools({ mode: 'right' })
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

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    searchView.webContents.loadURL(
      process.env.ELECTRON_RENDERER_URL + '/searchbar/index.html'
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

export function registerShortcutChat() {
  if (shortcutChatView) return

  shortcutChatView = new BrowserWindow({
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      transparent: true,
      preload: join(__dirname, '../preload/index.js')
    }
  })

  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workArea
  shortcutChatView.setBounds({
    x: (width - 600) / 2,
    y: height * 0.32,
    width: 600,
    height: 54
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    shortcutChatView.webContents.loadURL(
      process.env.ELECTRON_RENDERER_URL + '/shortcut-chat/index.html'
    )
  } else {
    shortcutChatView.webContents.loadFile(
      join(__dirname, '../renderer/shortcut-chat/index.html')
    )
  }
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

export function getShortcutChatView(): BrowserWindow | null {
  return shortcutChatView
}

export function setShortcutChatView(view: BrowserWindow | null) {
  shortcutChatView = view
}
