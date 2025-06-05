import { electronApp, optimizer } from '@electron-toolkit/utils'
import { LOCAL_FILE_DIRECTORY } from '@shared/constants/systems'
import { app, BrowserWindow, globalShortcut } from 'electron'
import { setupAutoUpdater } from './lib/auto-updater'
import { runMigrate } from './lib/db/migrate'
import { setupIPC } from './lib/ipc'
import { createDirectory } from './lib/ipc/file-system'
import { setupMenu } from './lib/menu'
import { connectHttpServer } from './lib/server/app'
import { createWindow } from './lib/window'

app.whenReady().then(async () => {
  // Migrate PGlite
  await runMigrate()

  // Start Hono server
  const server = await connectHttpServer()
  server.start()

  // Create `LOCAL_FILE_DIRECTORY` directory if not exist
  await createDirectory(app.getPath('userData') + `/${LOCAL_FILE_DIRECTORY}`)

  // Setup menu
  setupMenu()

  // Set app user model id for windows
  electronApp.setAppUserModelId('app.yancey.exodus')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register IPCs
  setupIPC()

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
app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
