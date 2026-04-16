import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, globalShortcut } from 'electron'

import { setupAutoUpdater } from './lib/auto-updater'
import { startBackupScheduler } from './lib/backup'
import { cleanupStaleWaitingTasks } from './lib/db/agent-x-queries'
import { runMigrate } from './lib/db/migrate'
import { getSettings } from './lib/db/queries'
import { setupIPC } from './lib/ipc'
import { cleanupOldLogs, logger } from './lib/logger'
import { setupMenu } from './lib/menu'
import { migrateFromLegacyLocation } from './lib/paths'
import { connectHttpServer } from './lib/server/app'
import { setServer } from './lib/server/instance'
import { setTray } from './lib/tray'
import { createWindow } from './lib/window'

// Capture unhandled runtime errors into the log file
process.on('uncaughtException', (error) => {
  logger.error('app', 'Uncaught exception', {
    error: String(error),
    stack: error?.stack
  })
})

process.on('unhandledRejection', (reason) => {
  logger.error('app', 'Unhandled promise rejection', {
    error: String(reason),
    stack: reason instanceof Error ? reason.stack : undefined
  })
})

app.whenReady().then(async () => {
  // Migrate data from legacy location to ~/.exodus (one-time, idempotent)
  migrateFromLegacyLocation()

  // Migrate PGlite
  await runMigrate()
  cleanupOldLogs()
  await cleanupStaleWaitingTasks().catch((err) => {
    logger.warn('app', 'Failed to cleanup stale waiting tasks', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
  })

  // Start Hono server
  const server = await connectHttpServer()
  server.start()
  setServer(server)

  // Start backup scheduler (daily at 3:00 AM)
  startBackupScheduler()

  // Setup menu
  setupMenu()

  // Setup tray (will be conditionally created after settings are loaded)

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

  const dbSettings = await getSettings()
  setupAutoUpdater(dbSettings.autoUpdate ?? true)

  // Apply startup and menu bar settings
  app.setLoginItemSettings({ openAtLogin: dbSettings.runOnStartup ?? false })
  if (dbSettings.menuBar !== false) {
    setTray()
  }

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
