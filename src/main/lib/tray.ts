import { Tray } from 'electron'

import icon from '../../../resources/iconTemplate.png?asset'
import { logger } from './logger'
import { registerQuickChat } from './window'

let tray: Tray | null = null

export function setTray() {
  if (tray) return
  try {
    tray = new Tray(icon)
    tray.addListener('click', () => {
      registerQuickChat()
    })
  } catch (err) {
    logger.error('app', 'Failed to create tray icon', {
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined
    })
  }
}

export function destroyTray() {
  if (tray) {
    try {
      tray.destroy()
    } catch (err) {
      logger.warn('app', 'Failed to destroy tray icon', {
        error: String(err)
      })
    }
    tray = null
  }
}

export function getTray(): Tray | null {
  return tray
}
