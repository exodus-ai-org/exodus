import os from 'os'

import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

function readLocale(): string {
  try {
    const v = ipcRenderer.sendSync('get-app-locale')
    return typeof v === 'string' && v ? v : 'en'
  } catch {
    return 'en'
  }
}

// Custom APIs for renderer
const api = {
  os: `${os.type()} ${os.arch()} v${os.release()}`,
  locale: readLocale()
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
