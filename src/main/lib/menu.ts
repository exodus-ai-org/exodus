import { EXODUS_WEBSITE } from '@exodus/shared/constants/external-urls'
import {
  app,
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  shell
} from 'electron'

import { mainT } from './i18n'
import { getLockManager } from './lock/lock-manager'
import { registerSearchMenu } from './window'

const isMac = process.platform === 'darwin'

function buildMenu(): MenuItemConstructorOptions[] {
  return [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' }
            ]
          }
        ]
      : []),
    {
      label: mainT('menu:file', 'File'),
      submenu: [
        {
          label: mainT('menu:lockNow', 'Lock Now'),
          accelerator: 'CmdOrCtrl+L',
          click: () => getLockManager().lock('manual')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: mainT('menu:edit', 'Edit'),
      submenu: [
        {
          label: mainT('menu:find', 'Find'),
          accelerator: 'CmdOrCtrl+F',
          click: () => {
            const mainWindow = BrowserWindow.getFocusedWindow()
            if (!mainWindow) return
            registerSearchMenu(mainWindow)
          }
        },
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        ...(isMac
          ? [
              { role: 'pasteAndMatchStyle' },
              { role: 'delete' },
              { role: 'selectAll' },
              { type: 'separator' },
              {
                label: mainT('menu:speech', 'Speech'),
                submenu: [{ role: 'startSpeaking' }, { role: 'stopSpeaking' }]
              }
            ]
          : [{ role: 'delete' }, { type: 'separator' }, { role: 'selectAll' }])
      ]
    },
    {
      label: mainT('menu:view', 'View'),
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: mainT('menu:window', 'Window'),
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    },
    {
      role: 'help',
      submenu: [
        {
          label: mainT('menu:learnMore', 'Learn More'),
          click: async () => {
            await shell.openExternal(EXODUS_WEBSITE)
          }
        }
      ]
    }
  ] as MenuItemConstructorOptions[]
}

export function setupMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate(buildMenu()))
}
