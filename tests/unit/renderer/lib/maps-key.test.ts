// src/renderer/lib/maps-key.ts — the Maps JS key is answered only to the main
// window's top frame (`maps:js-key`, ipc.ts). Any other window (re-review m7)
// gets null, which the map card shows as its no-key state; nothing throws.
import { afterEach, describe, expect, it, vi } from 'vitest'

const { fetchMapsJsKey } = await import('@/lib/maps-key')

function withInvoke(invoke: (channel: string) => Promise<unknown>) {
  vi.stubGlobal('window', { electron: { ipcRenderer: { invoke } } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchMapsJsKey', () => {
  it('returns the key the main process hands the main window', async () => {
    withInvoke(() => Promise.resolve('AIza-key'))
    await expect(fetchMapsJsKey()).resolves.toBe('AIza-key')
  })

  it('is null in a window the main process refuses (it answers null)', async () => {
    withInvoke(() => Promise.resolve(null))
    await expect(fetchMapsJsKey()).resolves.toBeNull()
  })

  it('is null when the call fails, or there is no bridge', async () => {
    withInvoke(() => Promise.reject(new Error('no handler')))
    await expect(fetchMapsJsKey()).resolves.toBeNull()
    vi.stubGlobal('window', {})
    await expect(fetchMapsJsKey()).resolves.toBeNull()
  })
})
