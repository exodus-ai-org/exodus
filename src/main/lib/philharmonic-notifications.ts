// src/main/lib/philharmonic-notifications.ts
//
// Native notification helper for Philharmonic Group events. Fires only when
// the user is NOT actively looking at the app, so we don't spam the UI with
// duplicate signals (the plan card and in-stream messages cover that case).

import { Notification } from 'electron'

import { logger } from './logger'
import { getMainWindow } from './window'

interface NotifyOpts {
  title: string
  body: string
  /** Optional click handler — focuses the window by default. */
  onClick?: () => void
}

/** True when the user can't see in-app updates and a notification is useful. */
function shouldNotify(): boolean {
  const win = getMainWindow()
  if (!win) return true // app launched without a window? still notify.
  if (win.isMinimized()) return true
  if (!win.isVisible()) return true
  return !win.isFocused()
}

export function notifyIfBackground(opts: NotifyOpts): void {
  if (!Notification.isSupported()) return
  if (!shouldNotify()) return

  try {
    const n = new Notification({
      title: opts.title,
      body: opts.body,
      silent: false
    })
    n.on('click', () => {
      const win = getMainWindow()
      if (win) {
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
      }
      opts.onClick?.()
    })
    n.show()
  } catch (err) {
    // Some Linux distros can throw if no notification daemon is running.
    logger.warn('philharmonic', 'notification show failed', {
      err: String(err)
    })
  }
}
