// @vitest-environment happy-dom
import type { LockStatus } from '@exodus/shared/types/lock'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const t = (key: string, opts?: Record<string, unknown>) =>
  opts ? `${key}(${Object.values(opts).join(',')})` : key
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }))

const unlockWithTouchId = vi.fn()
vi.mock('@/lib/lock-ipc', () => ({
  getRecentLockNotifications: () => Promise.resolve([]),
  onLockNotification: () => () => {},
  unlockWithPin: vi.fn(() => Promise.resolve({ ok: false })),
  unlockWithTouchId: (...args: unknown[]) => unlockWithTouchId(...args)
}))

const { LockScreen } = await import('@/components/lock/lock-screen')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function status(touchId: boolean): LockStatus {
  return {
    hasPin: true,
    locked: true,
    retryAfterMs: 0,
    touchIdAvailable: touchId,
    config: {
      touchIdEnabled: touchId,
      idleTimeoutMs: 0,
      lockOnLaunch: false,
      lockOnSystemSleep: false
    }
  }
}

async function mount(s: LockStatus, onUnlocked = vi.fn()) {
  const host = document.createElement('div')
  await act(async () =>
    createRoot(host).render(
      createElement(LockScreen, { status: s, onUnlocked })
    )
  )
  return { host, onUnlocked }
}

describe('LockScreen', () => {
  afterEach(() => unlockWithTouchId.mockClear())

  it('prompts Touch ID itself on mount — no click needed — when it is available and enabled', async () => {
    unlockWithTouchId.mockResolvedValue({ ok: false })
    await mount(status(true))
    expect(unlockWithTouchId).toHaveBeenCalledTimes(1)
  })

  it('unlocks straight from that automatic prompt, same as the button would', async () => {
    unlockWithTouchId.mockResolvedValue({ ok: true })
    const { onUnlocked } = await mount(status(true))
    expect(onUnlocked).toHaveBeenCalledTimes(1)
  })

  it('never prompts when Touch ID is unavailable or off', async () => {
    unlockWithTouchId.mockResolvedValue({ ok: false })
    await mount(status(false))
    expect(unlockWithTouchId).not.toHaveBeenCalled()
  })

  it('the button still works, and does not double up with the automatic prompt', async () => {
    unlockWithTouchId.mockResolvedValue({ ok: false })
    const { host } = await mount(status(true))
    expect(unlockWithTouchId).toHaveBeenCalledTimes(1)

    const button = host.querySelector<HTMLButtonElement>(
      '[data-testid="lock.touch-id-button"]'
    )!
    await act(async () => {
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(unlockWithTouchId).toHaveBeenCalledTimes(2)
  })
})
