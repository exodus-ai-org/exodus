import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, globalShortcut, powerMonitor } from 'electron'

import { migrateSharedArtifacts } from './lib/ai/artifacts-migration'
import { setupAutoUpdater } from './lib/auto-updater'
import { startBackupScheduler } from './lib/backup'
import { pglite } from './lib/db/db'
import { runMigrate } from './lib/db/migrate'
import {
  cleanupStaleRunningTasks,
  cleanupStaleWaitingTasks
} from './lib/db/philharmonic-queries'
import { getSettings } from './lib/db/queries'
import { setupIPC } from './lib/ipc'
import { IdleWatcher } from './lib/lock/idle-watcher'
import { setLockIdleWatcher } from './lib/lock/ipc'
import { readConfig as readLockConfig } from './lib/lock/lock-config'
import { getLockManager } from './lib/lock/lock-manager'
import { hasPin as lockHasPin } from './lib/lock/pin-store'
import { cleanupOldLogs, logger } from './lib/logger'
import { setupMenu } from './lib/menu'
import { migrateFromLegacyLocation } from './lib/paths'
import { applyProxy } from './lib/proxy'
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

  // One-time migration of legacy `shared/` artifacts into per-chat folders
  await migrateSharedArtifacts().catch((err) => {
    logger.warn('app', 'Failed to migrate legacy artifacts', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
  })

  cleanupOldLogs()
  await cleanupStaleWaitingTasks().catch((err) => {
    logger.warn('app', 'Failed to cleanup stale waiting tasks', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
  })
  await cleanupStaleRunningTasks().catch((err) => {
    logger.warn('app', 'Failed to cleanup stale running tasks', {
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

  // ── Lock screen ─────────────────────────────────────────────
  const lockManager = getLockManager()
  const lockCfg = readLockConfig()

  // Lock on launch (only if a PIN exists and the setting is on).
  if (lockCfg.lockOnLaunch && lockHasPin()) {
    lockManager.lock('launch')
  }

  // Idle auto-lock watcher.
  const idleWatcher = new IdleWatcher(lockManager)
  setLockIdleWatcher(idleWatcher)
  idleWatcher.start()

  // Lock on system sleep / screen lock.
  const lockOnSleep = () => {
    if (readLockConfig().lockOnSystemSleep) lockManager.lock('system-sleep')
  }
  powerMonitor.on('suspend', lockOnSleep)
  powerMonitor.on('lock-screen', lockOnSleep)

  const dbSettings = await getSettings()
  applyProxy(dbSettings.proxy)
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
let hasClosedPglite = false
app.on('will-quit', (event) => {
  globalShortcut.unregisterAll()

  // Ensure a clean Postgres shutdown (which always performs a shutdown
  // checkpoint) before the process exits, so the on-disk data directory is
  // left in a consistent, restorable state regardless of the periodic
  // auto-checkpoint interval. will-quit fires once; guard against
  // re-entering after we re-trigger app.quit() below.
  if (hasClosedPglite || pglite.closed) return
  event.preventDefault()
  pglite
    .close()
    .catch((err) => {
      logger.error('app', 'Failed to close PGlite cleanly on quit', {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
    })
    .finally(() => {
      hasClosedPglite = true
      app.quit()
    })
})
