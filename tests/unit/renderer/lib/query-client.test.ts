// @vitest-environment happy-dom
import {
  focusManager,
  onlineManager,
  QueryObserver
} from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

const report = vi.fn()
vi.mock('@/lib/report-error', () => ({
  reportRendererError: (...args: unknown[]) => report(...args)
}))
const sileoError = vi.fn()
vi.mock('sileo', () => ({
  sileo: { error: (...args: unknown[]) => sileoError(...args) }
}))

const { createAppQueryClient, installWindowFocusListener } =
  await import('@/lib/query-client')

describe('createAppQueryClient', () => {
  afterEach(() => {
    report.mockClear()
    sileoError.mockClear()
    onlineManager.setOnline(true)
  })

  it('a failed query reports but never toasts', async () => {
    const client = createAppQueryClient()
    await client
      .fetchQuery({
        queryKey: ['boom-query'],
        queryFn: () => Promise.reject(new Error('read failed'))
      })
      .catch(() => {})

    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('query', expect.any(Error), {
      queryKey: ['boom-query']
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('a failed mutation reports and toasts, using meta.errorTitle', async () => {
    const client = createAppQueryClient()
    await client
      .getMutationCache()
      .build(client, {
        mutationKey: ['boom-mutation'],
        mutationFn: () => Promise.reject(new Error('write failed')),
        meta: { errorTitle: 'Could not save' }
      })
      .execute(undefined)
      .catch(() => {})

    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('mutation', expect.any(Error), {
      mutationKey: ['boom-mutation']
    })
    expect(sileoError).toHaveBeenCalledWith({
      title: 'Could not save',
      description: 'write failed'
    })
  })

  it('meta.silent suppresses the toast but still reports', async () => {
    const client = createAppQueryClient()
    await client
      .getMutationCache()
      .build(client, {
        mutationKey: ['silent-mutation'],
        mutationFn: () => Promise.reject(new Error('write failed')),
        meta: { silent: true }
      })
      .execute(undefined)
      .catch(() => {})

    expect(report).toHaveBeenCalledTimes(1)
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('a mutation with no meta.errorTitle falls back to a generic title', async () => {
    const client = createAppQueryClient()
    await client
      .getMutationCache()
      .build(client, {
        mutationKey: ['untitled-mutation'],
        mutationFn: () => Promise.reject(new Error('write failed'))
      })
      .execute(undefined)
      .catch(() => {})

    expect(sileoError).toHaveBeenCalledWith({
      title: 'Something went wrong',
      description: 'write failed'
    })
  })

  describe('while the OS reports no network', () => {
    // The API is on localhost, so connectivity is irrelevant: with React
    // Query's default networkMode ('online') a query or mutation would sit
    // paused forever. A hang guard keeps a regression a failure, not a
    // stuck suite.
    const HUNG = Symbol('hung')
    const settle = <T>(promise: Promise<T>) =>
      Promise.race([
        promise,
        new Promise<typeof HUNG>((resolve) => {
          setTimeout(() => {
            resolve(HUNG)
          }, 200)
        })
      ])

    it('a query still runs', async () => {
      const client = createAppQueryClient()
      onlineManager.setOnline(false)

      const result = await settle(
        client.fetchQuery({
          queryKey: ['offline-query'],
          queryFn: () => Promise.resolve('data')
        })
      )

      expect(result).toBe('data')
      expect(client.getQueryState(['offline-query'])?.fetchStatus).toBe('idle')
    })

    it('a mutation still runs', async () => {
      const client = createAppQueryClient()
      onlineManager.setOnline(false)

      const mutation = client.getMutationCache().build(client, {
        mutationKey: ['offline-mutation'],
        mutationFn: () => Promise.resolve('saved')
      })
      const result = await settle(mutation.execute(undefined))

      expect(result).toBe('saved')
      expect(mutation.state.isPaused).toBe(false)
    })

    it('does not refetch every active query when connectivity returns', () => {
      const defaults = createAppQueryClient().getDefaultOptions()

      expect(defaults.queries?.refetchOnReconnect).toBe(false)
    })
  })
})

const callsFor = (spy: { mock: { calls: unknown[][] } }, type: string) =>
  spy.mock.calls.filter(([name]) => name === type).length

describe('installWindowFocusListener', () => {
  let uninstall: (() => void) | undefined
  let client: QueryClient | undefined

  afterEach(() => {
    uninstall?.()
    uninstall = undefined
    client?.unmount()
    client?.clear()
    client = undefined
    vi.restoreAllMocks()
    // There is no public way back to the library's own listener, so put an
    // equivalent one in place for whatever runs after this file.
    focusManager.setEventListener((handleFocus) => {
      const listener = () => {
        handleFocus()
      }
      window.addEventListener('visibilitychange', listener, false)
      return () => {
        window.removeEventListener('visibilitychange', listener)
      }
    })
    focusManager.setFocused(undefined)
  })

  it('follows the window losing and regaining focus', () => {
    uninstall = installWindowFocusListener()

    window.dispatchEvent(new Event('blur'))
    expect(focusManager.isFocused()).toBe(false)

    window.dispatchEvent(new Event('focus'))
    expect(focusManager.isFocused()).toBe(true)
  })

  it('still follows the page becoming hidden and visible', () => {
    uninstall = installWindowFocusListener()
    const hidden = vi.spyOn(document, 'hidden', 'get')

    hidden.mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
    expect(focusManager.isFocused()).toBe(false)

    hidden.mockReturnValue(false)
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }))
    expect(focusManager.isFocused()).toBe(true)
  })

  it('refetches an opt-in query on refocus and leaves a default one alone', async () => {
    uninstall = installWindowFocusListener()
    client = createAppQueryClient()
    client.mount()
    const optIn = vi.fn(() => Promise.resolve('opt-in'))
    const byDefault = vi.fn(() => Promise.resolve('default'))
    const unsubscribe = [
      new QueryObserver(client, {
        queryKey: ['opt-in'],
        queryFn: optIn,
        refetchOnWindowFocus: true
      }),
      new QueryObserver(client, {
        queryKey: ['default'],
        queryFn: byDefault
      })
    ].map((observer) => observer.subscribe(() => {}))
    await vi.waitFor(() => {
      expect(optIn).toHaveBeenCalledTimes(1)
      expect(byDefault).toHaveBeenCalledTimes(1)
      expect(client!.isFetching()).toBe(0)
    })

    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))

    await vi.waitFor(() => {
      expect(optIn).toHaveBeenCalledTimes(2)
      expect(client!.isFetching()).toBe(0)
    })
    expect(byDefault).toHaveBeenCalledTimes(1)
    unsubscribe.forEach((off) => {
      off()
    })
  })

  it('installing again replaces the listeners instead of adding to them', () => {
    installWindowFocusListener()
    const add = vi.spyOn(window, 'addEventListener')
    const remove = vi.spyOn(window, 'removeEventListener')
    uninstall = installWindowFocusListener()

    for (const type of ['focus', 'blur', 'visibilitychange']) {
      expect(callsFor(add, type)).toBe(1)
      expect(callsFor(remove, type)).toBe(1)
    }
  })

  it('the cleanup it returns removes the listeners', () => {
    uninstall = installWindowFocusListener()
    window.dispatchEvent(new Event('blur'))
    expect(focusManager.isFocused()).toBe(false)
    window.dispatchEvent(new Event('focus'))

    uninstall()
    window.dispatchEvent(new Event('blur'))

    expect(focusManager.isFocused()).toBe(true)
  })
})
