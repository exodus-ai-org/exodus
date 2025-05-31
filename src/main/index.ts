import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { LOCAL_FILE_DIRECTORY } from '@shared/constants/systems'
import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { setupAutoUpdater } from './auto-updater'
import { runMigrate } from './lib/db/migrate'
import {
  copyFiles,
  createDirectory,
  getDirectoryTree,
  getStat,
  getUserDataPath,
  openFileManagerApp,
  renameFile
} from './lib/ipc/file-system'
import { getSystemInfo } from './lib/ipc/system-info'
import { connectHttpServer } from './lib/server/app'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  // Create the browser window.
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

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
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

  // Start Hono server
  let server = await connectHttpServer()
  server.start()

  // Create `LOCAL_FILE_DIRECTORY` directory if not exist
  await createDirectory(app.getPath('userData') + `/${LOCAL_FILE_DIRECTORY}`)

  // Set app user model id for windows
  electronApp.setAppUserModelId('app.yancey.exodus')

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
  ipcMain.handle('get-system-info', getSystemInfo)
  ipcMain.handle(
    'copy-files',
    async (
      _,
      sourceFiles: {
        name: string
        buffer: ArrayBuffer
      }[],
      destinationDir: string
    ) => copyFiles(sourceFiles, destinationDir)
  )
  ipcMain.handle('restart-server', async () => {
    server.close(async () => {
      // The optional `callback` will be called once the `'close'` event occurs.
      // So, it's time to open a new instance.
      server = await connectHttpServer()
      server.start()
      mainWindow?.webContents.send('succeed-to-restart-server')
    })
  })

  createWindow()
  setupAutoUpdater()

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
