import { join } from 'path'

import { BrowserWindow, WebContentsView, app, screen } from 'electron'

import { logger } from './logger'
import { getResourcePath } from './paths'

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

let mainWindow: BrowserWindow | null = null
let isQuitting = false

export function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1280,
    minHeight: 820,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    title: '',
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 20,
      y: 16
    },
    ...(process.platform === 'darwin'
      ? {
          vibrancy: 'sidebar' as const,
          visualEffectState: 'active' as const
        }
      : {}),
    ...(process.platform === 'linux'
      ? { icon: getResourcePath('icon.png') }
      : {}),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      sandbox: true,
      contextIsolation: true
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

  // New-window and navigation handling is installed for every webContents by
  // `hardenRenderers()` (security.ts), not per window.

  // A sandboxed preload (webPreferences.sandbox: true) that throws at load
  // time otherwise fails silently — the renderer just never gets
  // `window.electron`/`window.api`, with no error anywhere. Surface it.
  mainWindow.webContents.on('preload-error', (_event, preloadPath, error) => {
    logger.error('app', 'Preload script failed to load', {
      preloadPath,
      error: String(error),
      stack: error?.stack
    })
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL).catch((err) => {
      logger.error('app', 'Failed to load main window URL', {
        error: String(err)
      })
    })
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow
      .loadFile(
        join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
      )
      .catch((err) => {
        logger.error('app', 'Failed to load main window file', {
          error: String(err)
        })
      })
  }
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

// ── Sub-apps ────────────────────────────────────────────────────────────
// The search bar and quick-chat are separate HTML entries of the one
// renderer build (see vite.renderer.config.mts). Vite's root is the repo
// root, so their pages keep the `src/renderer/sub-apps/<name>/` prefix.

const SUB_APP_DIR = 'src/renderer/sub-apps'

const SUB_APP_WEB_PREFERENCES = {
  preload: join(__dirname, 'preload.js'),
  sandbox: true,
  contextIsolation: true
}

function loadSubApp(
  webContents: Electron.WebContents,
  name: 'searchbar' | 'quick-chat'
): void {
  const page = `${SUB_APP_DIR}/${name}/index.html`
  const onError = (err: unknown) =>
    logger.error('app', `Failed to load ${name}`, { error: String(err) })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    webContents
      .loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}/${page}`)
      .catch(onError)
  } else {
    webContents
      .loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/${page}`))
      .catch(onError)
  }
}

let searchView: WebContentsView | null = null
let quickChatView: BrowserWindow | null = null

const SEARCH_BAR_WIDTH = 418
const SEARCH_BAR_HEIGHT = 86

export function registerSearchMenu(parent: BrowserWindow): void {
  if (searchView) return

  searchView = new WebContentsView({
    webPreferences: SUB_APP_WEB_PREFERENCES
  })

  const place = () => {
    searchView?.setBounds({
      x: parent.getBounds().width - SEARCH_BAR_WIDTH,
      y: 0,
      width: SEARCH_BAR_WIDTH,
      height: SEARCH_BAR_HEIGHT
    })
  }
  place()
  parent.contentView.addChildView(searchView)

  loadSubApp(searchView.webContents, 'searchbar')

  parent.on('resize', place)

  parent.webContents.on('found-in-page', (_event, result) => {
    searchView?.webContents.send('find-in-page-result', result)
  })

  searchView.webContents.once('did-finish-load', () => {
    searchView?.webContents.focus()
  })
}

export function registerQuickChat(): void {
  if (quickChatView) return

  quickChatView = new BrowserWindow({
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: true,
    webPreferences: SUB_APP_WEB_PREFERENCES
  })

  const { width, height } = screen.getPrimaryDisplay().workArea
  quickChatView.setBounds({
    x: (width - 600) / 2,
    y: height * 0.32,
    width: 600,
    height: 54
  })

  loadSubApp(quickChatView.webContents, 'quick-chat')
}

export function getSearchView(): WebContentsView | null {
  return searchView
}

export function setSearchView(view: WebContentsView | null): void {
  searchView = view
}

export function getQuickChatView(): BrowserWindow | null {
  return quickChatView
}

export function setQuickChatView(view: BrowserWindow | null): void {
  quickChatView = view
}
