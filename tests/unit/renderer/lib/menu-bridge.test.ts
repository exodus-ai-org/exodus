// @vitest-environment happy-dom
import { describe, expect, it, vi } from 'vitest'

let navigate: ReturnType<typeof vi.fn>
vi.mock('@/routes', () => ({
  router: { navigate: (...args: unknown[]) => navigate(...args) }
}))

const { installMenuBridge } = await import('@/lib/menu-bridge')

describe('installMenuBridge', () => {
  it('navigates home on "menu:new-chat" and to Settings on "menu:open-settings"', () => {
    navigate = vi.fn()
    const listeners: Record<string, () => void> = {}
    Object.assign(globalThis, {
      window: {
        ...window,
        electron: {
          ipcRenderer: {
            on: (channel: string, cb: () => void) => {
              listeners[channel] = cb
            }
          }
        }
      }
    })

    installMenuBridge()
    expect(Object.keys(listeners).toSorted()).toEqual([
      'menu:new-chat',
      'menu:open-settings'
    ])

    listeners['menu:new-chat']()
    expect(navigate).toHaveBeenLastCalledWith('/')

    listeners['menu:open-settings']()
    expect(navigate).toHaveBeenLastCalledWith('/settings')
  })

  it('installing again does not register a second pair of listeners', () => {
    navigate = vi.fn()
    let calls = 0
    Object.assign(globalThis, {
      window: {
        ...window,
        electron: { ipcRenderer: { on: () => (calls += 1) } }
      }
    })

    // Already installed by the previous test — this call is a no-op.
    installMenuBridge()
    expect(calls).toBe(0)
  })
})
