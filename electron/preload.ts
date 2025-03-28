import { contextBridge, ipcRenderer, IpcRenderer } from 'electron'
import { ToolMap } from './lib/ai/types'

declare global {
  interface Window {
    mcpServers: {
      [index: string]: <T>(...args: any[]) => Promise<T>
    }
  }
}

async function exposeAPIs() {
  const tools: ToolMap = await ipcRenderer.invoke('list-tools')

  const apis: {
    [index: string]: IpcRenderer['invoke']
  } = {}
  Object.keys(tools).forEach((serverName) => {
    tools[serverName].forEach(({ name: toolName }) => {
      // const eventName = `${serverName}_${toolName}`
      const eventName = toolName
      apis[eventName] = (...args: any[]) =>
        ipcRenderer.invoke(toolName, ...args)
    })
  })
  apis['list-tools'] = (...args) => ipcRenderer.invoke('list-tools', ...args)

  contextBridge.exposeInMainWorld('mcpServers', apis)
}

exposeAPIs()
