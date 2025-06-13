import { ipcMain } from 'electron'
import { connectHttpServer } from '../server/app'
import { getServer, setServer } from '../server/instance'
import { getMainWindow, getSearchView, setSearchView } from '../window'

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
}
