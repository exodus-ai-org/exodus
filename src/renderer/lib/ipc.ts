import { IpcRendererEvent, Result } from 'electron'

export function bringWindowToFront() {
  window.electron.ipcRenderer.invoke('bring-window-to-front')
}

export function subscribeQuickChatInput(
  callback: (_: IpcRendererEvent, input: string) => Promise<void>
) {
  window.electron.ipcRenderer.on('quick-chat-input', callback)
}

export function restartServer() {
  window.electron.ipcRenderer.invoke('restart-server')
}

export function subscribeSucceedToRestartServer(callback: () => void) {
  window.electron.ipcRenderer.on('succeed-to-restart-server', callback)
}

export function checkFullScreen() {
  window.electron.ipcRenderer.invoke('check-fullscreen')
}

export function subscribeFullscreenChange(
  callback: (_: IpcRendererEvent, isFullscreen: boolean) => void
) {
  window.electron.ipcRenderer.on('fullscreen-changed', callback)
}

export function closeSearchbar() {
  window.electron.ipcRenderer.invoke('close-search-bar')
}

export function closeQuickChat() {
  window.electron.ipcRenderer.invoke('close-quick-chat')
}

export function transferQuickChat(input: string) {
  window.electron.ipcRenderer.invoke('transfer-quick-chat', input)
}

export function findInPage(query: string) {
  window.electron.ipcRenderer.invoke('find-in-page', query)
}

export function findNext(query: string) {
  window.electron.ipcRenderer.invoke('find-next', query)
}

export function findPrevious(query: string) {
  window.electron.ipcRenderer.invoke('find-previous', query)
}

export function subscribeFindInPageResult(
  callback: (_: IpcRendererEvent, result: Result) => void
) {
  window.electron.ipcRenderer.on('find-in-page-result', callback)
}
