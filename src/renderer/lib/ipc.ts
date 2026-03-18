import { IpcRendererEvent, Result } from 'electron'

export function bringWindowToFront() {
  return window.electron.ipcRenderer.invoke('bring-window-to-front')
}

export function subscribeQuickChatInput(
  callback: (_: IpcRendererEvent, input: string) => Promise<void>
) {
  window.electron.ipcRenderer.on('quick-chat-input', callback)
}

// ARCHIVED: MCP server restart IPC removed
// export function restartServer() {
//   return window.electron.ipcRenderer.invoke('restart-server')
// }
// export function subscribeSucceedToRestartServer(callback: () => void) {
//   window.electron.ipcRenderer.on('succeed-to-restart-server', callback)
// }

export function checkFullScreen() {
  return window.electron.ipcRenderer.invoke('check-fullscreen')
}

export function fullScreenChange() {
  return window.electron.ipcRenderer.invoke('subscribe-fullscreen-change')
}

export function subscribeFullScreenChanged(
  callback: (_: IpcRendererEvent, isFullscreen: boolean) => void
) {
  window.electron.ipcRenderer.on('fullscreen-changed', callback)
}

export function unsubscribeFullScreenChanged(
  callback: (_: IpcRendererEvent, isFullscreen: boolean) => void
) {
  window.electron.ipcRenderer.removeListener('fullscreen-changed', callback)
}

export function closeSearchbar() {
  return window.electron.ipcRenderer.invoke('close-search-bar')
}

export function closeQuickChat() {
  return window.electron.ipcRenderer.invoke('close-quick-chat')
}

export function transferQuickChat(input: string) {
  return window.electron.ipcRenderer.invoke('transfer-quick-chat', input)
}

export function findInPage(query: string) {
  return window.electron.ipcRenderer.invoke('find-in-page', query)
}

export function findNext(query: string) {
  return window.electron.ipcRenderer.invoke('find-next', query)
}

export function findPrevious(query: string) {
  return window.electron.ipcRenderer.invoke('find-previous', query)
}

export function subscribeFindInPageResult(
  callback: (_: IpcRendererEvent, result: Result) => void
) {
  window.electron.ipcRenderer.on('find-in-page-result', callback)
}

export function setNativeTheme(source: 'dark' | 'light' | 'system') {
  return window.electron.ipcRenderer.invoke('set-native-theme', source)
}

export function updaterGetState() {
  return window.electron.ipcRenderer.invoke('updater-get-state')
}

export function updaterCheck() {
  return window.electron.ipcRenderer.invoke('updater-check')
}

export function updaterDownload() {
  return window.electron.ipcRenderer.invoke('updater-download')
}

export function updaterInstall() {
  return window.electron.ipcRenderer.invoke('updater-install')
}

export function selectSkillPath(): Promise<string | null> {
  return window.electron.ipcRenderer.invoke('select-skill-path')
}

export function updaterSetAutoDownload(enable: boolean) {
  return window.electron.ipcRenderer.invoke('updater-set-auto-download', enable)
}

export function subscribeUpdaterStateChanged(
  callback: (_: IpcRendererEvent, payload: unknown) => void
) {
  window.electron.ipcRenderer.on('updater-state-changed', callback)
}

export function unsubscribeUpdaterStateChanged(
  callback: (_: IpcRendererEvent, payload: unknown) => void
) {
  window.electron.ipcRenderer.removeListener('updater-state-changed', callback)
}
