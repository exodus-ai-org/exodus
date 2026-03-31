import { join } from 'path'

import { app, dialog, ipcMain, nativeTheme, shell } from 'electron'

// ARCHIVED: import { connectHttpServer } from './server/app'
// ARCHIVED: import { getServer, setServer } from './server/instance'
import {
  updaterCheck,
  updaterDownload,
  updaterGetState,
  updaterInstall,
  updaterSetAutoDownload
} from './auto-updater'
import { logger } from './logger'
import { destroyTray, setTray } from './tray'
import {
  getMainWindow,
  getQuickChatView,
  getSearchView,
  setQuickChatView,
  setSearchView
} from './window'

export function setupIPC() {
  ipcMain.on('ping', () => logger.debug('app', 'pong'))

  // ARCHIVED: MCP server restart IPC removed
  // ipcMain.handle('restart-server', async () => {
  //   const oldServer = getServer()
  //   if (oldServer) {
  //     oldServer.close(async () => {
  //       const newServer = await connectHttpServer()
  //       newServer.start()
  //       setServer(newServer)
  //       getMainWindow()?.webContents.send('succeed-to-restart-server')
  //     })
  //   }
  // })

  ipcMain.handle('find-in-page', (_, keyword) => {
    if (keyword === '') {
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    } else {
      getMainWindow()?.webContents.findInPage(keyword)
    }
  })

  ipcMain.handle('find-next', (_, keyword) => {
    if (keyword === '') {
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    } else {
      getMainWindow()?.webContents.findInPage(keyword, { findNext: true })
    }
  })

  ipcMain.handle('find-previous', (_, keyword) => {
    if (keyword === '') {
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    } else {
      getMainWindow()?.webContents.findInPage(keyword, {
        findNext: false,
        forward: false
      })
    }
  })

  ipcMain.handle('close-search-bar', () => {
    const searchView = getSearchView()
    if (searchView) {
      getMainWindow()?.contentView.removeChildView(searchView)
      setSearchView(null)
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    }
  })

  ipcMain.handle('close-quick-chat', () => {
    const quickChatView = getQuickChatView()
    if (quickChatView) {
      quickChatView.hide()
      setQuickChatView(null)
      quickChatView.destroy()
    }
  })

  ipcMain.handle('transfer-quick-chat', (_, input: string) => {
    // Close quick-chat window first
    const quickChatView = getQuickChatView()
    if (quickChatView) {
      quickChatView.hide()
      setQuickChatView(null)
      quickChatView.destroy()
    }

    // Bring main window to front and send input
    const mainWindow = getMainWindow()
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
      app.focus({ steal: true })
      mainWindow.webContents.send('quick-chat-input', input)
    }
  })

  ipcMain.handle('bring-window-to-front', () => {
    const mainWindow = getMainWindow()
    if (!mainWindow) return

    if (mainWindow.isMinimized()) {
      mainWindow.restore()
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show()
    }

    mainWindow.focus()

    app.focus({ steal: true })
  })

  ipcMain.handle(
    'check-fullscreen',
    () => getMainWindow()?.isFullScreen() ?? false
  )

  ipcMain.handle('subscribe-fullscreen-change', () => {
    const win = getMainWindow()
    if (!win) return

    const send = (isFullscreen: boolean) => {
      win.webContents.send('fullscreen-changed', isFullscreen)
    }

    win.on('enter-full-screen', () => send(true))
    win.on('leave-full-screen', () => send(false))
  })

  ipcMain.handle(
    'set-native-theme',
    (_, source: 'dark' | 'light' | 'system') => {
      nativeTheme.themeSource = source
    }
  )

  // Skill upload: open native dialog for ZIP file or folder
  ipcMain.handle('select-skill-path', async () => {
    const win = getMainWindow()
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      title: 'Install Skill',
      buttonLabel: 'Install',
      properties: ['openFile', 'openDirectory'],
      filters: [{ name: 'Skill Package', extensions: ['zip'] }]
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('open-logs-dir', () => {
    const dir = join(app.getPath('userData'), 'logs')
    shell.openPath(dir)
  })

  ipcMain.handle('set-login-item', (_, enable: boolean) => {
    app.setLoginItemSettings({ openAtLogin: enable })
  })

  ipcMain.handle('set-menu-bar', (_, enable: boolean) => {
    if (enable) {
      setTray()
    } else {
      destroyTray()
    }
  })

  ipcMain.handle('updater-get-state', () => updaterGetState())
  ipcMain.handle('updater-check', () => updaterCheck())
  ipcMain.handle('updater-download', () => updaterDownload())
  ipcMain.handle('updater-install', () => updaterInstall())
  ipcMain.handle('updater-set-auto-download', (_, enable: boolean) =>
    updaterSetAutoDownload(enable)
  )
}
