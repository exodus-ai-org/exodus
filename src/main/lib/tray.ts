import { Menu, Tray } from 'electron'

// Tray needs a raster image — Electron's nativeImage.createFromPath rejects
// SVGs on macOS. The SVG source lives in resources/iconTemplate.svg and is
// rasterized to iconStarsTemplate{,@2x,@3x}.png by `pnpm icons`. Import the
// 1x base — Electron picks @2x/@3x by filename on Retina; loading @3x
// directly makes Electron treat 66px as logical points and the menu bar
// down-scales it. The `Template` suffix tells macOS to auto-invert.
import icon from '../../../resources/iconStarsTemplate@2x.png?asset'
import { logger } from './logger'
import {
  getMainWindow,
  getQuickChatView,
  registerQuickChat,
  setQuickChatView
} from './window'

let tray: Tray | null = null

/** Open quick-chat if closed; otherwise hide+destroy it. Mirrors the
 *  `close-quick-chat` IPC handler so left-click on the tray icon flips
 *  the quick-chat window like a switch. */
function toggleQuickChat() {
  const view = getQuickChatView()
  if (!view) {
    registerQuickChat()
    return
  }
  try {
    view.hide()
    view.destroy()
  } catch (err) {
    logger.warn('app', 'Failed to close quick-chat from tray', {
      error: String(err)
    })
  }
  setQuickChatView(null)
}

/** Show + focus the main window, or hide it if it's already visible. A
 *  minimized window counts as "not visible" for UX intent — the user
 *  hitting "Show App" expects to actually see the window. */
function toggleMainWindow() {
  const win = getMainWindow()
  if (!win) return
  if (win.isVisible() && !win.isMinimized()) {
    win.hide()
    return
  }
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

function buildContextMenu(): Menu {
  const win = getMainWindow()
  const visible = !!win && win.isVisible() && !win.isMinimized()
  return Menu.buildFromTemplate([
    {
      label: visible ? 'Hide App' : 'Show App',
      click: toggleMainWindow,
      enabled: !!win
    },
    { type: 'separator' },
    { role: 'quit', label: 'Quit Exodus' }
  ])
}

export function setTray() {
  if (tray) return
  try {
    tray = new Tray(icon)
    tray.addListener('click', toggleQuickChat)
    // Rebuild on each right-click so the Show/Hide label tracks current
    // window visibility — Electron caches a Menu set via setContextMenu,
    // so popUpContextMenu(buildContextMenu()) is the dynamic-label path.
    tray.addListener('right-click', () => {
      tray?.popUpContextMenu(buildContextMenu())
    })
  } catch (err) {
    logger.error('app', 'Failed to create tray icon', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
  }
}

export function destroyTray() {
  if (tray) {
    try {
      tray.destroy()
    } catch (err) {
      logger.warn('app', 'Failed to destroy tray icon', {
        error: String(err)
      })
    }
    tray = null
  }
}

export function getTray(): Tray | null {
  return tray
}
