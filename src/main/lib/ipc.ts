import { existsSync } from 'fs'
import { join } from 'path'

import { app, dialog, ipcMain, nativeTheme, shell } from 'electron'

import {
  updaterCheck,
  updaterDownload,
  updaterGetState,
  updaterInstall,
  updaterSetAutoDownload
} from './auto-updater'
import { logger } from './logger'
import { getArtifactsDir, getLogsDir } from './paths'
import { destroyTray, setTray } from './tray'
import {
  getMainWindow,
  getQuickChatView,
  getSearchView,
  setQuickChatView,
  setSearchView
} from './window'

/** Wrap an IPC handler so that any thrown error is logged instead of silently lost. */
function safeHandle(
  channel: string,
  handler: (...args: unknown[]) => unknown | Promise<unknown>
) {
  ipcMain.handle(channel, async (...args) => {
    try {
      return await handler(...args)
    } catch (err) {
      logger.error('app', `IPC handler "${channel}" failed`, {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
      throw err
    }
  })
}

export function setupIPC() {
  ipcMain.on('ping', () => logger.debug('app', 'pong'))

  safeHandle('find-in-page', (_, keyword) => {
    if (keyword === '') {
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    } else {
      getMainWindow()?.webContents.findInPage(keyword as string)
    }
  })

  safeHandle('find-next', (_, keyword) => {
    if (keyword === '') {
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    } else {
      getMainWindow()?.webContents.findInPage(keyword as string, {
        findNext: true
      })
    }
  })

  safeHandle('find-previous', (_, keyword) => {
    if (keyword === '') {
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    } else {
      getMainWindow()?.webContents.findInPage(keyword as string, {
        findNext: false,
        forward: false
      })
    }
  })

  safeHandle('close-search-bar', () => {
    const searchView = getSearchView()
    if (searchView) {
      getMainWindow()?.contentView.removeChildView(searchView)
      setSearchView(null)
      getMainWindow()?.webContents.stopFindInPage('clearSelection')
    }
  })

  safeHandle('close-quick-chat', () => {
    const quickChatView = getQuickChatView()
    if (quickChatView) {
      quickChatView.hide()
      setQuickChatView(null)
      quickChatView.destroy()
    }
  })

  safeHandle('transfer-quick-chat', (_, input: unknown) => {
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

  safeHandle('bring-window-to-front', () => {
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

  safeHandle('check-fullscreen', () => getMainWindow()?.isFullScreen() ?? false)

  safeHandle('subscribe-fullscreen-change', () => {
    const win = getMainWindow()
    if (!win) return

    const send = (isFullscreen: boolean) => {
      win.webContents.send('fullscreen-changed', isFullscreen)
    }

    win.on('enter-full-screen', () => send(true))
    win.on('leave-full-screen', () => send(false))
  })

  safeHandle('set-native-theme', (_, source: unknown) => {
    nativeTheme.themeSource = source as 'dark' | 'light' | 'system'
  })

  // Skill upload: open native dialog for ZIP file or folder
  safeHandle('select-skill-path', async () => {
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

  safeHandle('open-logs-dir', () => {
    shell.openPath(getLogsDir())
  })

  safeHandle('reveal-artifact-file', (_, arg: unknown) => {
    const { chatId, artifactId } = arg as {
      chatId: string
      artifactId: string
    }
    const filePath = join(getArtifactsDir(), chatId, `${artifactId}.tsx`)
    if (existsSync(filePath)) {
      shell.showItemInFolder(filePath)
    } else {
      logger.warn('app', 'reveal-artifact-file: file missing', {
        chatId,
        artifactId,
        filePath
      })
    }
  })

  safeHandle('set-login-item', (_, enable: unknown) => {
    app.setLoginItemSettings({ openAtLogin: enable as boolean })
  })

  safeHandle('set-menu-bar', (_, enable: unknown) => {
    if (enable) {
      setTray()
    } else {
      destroyTray()
    }
  })

  safeHandle('updater-get-state', () => updaterGetState())

  safeHandle('updater-check', () => updaterCheck())

  safeHandle('updater-download', () => updaterDownload())

  safeHandle('updater-install', () => updaterInstall())

  safeHandle('updater-set-auto-download', (_, enable: unknown) =>
    updaterSetAutoDownload(enable as boolean)
  )
}
