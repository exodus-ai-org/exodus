import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import {
  installExtension,
  REACT_DEVELOPER_TOOLS
} from 'electron-devtools-installer'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { runMigrate } from './lib/db/migrate'
import {
  createFolder,
  getDirectoryTree,
  getStat,
  openFileManagerApp
} from './lib/ipc/file-system'
import { connectHttpServer } from './lib/server/app'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((ext) => console.log(`✅ Added Extension:  ${ext.name}`))
      .catch((err) => console.log('❌ An error occurred: ', err))
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Migrate PGlite
  await runMigrate()

  // Start Express.js server
  const server = await connectHttpServer()
  server.start()

  // Create `LocalFiles` directory if not exist
  await createFolder(app.getPath('userData') + '/LocalFiles')

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPCs
  ipcMain.on('ping', () => console.log('pong'))
  ipcMain.on('open-file-manager-app', async (_, path: string) =>
    openFileManagerApp(path)
  )
  ipcMain.handle('get-directory-tree', async (_, path: string) =>
    getDirectoryTree(path)
  )
  ipcMain.handle('get-stat', async (_, path: string) => getStat(path))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
