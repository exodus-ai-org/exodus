import { BrowserWindow } from 'electron'
import { autoUpdater, UpdateInfo } from 'electron-updater'

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

function broadcast() {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('updater-state-changed', payload)
  })
}

function setState(state: UpdaterState, extra?: Partial<UpdaterPayload>) {
  payload = { ...payload, state, ...extra }
  broadcast()
}

export function setupAutoUpdater(autoUpdate = true) {
  autoUpdater.autoDownload = autoUpdate
  autoUpdater.autoInstallOnAppQuit = autoUpdate
  autoUpdater.logger = null // suppress default logs

  autoUpdater.on('checking-for-update', () => {
    setState('checking')
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    setState('available', { availableVersion: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    setState('up-to-date')
  })

  autoUpdater.on('download-progress', (progress) => {
    setState('downloading', { downloadProgress: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', () => {
    setState('ready')
  })

  autoUpdater.on('error', (err) => {
    setState('error', { errorMessage: err.message ?? 'Unknown error' })
  })

  autoUpdater.checkForUpdates().catch(() => {
    // Silently ignore network errors on startup
  })
}

export function updaterGetState(): UpdaterPayload {
  return payload
}

export function updaterCheck() {
  setState('checking')
  autoUpdater.checkForUpdates().catch((err) => {
    setState('error', { errorMessage: err.message ?? 'Unknown error' })
  })
}

export function updaterDownload() {
  setState('downloading', { downloadProgress: 0 })
  autoUpdater.downloadUpdate().catch((err) => {
    setState('error', { errorMessage: err.message ?? 'Unknown error' })
  })
}

export function updaterInstall() {
  autoUpdater.quitAndInstall()
}

export function updaterSetAutoDownload(enable: boolean) {
  autoUpdater.autoDownload = enable
  autoUpdater.autoInstallOnAppQuit = enable
}
