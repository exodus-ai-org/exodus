import { Tray } from 'electron'
import icon from '../../../resources/iconTemplate.png?asset'
import { registerQuickChat } from './window'

export function setTray() {
  const tray = new Tray(icon)
  tray.addListener('click', () => {
    registerQuickChat()
  })
}
