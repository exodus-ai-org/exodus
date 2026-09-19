import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

type Listener = (event: IpcRendererEvent, ...args: unknown[]) => void

// The subset of `@electron-toolkit/preload`'s `electronAPI` the renderer
// actually uses, in the same nested shape (`window.electron.ipcRenderer.*`,
// `window.electron.process.*`) so the renderer code ported from
// universal-client runs unchanged — without taking on the dependency.
const electron = {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) =>
      ipcRenderer.send(channel, ...args),
    invoke: (channel: string, ...args: unknown[]) =>
      ipcRenderer.invoke(channel, ...args),
    on: (channel: string, listener: Listener) => {
      ipcRenderer.on(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    once: (channel: string, listener: Listener) => {
      ipcRenderer.once(channel, listener)
      return () => {
        ipcRenderer.removeListener(channel, listener)
      }
    },
    removeListener: (channel: string, listener: Listener) => {
      ipcRenderer.removeListener(channel, listener)
    },
    removeAllListeners: (channel: string) => {
      ipcRenderer.removeAllListeners(channel)
    }
  },
  process: {
    get platform() {
      return process.platform
    },
    get versions() {
      return process.versions
    }
    // No `env`: the renderer never read it, and it handed every environment
    // variable of the launching shell (tokens, keys) to any script that gets
    // to run in a window.
  }
}

// A sandboxed preload (webPreferences.sandbox: true) can't `require('os')` —
// Electron throws "module not found: os" at load time, silently (see
// window.ts's preload-error listener, which is how this got caught). Build
// the same info from `process`, which Electron does expose in the sandbox.
function readLocale(): string {
  try {
    const v = ipcRenderer.sendSync('get-app-locale')
    return typeof v === 'string' && v ? v : 'en'
  } catch {
    return 'en'
  }
}

const api = {
  os: `${process.platform} ${process.arch} v${process.getSystemVersion()}`,
  locale: readLocale()
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electron)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // Non-isolated fallback: `window` isn't in this file's lib (preload is
  // typechecked under the Node tsconfig, not the DOM one), even though it
  // exists at runtime here. This branch isn't reachable in this app today
  // — contextIsolation is always on (window.ts) — so it's untyped on purpose.
  // @ts-expect-error window is a runtime global here, not a typed one
  window.electron = electron
  // @ts-expect-error window is a runtime global here, not a typed one
  window.api = api
}
