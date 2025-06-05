import { ipcMain } from 'electron'
import { connectHttpServer } from '../server/app'
import { getMainWindow, getSearchView, setSearchView } from '../window'
import {
  copyFiles,
  createDirectory,
  getDirectoryTree,
  getStat,
  getUserDataPath,
  openFileManagerApp,
  renameFile
} from './file-system'

export function setupIPC() {
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.on('open-file-manager-app', async (_, path: string) =>
    openFileManagerApp(path)
  )

  ipcMain.handle('get-directory-tree', async (_, path: string) =>
    getDirectoryTree(path)
  )

  ipcMain.handle('get-user-data-path', async () => getUserDataPath())

  ipcMain.handle('get-stat', async (_, path: string) => getStat(path))

  ipcMain.handle('create-directory', async (_, path: string) =>
    createDirectory(path)
  )

  ipcMain.handle(
    'rename-file',
    async (_, source: string, destination: string) =>
      renameFile(source, destination)
  )

  ipcMain.handle(
    'copy-files',
    async (
      _,
      sourceFiles: { name: string; buffer: ArrayBuffer }[],
      destinationDir: string
    ) => copyFiles(sourceFiles, destinationDir)
  )

  ipcMain.handle('restart-server', async () => {
    let server = await connectHttpServer()
    server.close(async () => {
      server = await connectHttpServer()
      server.start()
      getMainWindow()?.webContents.send('succeed-to-restart-server')
    })
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
