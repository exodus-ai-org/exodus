import { beforeEach, describe, expect, it, vi } from 'vitest'

const cfg = { idleTimeoutMs: 0 }
vi.mock('@main/lib/lock/lock-config', () => ({
  readConfig: () => ({ ...baseCfg(), ...cfg })
}))
vi.mock('@main/lib/logger', () => ({ logger: { info: vi.fn() } }))

function baseCfg() {
  return {
    touchIdEnabled: false,
    idleTimeoutMs: 0,
    lockOnLaunch: false,
    lockOnSystemSleep: false
  }
}

beforeEach(() => {
  cfg.idleTimeoutMs = 0
})

describe('IdleWatcher', () => {
  it('locks after idle timeout with no activity', async () => {
    const { IdleWatcher } = await import('@main/lib/lock/idle-watcher')
    const lock = vi.fn()
    const manager = { lock, isLocked: () => false }
    let t = 0
    const now = () => t
    cfg.idleTimeoutMs = 1000
    const w = new IdleWatcher(manager as never, now)
    w.recordActivity()
    w.tick()
    expect(lock).not.toHaveBeenCalled()
    t = 1500
    w.tick()
    expect(lock).toHaveBeenCalledWith('idle')
  })

  it('does not lock when idleTimeoutMs is 0', async () => {
    const { IdleWatcher } = await import('@main/lib/lock/idle-watcher')
    const lock = vi.fn()
    const manager = { lock, isLocked: () => false }
    let t = 0
    const w = new IdleWatcher(manager as never, () => t)
    w.recordActivity()
    t = 999999
    w.tick()
    expect(lock).not.toHaveBeenCalled()
  })

  it('activity resets the idle timer', async () => {
    const { IdleWatcher } = await import('@main/lib/lock/idle-watcher')
    const lock = vi.fn()
    const manager = { lock, isLocked: () => false }
    let t = 0
    cfg.idleTimeoutMs = 1000
    const w = new IdleWatcher(manager as never, () => t)
    w.recordActivity()
    t = 800
    w.recordActivity()
    t = 1500
    w.tick()
    expect(lock).not.toHaveBeenCalled()
  })
})
