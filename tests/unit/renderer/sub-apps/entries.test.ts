// @vitest-environment happy-dom
/**
 * Each sub-app entry (`src/renderer/sub-apps/<app>/main.tsx`) mounts its own
 * React root, outside the main window's provider tree. When `useSettings()`
 * moved onto React Query, all three crashed on mount ("No QueryClient set")
 * and stayed blank — nothing noticed, because every other test renders the
 * app components alone. These import the real entry files and require that
 * something is on screen afterwards.
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/ipc', () => ({
  closeQuickChat: vi.fn(async () => {}),
  transferQuickChat: vi.fn(async () => {}),
  closeSearchbar: vi.fn(async () => {}),
  findInPage: vi.fn(async () => {}),
  findNext: vi.fn(async () => {}),
  findPrevious: vi.fn(async () => {}),
  subscribeFindInPageResult: vi.fn(),
  unsubscribeFindInPageResult: vi.fn(),
  subscribeFocusSearchBar: vi.fn(),
  unsubscribeFocusSearchBar: vi.fn(),
  setNativeTheme: vi.fn(),
  setAppLocale: vi.fn(() => Promise.resolve('en'))
}))

let fetchSpy: ReturnType<typeof vi.fn>
let uncaught: unknown[]
const onError = (event: ErrorEvent) => uncaught.push(event.error ?? event)

beforeEach(() => {
  document.body.innerHTML = ''
  uncaught = []
  window.addEventListener('error', onError)
  // The settings read the two app windows make: never answered here, so the
  // test sees the first paint, which is what crashed.
  fetchSpy = vi.fn(() => new Promise<Response>(() => {}))
  vi.stubGlobal('fetch', fetchSpy)
  vi.resetModules()
})

afterEach(() => {
  window.removeEventListener('error', onError)
  vi.unstubAllGlobals()
})

async function mountEntry(rootId: string, entry: () => Promise<unknown>) {
  const host = document.createElement('div')
  host.id = rootId
  document.body.append(host)
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
  await act(async () => {
    await entry()
    // The two app windows render after `i18nReady` settles.
    const { i18nReady } = await import('@/lib/i18n')
    await i18nReady.catch(() => {})
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  })
  const logged = errors.mock.calls.map((c) => String(c[0]))
  errors.mockRestore()
  return { host, logged }
}

describe('sub-app entries mount', () => {
  it('quick chat renders its input', async () => {
    const { host, logged } = await mountEntry(
      'quick-chat-root',
      () => import('@/sub-apps/quick-chat/main')
    )
    expect(uncaught).toEqual([])
    expect(logged.filter((l) => l.includes('QueryClient'))).toEqual([])
    expect(host.querySelector('input')).not.toBeNull()
  })

  it('the find bar renders its input', async () => {
    const { host, logged } = await mountEntry(
      'searchbar-root',
      () => import('@/sub-apps/searchbar/main')
    )
    expect(uncaught).toEqual([])
    expect(logged.filter((l) => l.includes('QueryClient'))).toEqual([])
    expect(host.querySelector('input')).not.toBeNull()
  })

  it('the artifact sandbox renders and makes no request', async () => {
    const posted = vi.spyOn(window, 'postMessage')
    const { host, logged } = await mountEntry(
      'artifact-root',
      () => import('@/sub-apps/artifacts/main')
    )
    expect(uncaught).toEqual([])
    expect(logged.filter((l) => l.includes('QueryClient'))).toEqual([])
    expect(host.textContent).toContain('Waiting for artifact')
    // The handshake the embedding card waits for.
    expect(posted).toHaveBeenCalledWith({ type: 'artifact-sandbox-ready' }, '*')
    // Its CSP allows no network: it must not try.
    expect(fetchSpy).not.toHaveBeenCalled()
    posted.mockRestore()
  })
})
