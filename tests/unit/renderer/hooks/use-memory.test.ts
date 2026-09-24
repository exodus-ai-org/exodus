// @vitest-environment happy-dom
import type { MemoryChange } from '@exodus/shared/types/memory'
import {
  focusManager,
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { MemoryItem } from '@/services/memory'

const getMemoriesService = vi.fn()
const getMemoryUsageService = vi.fn()
const undoMemoryChangesService = vi.fn()
vi.mock('@/services/memory', () => ({
  getMemories: (...args: unknown[]) => getMemoriesService(...args),
  getMemoryUsage: (...args: unknown[]) => getMemoryUsageService(...args),
  undoMemoryChanges: (...args: unknown[]) => undoMemoryChangesService(...args)
}))
// `key[name]` when the copy is interpolated, so a wrong name or a wrong key
// both show in the assertion.
vi.mock('@/lib/i18n', () => ({
  i18n: {
    t: (key: string, params?: { name?: string }) =>
      params ? `${key}[${params.name}]` : key
  }
}))
const report = vi.fn()
vi.mock('@/lib/report-error', () => ({
  reportRendererError: (...args: unknown[]) => report(...args)
}))
const sileoSuccess = vi.fn()
const sileoError = vi.fn()
vi.mock('sileo', () => ({
  sileo: {
    success: (...args: unknown[]) => sileoSuccess(...args),
    error: (...args: unknown[]) => sileoError(...args)
  }
}))

const {
  memoryKeys,
  useMemories,
  useRunMemoryUsage,
  useSetMemoryList,
  useUndoMemoryChanges
} = await import('@/hooks/use-memory')
const { createAppQueryClient } = await import('@/lib/query-client')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

function Probe<T>({
  hook,
  onReady
}: {
  hook: () => T
  onReady: (value: T) => void
}) {
  onReady(hook())
  return null
}

// Roots a test mounted, unmounted in afterEach: a leaked root stays subscribed
// to the focus manager and would answer the window-focus test's focus events.
const mounted: Array<() => Promise<void>> = []

async function mountOn<T>(queryClient: QueryClient, hook: () => T) {
  let latest: T | undefined
  const root = createRoot(document.createElement('div'))
  const probe = createElement(Probe<T>, {
    hook,
    onReady: (value) => (latest = value)
  })
  await act(async () => {
    root.render(
      createElement(QueryClientProvider, { client: queryClient }, probe)
    )
  })
  mounted.push(async () => {
    await act(async () => {
      root.unmount()
    })
  })
  return { queryClient, api: () => latest! }
}

const isolatedClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })

const mountHook = <T>(hook: () => T) => mountOn(isolatedClient(), hook)

// The app's own client, so a failing read/write goes through the real
// `queryCache`/`mutationCache` `onError`; retries off so the failure lands
// without a backoff.
function mountHookOnAppClient<T>(hook: () => T) {
  const queryClient = createAppQueryClient()
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false }
  })
  return mountOn(queryClient, hook)
}

// Two SEPARATE roots (so neither is the other's sibling under one parent —
// only the QueryClient, not any React tree, is shared), both rendered inside
// one `act()` before either `await`s: both observers subscribe to the shared
// query synchronously, ahead of the mocked fetch's promise settling, so the
// two hooks reading the same chat's usage still dedupe into one service call.
async function mountTwoCounted<A, B>(
  queryClient: QueryClient,
  hookA: () => A,
  hookB: () => B
) {
  const onReadyA = vi.fn<(value: A) => void>()
  const onReadyB = vi.fn<(value: B) => void>()
  const rootA = createRoot(document.createElement('div'))
  const rootB = createRoot(document.createElement('div'))
  await act(async () => {
    rootA.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Probe<A>, { hook: hookA, onReady: onReadyA })
      )
    )
    rootB.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Probe<B>, { hook: hookB, onReady: onReadyB })
      )
    )
  })
  mounted.push(async () => {
    await act(async () => {
      rootA.unmount()
      rootB.unmount()
    })
  })
  return { onReadyA, onReadyB }
}

afterEach(async () => {
  // Unmount first: restoring focus while a root is still mounted fires a
  // focus refetch against an already-reset (exhausted) service mock.
  for (const unmount of mounted.splice(0)) await unmount()
  focusManager.setFocused(undefined)
  getMemoriesService.mockReset()
  getMemoryUsageService.mockReset()
  undoMemoryChangesService.mockReset()
  report.mockClear()
  sileoSuccess.mockClear()
  sileoError.mockClear()
})

const memoryItem = (overrides: Partial<MemoryItem> = {}): MemoryItem => ({
  id: 'm1',
  userId: 'local',
  section: 'topic',
  key: 'Work setup',
  summary: 'Uses a mechanical keyboard',
  details: [],
  confidence: null,
  source: 'system',
  createdAt: null,
  updatedAt: null,
  lastUsedAt: null,
  isActive: true,
  ...overrides
})

const isInvalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated

function expectSingleGlobalFailure(title: string, message: string) {
  expect(report).toHaveBeenCalledTimes(1)
  expect(report).toHaveBeenCalledWith('mutation', expect.any(Error), {
    mutationKey: undefined
  })
  expect(sileoError).toHaveBeenCalledTimes(1)
  expect(sileoError).toHaveBeenCalledWith({ title, description: message })
  expect(sileoSuccess).not.toHaveBeenCalled()
}

describe('memoryKeys', () => {
  it('has a root key, a list key and a per-chat usage key', () => {
    expect(memoryKeys.all).toEqual(['memory'])
    expect(memoryKeys.list).toEqual(['memory', 'list'])
    expect(memoryKeys.usage('chat-1')).toEqual(['memory', 'usage', 'chat-1'])
  })
})

describe('useMemories', () => {
  it('reads the memory list once through the service and caches it at memoryKeys.list', async () => {
    const items = [memoryItem()]
    getMemoriesService.mockResolvedValue(items)
    const { queryClient, api } = await mountHook(useMemories)
    expect(api().data).toBeUndefined()
    expect(api().isLoading).toBe(true)

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(items))
    })

    expect(getMemoriesService).toHaveBeenCalledTimes(1)
    expect(getMemoriesService).toHaveBeenCalledWith()
    expect(queryClient.getQueryData(memoryKeys.list)).toEqual(items)
    expect(api().isLoading).toBe(false)
  })

  it('a failed read is reported and never toasted, and leaves the data undefined', async () => {
    getMemoriesService.mockRejectedValue(new Error('memory store is down'))
    const { api } = await mountHookOnAppClient(useMemories)

    await act(async () => {
      await vi.waitFor(() => expect(api().isLoading).toBe(false))
    })

    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('query', expect.any(Error), {
      queryKey: memoryKeys.list
    })
    expect(sileoError).not.toHaveBeenCalled()
    expect(api().data).toBeUndefined()
  })

  it('reads again when the window regains focus, so the chat/consolidation writing memory shows up, and only this read does', async () => {
    getMemoriesService
      .mockResolvedValueOnce([memoryItem()])
      .mockResolvedValueOnce([memoryItem({ id: 'm2' })])
    const other = vi.fn().mockResolvedValue('unchanged')
    const { api } = await mountHookOnAppClient(() => ({
      list: useMemories(),
      other: useQuery({ queryKey: ['not-memory'], queryFn: other })
    }))
    await act(async () => {
      await vi.waitFor(() => expect(api().list.data).toHaveLength(1))
      await vi.waitFor(() => expect(api().other.data).toBe('unchanged'))
    })

    await act(async () => {
      focusManager.setFocused(false)
    })
    expect(getMemoriesService).toHaveBeenCalledTimes(1)

    await act(async () => {
      focusManager.setFocused(true)
      await vi.waitFor(() => expect(api().list.data?.[0]?.id).toEqual('m2'))
    })

    expect(getMemoriesService).toHaveBeenCalledTimes(2)
    expect(other).toHaveBeenCalledTimes(1)
  })
})

describe('useRunMemoryUsage', () => {
  it('selects only the named run and returns [] when it used none', async () => {
    getMemoryUsageService.mockResolvedValue({
      'run-a': [{ id: 'm1', key: 'Work setup', section: 'topic' }]
    })
    const { api } = await mountHook(() => useRunMemoryUsage('chat-1', 'run-b'))

    await act(async () => {
      await vi.waitFor(() =>
        expect(getMemoryUsageService).toHaveBeenCalledTimes(1)
      )
    })

    expect(api()).toEqual([])
    expect(getMemoryUsageService).toHaveBeenCalledWith('chat-1')
  })

  it('returns [] before the read has resolved at all', async () => {
    getMemoryUsageService.mockReturnValue(new Promise(() => {}))
    const { api } = await mountHook(() => useRunMemoryUsage('chat-1', 'run-a'))

    expect(api()).toEqual([])
  })

  // React Query's pending → success transition is itself a legitimate
  // re-render of every observer of the query (`data` goes from `undefined`
  // to the selected value), arriving over one or more `act()`-flushed
  // microtask ticks that don't all land inside a single `act()` call. Poll
  // each side's render count until it stops moving, so "before" is captured
  // once the mount's own settle is fully done — not mid-flush.
  async function untilStable(fn: () => number, tries = 10) {
    let last = fn()
    for (let i = 0; i < tries; i++) {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0))
      })
      const now = fn()
      if (now === last) return now
      last = now
    }
    return last
  }

  it('a cache write for one run (what the stream manager does on `memories_used`) re-renders only the hook mounted for that run', async () => {
    getMemoryUsageService.mockResolvedValue({})
    const queryClient = isolatedClient()
    const { onReadyA, onReadyB } = await mountTwoCounted(
      queryClient,
      () => useRunMemoryUsage('chat-1', 'run-a'),
      () => useRunMemoryUsage('chat-1', 'run-b')
    )

    await untilStable(() => onReadyA.mock.calls.length)
    await untilStable(() => onReadyB.mock.calls.length)
    // Both hooks share one query (same chatId) — the service is called once,
    // not once per mounted hook.
    expect(getMemoryUsageService).toHaveBeenCalledTimes(1)
    const callsBeforeA = onReadyA.mock.calls.length
    const callsBeforeB = onReadyB.mock.calls.length
    expect(onReadyA).toHaveBeenLastCalledWith([])
    expect(onReadyB).toHaveBeenLastCalledWith([])

    await act(async () => {
      queryClient.setQueryData(
        memoryKeys.usage('chat-1'),
        (old: Record<string, unknown> | undefined) => ({
          ...old,
          'run-a': [{ id: 'm1', key: 'Work setup', section: 'topic' }]
        })
      )
    })
    await untilStable(() => onReadyA.mock.calls.length)

    expect(onReadyA.mock.calls.length).toBeGreaterThan(callsBeforeA)
    expect(onReadyA).toHaveBeenLastCalledWith([
      { id: 'm1', key: 'Work setup', section: 'topic' }
    ])
    // run-b's own slice never changed value, so its observer bails and the
    // component mounted for it never re-renders.
    expect(onReadyB.mock.calls.length).toBe(callsBeforeB)
  })
})

