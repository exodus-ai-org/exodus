import type { IpcRendererEvent } from 'electron'

// Listeners are typed `any[]` on purpose (same as @electron-toolkit/preload):
// callers pass callbacks with concrete payload types, and `unknown[]` would
// reject them under strictFunctionTypes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type IpcListener = (event: IpcRendererEvent, ...args: any[]) => void

export interface ElectronBridge {
  ipcRenderer: {
    send: (channel: string, ...args: unknown[]) => void
    // Resolves `any` like @electron-toolkit/preload: callers pipe the result
    // straight into typed setters and validate at the IPC boundary instead.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke: (channel: string, ...args: unknown[]) => Promise<any>
    on: (channel: string, listener: IpcListener) => () => void
    once: (channel: string, listener: IpcListener) => () => void
    removeListener: (channel: string, listener: IpcListener) => void
    removeAllListeners: (channel: string) => void
  }
  process: {
    readonly platform: NodeJS.Platform
    readonly versions: NodeJS.ProcessVersions
    readonly env: NodeJS.ProcessEnv
  }
}

declare global {
  interface Window {
    electron: ElectronBridge
    api: { os: string; locale: string }
  }
}
