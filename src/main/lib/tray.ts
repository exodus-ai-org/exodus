import { Tray } from 'electron'
import icon from '../../../resources/iconTemplate.png?asset'
import { registerShortcutChat } from './window'

export function setTray() {
  const tray = new Tray(icon)
  tray.addListener('click', () => {
    registerShortcutChat()
  })
}