describe('useSetMemoryList', () => {
  it('set() applies an updater to the cached list in place, without reading through the service', async () => {
    const { queryClient, api } = await mountHook(useSetMemoryList)
    queryClient.setQueryData(memoryKeys.list, [
      memoryItem({ id: 'm1', isActive: true })
    ])

    await act(async () => {
      api().set((list) =>
        list.map((m) => (m.id === 'm1' ? { ...m, isActive: false } : m))
      )
    })

    expect(queryClient.getQueryData(memoryKeys.list)).toEqual([
      memoryItem({ id: 'm1', isActive: false })
    ])
    expect(getMemoriesService).not.toHaveBeenCalled()
  })

  it('invalidate() marks memoryKeys.list stale without touching memoryKeys.usage', async () => {
    const { queryClient, api } = await mountHook(useSetMemoryList)
    queryClient.setQueryData(memoryKeys.list, [memoryItem()])
    queryClient.setQueryData(memoryKeys.usage('chat-1'), {})

    await act(async () => {
      await api().invalidate()
    })

    expect(isInvalidated(queryClient, memoryKeys.list)).toBe(true)
    expect(isInvalidated(queryClient, memoryKeys.usage('chat-1'))).toBe(false)
  })
})

describe('useUndoMemoryChanges', () => {
  const changes: MemoryChange[] = [
    {
      op: 'update',
      id: 'm1',
      before: {
        section: 'topic',
        key: 'Work setup',
        summary: 'old summary',
        details: [],
        isActive: true
      },
      after: {
        section: 'topic',
        key: 'Work setup',
        summary: 'new summary',
        details: [],
        isActive: true
      }
    }
  ]

  it('undoes by the exact changes array and invalidates memoryKeys.all on settle', async () => {
    undoMemoryChangesService.mockResolvedValue({
      undone: ['m1'],
      skipped: []
    })
    const { queryClient, api } = await mountHook(useUndoMemoryChanges)
    queryClient.setQueryData(memoryKeys.list, [memoryItem()])
    queryClient.setQueryData(memoryKeys.usage('chat-1'), {})

    let result: { undone: string[]; skipped: string[] } | undefined
    await act(async () => {
      result = await api().mutateAsync(changes)
    })

    expect(undoMemoryChangesService).toHaveBeenCalledTimes(1)
    expect(undoMemoryChangesService).toHaveBeenCalledWith(changes)
    expect(result).toEqual({ undone: ['m1'], skipped: [] })
    expect(isInvalidated(queryClient, memoryKeys.list)).toBe(true)
    expect(isInvalidated(queryClient, memoryKeys.usage('chat-1'))).toBe(true)
  })

  it('a failed undo reaches the global handler only — one report, one toast titled chat:memoryStrip.undoFailed — and still invalidates on settle', async () => {
    undoMemoryChangesService.mockRejectedValue(new Error('entry changed since'))
    const { queryClient, api } =
      await mountHookOnAppClient(useUndoMemoryChanges)
    queryClient.setQueryData(memoryKeys.list, [memoryItem()])

    await act(async () => {
      await api()
        .mutateAsync(changes)
        .catch(() => {})
    })

    expectSingleGlobalFailure(
      'chat:memoryStrip.undoFailed',
      'entry changed since'
    )
    expect(isInvalidated(queryClient, memoryKeys.list)).toBe(true)
  })
})
