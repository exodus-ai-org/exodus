// @vitest-environment happy-dom
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
})
