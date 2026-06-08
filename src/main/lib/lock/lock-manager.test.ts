import { beforeEach, describe, expect, it, vi } from 'vitest'

const pinStore = {
  hasPin: vi.fn(() => true),
  setPin: vi.fn(),
  verify: vi.fn(() => false),
  clear: vi.fn()
}
const config = {
  readConfig: vi.fn(() => ({
    touchIdEnabled: false,
    idleTimeoutMs: 0,
    lockOnLaunch: false,
    lockOnSystemSleep: false
  })),
  writeConfig: vi.fn((p) => ({
    touchIdEnabled: false,
    idleTimeoutMs: 0,
    lockOnLaunch: false,
    lockOnSystemSleep: false,
    ...p
  }))
}
vi.mock('./pin-store', () => pinStore)
vi.mock('./lock-config', () => config)
vi.mock('../logger', () => ({ logger: { info: vi.fn(), warn: vi.fn() } }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  pinStore.hasPin.mockReturnValue(true)
  pinStore.verify.mockReturnValue(false)
})

describe('LockManager', () => {
  it('starts unlocked and emits on lock', async () => {
    const { LockManager } = await import('./lock-manager')
    const m = new LockManager()
    expect(m.isLocked()).toBe(false)
    const spy = vi.fn()
    m.on('state-changed', spy)
    m.lock('manual')
    expect(m.isLocked()).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('does not lock when no pin is set', async () => {
    pinStore.hasPin.mockReturnValue(false)
    const { LockManager } = await import('./lock-manager')
    const m = new LockManager()
    m.lock('manual')
    expect(m.isLocked()).toBe(false)
  })

  it('unlock fails with wrong pin and succeeds with right pin', async () => {
    const { LockManager } = await import('./lock-manager')
    const m = new LockManager()
    m.lock('manual')
    expect(m.unlock('000000')).toEqual({
      ok: false,
      reason: 'wrong-pin',
      retryAfterMs: 0
    })
    pinStore.verify.mockReturnValue(true)
    expect(m.unlock('123456')).toEqual({ ok: true })
    expect(m.isLocked()).toBe(false)
  })

  it('locks out after 5 wrong attempts', async () => {
    const now = vi.fn(() => 1_000_000)
    const { LockManager } = await import('./lock-manager')
    const m = new LockManager(now)
    m.lock('manual')
    for (let i = 0; i < 5; i++) m.unlock('000000')
    const res = m.unlock('000000')
    expect(res).toEqual({
      ok: false,
      reason: 'locked-out',
      retryAfterMs: 30000
    })
    now.mockReturnValue(1_000_000 + 30001)
    expect(m.unlock('000000')).toEqual({
      ok: false,
      reason: 'wrong-pin',
      retryAfterMs: 0
    })
  })

  it('rate-limits disable() after lockout', async () => {
    const now = vi.fn(() => 1_000_000)
    const { LockManager } = await import('./lock-manager')
    const m = new LockManager(now)
    for (let i = 0; i < 5; i++) m.unlock('000000') // trip lockout
    // disable must refuse while locked out, even with the correct pin
    pinStore.verify.mockReturnValue(true)
    expect(m.disable('123456')).toBe(false)
    now.mockReturnValue(1_000_000 + 30001)
    expect(m.disable('123456')).toBe(true)
  })

  it('changePin records wrong attempts toward lockout', async () => {
    const { LockManager } = await import('./lock-manager')
    const m = new LockManager()
    pinStore.verify.mockReturnValue(false)
    for (let i = 0; i < 5; i++) m.changePin('000000', '111111')
    // now locked out: a correct unlock attempt is refused
    pinStore.verify.mockReturnValue(true)
    expect(m.unlock('123456')).toEqual({
      ok: false,
      reason: 'locked-out',
      retryAfterMs: 30000
    })
  })
})
