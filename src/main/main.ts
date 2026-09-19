import { app, BrowserWindow, globalShortcut, powerMonitor } from 'electron'
import started from 'electron-squirrel-startup'

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
import { initMainI18n } from './lib/i18n'
import { setupIPC } from './lib/ipc'
import { IdleWatcher } from './lib/lock/idle-watcher'
import { setLockIdleWatcher } from './lib/lock/ipc'
import { readConfig as readLockConfig } from './lib/lock/lock-config'
import { getLockManager } from './lib/lock/lock-manager'
import { hasPin as lockHasPin } from './lib/lock/pin-store'
import { cleanupOldLogs, logger } from './lib/logger'
import { setupMenu } from './lib/menu'
import { getExodusHome, migrateFromLegacyLocation } from './lib/paths'
import { connectHttpServer } from './lib/server/app'
import { getServer, setServer } from './lib/server/instance'
import { destroyTray, setTray } from './lib/tray'
import { createWindow } from './lib/window'

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit()
}

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

app.on('ready', async () => {
  // Migrate data from the legacy location to ~/.exodus (one-time, idempotent).
  // Also creates the ~/.exodus directory tree.
  migrateFromLegacyLocation()
  cleanupOldLogs()

  // Which data directory this run uses (~/.exodus unless EXODUS_HOME says
  // otherwise, see paths.ts) — the first thing to check if data seems missing.
  logger.info('app', 'Data directory', {
    dir: getExodusHome(),
    packaged: app.isPackaged
  })

  app.setAppUserModelId('app.yancey.exodus')

  // Must run before setupIPC() / createWindow() — both assume the schema
  // is already migrated once a renderer can issue DB queries.
  await runMigrate()

  // Resolves the effective locale from settings + OS and registers the
  // get/set-app-locale IPC. Must run after migrations (it reads settings)
  // and before setupMenu() and createWindow() — both read the resolved
  // locale (menu labels via mainT(), the renderer via window.api.locale
  // from preload).
  await initMainI18n().catch((err) => {
    logger.error(
      'i18n',
      'Failed to initialize main-process i18n; continuing with English defaults',
      { error: String(err) }
    )
  })

  // One-time migration of legacy `shared/` artifacts into per-chat folders
  await migrateSharedArtifacts().catch((err) => {
    logger.warn('app', 'Failed to migrate legacy artifacts', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
  })

  // One-time reconciliation of tasks orphaned by a previous process crash
  // (see cleanupStaleRunningTasks's doc comment). Runs after migrations so
  // the `task` table is guaranteed to exist.
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

  setupMenu()

  // F12 opens/closes DevTools, and reload (CmdOrCtrl+R) / force reload
  // (CmdOrCtrl+Shift+R) stay enabled in packaged builds too, for debugging
  // production-only issues in the field. Cmd/Ctrl+- and Cmd/Ctrl+Shift+=
  // (zoom) stay blocked.
  app.on('browser-window-created', (_, window) => {
    window.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return
      if (input.code === 'F12') {
        if (window.webContents.isDevToolsOpened()) {
          window.webContents.closeDevTools()
        } else {
          window.webContents.openDevTools({ mode: 'undocked' })
        }
      }
      if (input.code === 'Minus' && (input.control || input.meta)) {
        event.preventDefault()
      }
      if (
        input.code === 'Equal' &&
        input.shift &&
        (input.control || input.meta)
      ) {
        event.preventDefault()
      }
    })
  })

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

  // Settings-driven startup behavior
  const dbSettings = await getSettings()
  setupAutoUpdater(dbSettings.autoUpdate ?? true)
  app.setLoginItemSettings({ openAtLogin: dbSettings.runOnStartup ?? false })
  if (dbSettings.menuBar !== false) {
    setTray()
  }

  app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
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

let hasClosedPglite = false
const PGLITE_CLOSE_TIMEOUT_MS = 5000
app.on('will-quit', (event) => {
  destroyTray()
  globalShortcut.unregisterAll()

  // Ensure a clean Postgres shutdown (which always performs a shutdown
  // checkpoint) before the process exits, so the on-disk data directory is
  // left in a consistent, restorable state regardless of the periodic
  // auto-checkpoint interval. will-quit fires once; guard against
  // re-entering below.
  if (hasClosedPglite || pglite.closed) return
  event.preventDefault()

  // Release the server port up front: a restart-on-edit dev loop spawns the
  // new instance immediately and would otherwise crash with EADDRINUSE while
  // this one is still shutting down.
  getServer()?.close()

  // PGlite's WASM teardown can hang (known flaky area), and this process also
  // has cron jobs (initJobQueue, the Philharmonic scheduler, the backup
  // scheduler) and the idle-watcher's setInterval that are never stopped —
  // any one of those can keep Node's event loop alive indefinitely.
  // `app.quit()` only asks Electron to run its normal quit lifecycle; it does
  // not force the OS process to exit if something is still keeping the event
  // loop alive. Race the close against a timeout, then force-exit
  // unconditionally so the process is *guaranteed* to terminate.
  let timedOut = false
  const timeout = new Promise<void>((resolve) => {
    setTimeout(() => {
      timedOut = true
      resolve()
    }, PGLITE_CLOSE_TIMEOUT_MS)
  })
  Promise.race([
    pglite.close().catch((err) => {
      logger.error('app', 'Failed to close PGlite cleanly on quit', {
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
    }),
    timeout
  ])
    .then(() => {
      if (timedOut) {
        logger.error(
          'app',
          `PGlite did not close within ${PGLITE_CLOSE_TIMEOUT_MS}ms on quit; forcing exit anyway`
        )
      }
    })
    .finally(() => {
      hasClosedPglite = true
      app.exit()
    })
})
