import { dialog } from 'electron'
import { autoUpdater, UpdateDownloadedEvent } from 'electron-updater'

export function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', () => {
    console.log('🟡 Update available.')
  })

  autoUpdater.on('update-downloaded', (data: UpdateDownloadedEvent) => {
    const result = dialog.showMessageBoxSync({
      type: 'info',
      title: 'Update Available',
      message: `The new version(v${data.version}) has been downloaded. Would you like to restart and install it now?`,
      buttons: ['Install Now', 'Later']
    })

    if (result === 0) {
      autoUpdater.quitAndInstall()
    }
  })

  autoUpdater.on('error', (err) => {
    console.error('❌ Auto-updater error:', err)
  })

  autoUpdater.checkForUpdates()
}
