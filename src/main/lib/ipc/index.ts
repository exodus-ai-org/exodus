import { app, ipcMain } from 'electron'
import { connectHttpServer } from '../server/app'
import { getServer, setServer } from '../server/instance'
import {
  getMainWindow,
  getSearchView,
  getShortcutChatView,
  setSearchView,
  setShortcutChatView
} from '../window'

export function setupIPC() {
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('restart-server', async () => {
    const oldServer = getServer()
    if (oldServer) {
      oldServer.close(async () => {
        const newServer = await connectHttpServer()
        newServer.start()
        setServer(newServer)
        getMainWindow()?.webContents.send('succeed-to-restart-server')
      })
    }
  })

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

  ipcMain.handle('close-shortcut-chat', () => {
    const shortcutChatView = getShortcutChatView()
    if (shortcutChatView) {
      shortcutChatView.destroy()
      setShortcutChatView(null)
    }
  })

  ipcMain.handle('transfer-shortcut-chat', (_, input: string) => {
    getMainWindow()?.webContents.send('shortcut-chat-input', input)
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
}
