import type { Guard } from '@main/lib/computer/guard'
import { globalShortcut } from 'electron'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// `liveness` reaches for Electron's `globalShortcut` on the 0→1 / 1→0 session
// transitions. In tests there is no Electron runtime — mock it and assert the
// register/unregister calls directly.
vi.mock('electron', () => ({
  globalShortcut: { register: vi.fn(), unregister: vi.fn() }
}))

const { liveness } = await import('@main/lib/computer/liveness')

const HOTKEY = 'Alt+Shift+Escape'
const register = vi.mocked(globalShortcut.register)
const unregister = vi.mocked(globalShortcut.unregister)

function fakeGuard() {
  return { abort: vi.fn() } as unknown as Guard
}

beforeEach(() => {
  register.mockClear()
  unregister.mockClear()
})

// `liveness` is a module singleton — leave no started session behind.
afterEach(() => {
  for (const id of ['a', 'b', 'c']) liveness.end(id)
})

describe('liveness', () => {
  it('registers the hotkey once, only on the 0→1 transition', () => {
    liveness.start('a', fakeGuard())
    liveness.start('b', fakeGuard())

    expect(liveness.count).toBe(2)
    expect(register).toHaveBeenCalledTimes(1)
    expect(register).toHaveBeenCalledWith(HOTKEY, expect.any(Function))
  })

  it('unregisters the hotkey only on the 1→0 transition', () => {
    liveness.start('a', fakeGuard())
    liveness.start('b', fakeGuard())

    liveness.end('b')
    expect(liveness.count).toBe(1)
    expect(unregister).not.toHaveBeenCalled()

    liveness.end('a')
    expect(liveness.count).toBe(0)
    expect(unregister).toHaveBeenCalledTimes(1)
    expect(unregister).toHaveBeenCalledWith(HOTKEY)
  })

  it('end() on an unknown session id is a no-op', () => {
    liveness.start('a', fakeGuard())
    register.mockClear()

    liveness.end('nonexistent')

    expect(liveness.count).toBe(1)
    expect(unregister).not.toHaveBeenCalled()
  })

  it('abortAll() aborts every registered guard with the given reason', () => {
    const guardA = fakeGuard()
    const guardB = fakeGuard()
    liveness.start('a', guardA)
    liveness.start('b', guardB)

    liveness.abortAll('user')

    expect(guardA.abort).toHaveBeenCalledWith('user')
    expect(guardB.abort).toHaveBeenCalledWith('user')
  })

  it('re-registers the hotkey after a full teardown (0→1 again)', () => {
    liveness.start('a', fakeGuard())
    liveness.start('b', fakeGuard())
    liveness.end('a')
    liveness.end('b')
    expect(liveness.count).toBe(0)
    expect(register).toHaveBeenCalledTimes(1)
    expect(unregister).toHaveBeenCalledTimes(1)

    liveness.start('a', fakeGuard())

    expect(liveness.count).toBe(1)
    expect(register).toHaveBeenCalledTimes(2)
  })

  it('the registered hotkey callback aborts all guards with reason "hotkey"', () => {
    const guardA = fakeGuard()
    liveness.start('a', guardA)

    const cb = register.mock.calls[0][1] as () => void
    cb()

    expect(guardA.abort).toHaveBeenCalledWith('hotkey')
  })

  it('start() with an already-registered id does not re-register', () => {
    liveness.start('a', fakeGuard())
    liveness.start('a', fakeGuard())

    expect(liveness.count).toBe(1)
    expect(register).toHaveBeenCalledTimes(1)
  })
})
