// @vitest-environment happy-dom
import { onlineManager } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'

const report = vi.fn()
vi.mock('@/lib/report-error', () => ({
  reportRendererError: (...args: unknown[]) => report(...args)
}))
const sileoError = vi.fn()
vi.mock('sileo', () => ({
  sileo: { error: (...args: unknown[]) => sileoError(...args) }
}))

const { createAppQueryClient } = await import('@/lib/query-client')

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
