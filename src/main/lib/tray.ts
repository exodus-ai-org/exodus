import { Tray } from 'electron'

import icon from '../../../resources/iconTemplate.png?asset'
import { registerQuickChat } from './window'

let tray: Tray | null = null

export function setTray() {
  if (tray) return
  tray = new Tray(icon)
  tray.addListener('click', () => {
    registerQuickChat()
  })
}

export function destroyTray() {
  if (tray) {
    tray.destroy()
    tray = null
  }
}

export function getTray(): Tray | null {
  return tray
}
