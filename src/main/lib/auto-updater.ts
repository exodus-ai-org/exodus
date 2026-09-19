import { app, autoUpdater, BrowserWindow } from 'electron'
import { updateElectronApp } from 'update-electron-app'

import { logger } from './logger'

export type UpdaterState =
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'available'
  | 'downloading'
  | 'ready'
  | 'error'

export interface UpdaterPayload {
  state: UpdaterState
  availableVersion: string | null
  downloadProgress: number
  errorMessage: string | null
}

let payload: UpdaterPayload = {
  state: 'idle',
  availableVersion: null,
  downloadProgress: 0,
  errorMessage: null
}

let autoUpdateEnabled = true

function broadcast() {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('updater-state-changed', payload)
  })
}

function setState(state: UpdaterState, extra?: Partial<UpdaterPayload>) {
  payload = { ...payload, state, ...extra }
  broadcast()
}

/**
 * Wires up Electron's official update.electronjs.org auto-update path for
 * Forge + GitHub Releases — the mechanism electron-forge's own docs
 * recommend for a project shaped like this one (native forge, no
 * electron-builder): https://www.electronforge.io/advanced/auto-update
 *
 * `electron-updater` (the electron-builder-ecosystem library) was
 * considered first since it's what universal-client uses, but it expects
 * `latest.yml`/blockmap metadata that only electron-builder generates —
 * forge's `make` doesn't produce it, so it wouldn't actually find updates
 * here.
 *
 * Requires: a public GitHub repo with releases published via
 * `@electron-forge/publisher-github` (see forge.config.ts), and signed
 * macOS builds — auto-update is unsupported on unsigned macOS builds,
 * which this repo doesn't do yet, so this safely no-ops there for now.
 *
 * The exported state machine keeps the same shape the renderer's update
 * panel already speaks (universal-client's electron-updater one). Squirrel —
 * what `autoUpdater` wraps — always downloads by itself and reports no
 * progress, so `available` is skipped: an update goes straight to
 * `downloading` (indeterminate) and then `ready`.
 */
export function setupAutoUpdater(autoUpdate = true): void {
  autoUpdateEnabled = autoUpdate
  if (!autoUpdate) return

  autoUpdater.on('checking-for-update', () => setState('checking'))
  autoUpdater.on('update-available', () =>
    setState('downloading', { downloadProgress: 0 })
  )
  autoUpdater.on('update-not-available', () => setState('up-to-date'))
  autoUpdater.on('update-downloaded', (_event, _notes, releaseName) =>
    setState('ready', {
      availableVersion: releaseName || null,
      downloadProgress: 100
    })
  )
  autoUpdater.on('error', (err) =>
    setState('error', { errorMessage: err.message ?? 'Unknown error' })
  )

  try {
    // Our own update panel replaces the library's native "restart now?" dialog.
    updateElectronApp({ notifyUser: false })
  } catch (err) {
    logger.warn('app', 'Auto-update not available', {
      error: String(err)
    })
  }
}

export function updaterGetState(): UpdaterPayload {
  return payload
}

export function updaterCheck(): void {
  if (!app.isPackaged) {
    setState('error', {
      errorMessage: 'Updates are only available in packaged builds'
    })
    return
  }
  if (!autoUpdateEnabled) {
    setState('error', {
      errorMessage: 'Automatic updates are turned off in settings'
    })
    return
  }
  setState('checking')
  try {
    autoUpdater.checkForUpdates()
  } catch (err) {
    setState('error', {
      errorMessage: err instanceof Error ? err.message : String(err)
    })
  }
}

/** Squirrel downloads on its own as soon as an update is found. */
export function updaterDownload(): void {}

export function updaterInstall(): void {
  autoUpdater.quitAndInstall()
}

/**
 * Squirrel can't be told to stop downloading, so this only gates manual
 * checks; the periodic check `updateElectronApp` started at launch keeps
 * running until the next launch, when the persisted setting is re-read.
 */
export function updaterSetAutoDownload(enable: boolean): void {
  autoUpdateEnabled = enable
}
