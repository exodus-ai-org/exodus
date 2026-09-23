// @vitest-environment happy-dom
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithQueryClient } from '../../helpers/query-test-utils'

const fetcherMock = vi.fn()
vi.mock('@exodus/shared/utils/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@exodus/shared/utils/http')>()),
  fetcher: (...args: unknown[]) => fetcherMock(...args)
}))
const updateChatService = vi.fn()
const deleteChatService = vi.fn()
vi.mock('@/services/chat', () => ({
  updateChat: (...args: unknown[]) => updateChatService(...args),
  deleteChat: (...args: unknown[]) => deleteChatService(...args)
}))
vi.mock('@/lib/i18n', () => ({ i18n: { t: (key: string) => key } }))
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
  historyKeys,
  useChatHistory,
  useChatMessages,
  useUpdateChat,
  useDeleteChat,
  useInvalidateChatHistory
} = await import('@/hooks/use-chat-history')
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

async function mountHook<T>(hook: () => T) {
  let latest: T | undefined
  const { queryClient } = await renderWithQueryClient(
    createElement(Probe<T>, { hook, onReady: (value) => (latest = value) })
  )
  return { queryClient, api: () => latest! }
}

// The app's own client, so a failing mutation goes through the real
// `mutationCache.onError` (report + toast) instead of a hook-local catch.
async function mountHookOnAppClient<T>(hook: () => T) {
  let latest: T | undefined
  const queryClient = createAppQueryClient()
  const probe = createElement(Probe<T>, {
    hook,
    onReady: (value) => (latest = value)
  })
  await act(async () => {
    createRoot(document.createElement('div')).render(
      createElement(QueryClientProvider, { client: queryClient }, probe)
    )
  })
  return { queryClient, api: () => latest! }
}

const chats = [{ id: 'c1', title: 'Chat one' }]

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData(historyKeys.all, chats)
  queryClient.setQueryData(historyKeys.detail('c1'), [])
}

describe('historyKeys', () => {
  it('nests each chat under the history root', () => {
    expect(historyKeys.all).toEqual(['history'])
    expect(historyKeys.detail('c1')).toEqual(['history', 'detail', 'c1'])
  })
})

describe('useChatHistory', () => {
  beforeEach(() => {
    fetcherMock.mockResolvedValue(chats)
  })
  afterEach(() => {
    fetcherMock.mockReset()
  })

  it('fetches the list once and caches it at historyKeys.all', async () => {
    const { queryClient, api } = await mountHook(useChatHistory)
    expect(api().isLoading).toBe(true)
    expect(api().data).toBeUndefined()

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(chats))
    })

    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(fetcherMock).toHaveBeenCalledWith('/api/v1/history')
    expect(api().isLoading).toBe(false)
    expect(queryClient.getQueryData(historyKeys.all)).toEqual(chats)
  })
})

describe('useChatMessages', () => {
  afterEach(() => {
    fetcherMock.mockReset()
  })

  it('fetches one chat and caches it at historyKeys.detail(id)', async () => {
    const rows = [{ id: 'm1' }]
    fetcherMock.mockResolvedValue(rows)
    const { queryClient, api } = await mountHook(() => useChatMessages('c1'))

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(rows))
    })

    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(fetcherMock).toHaveBeenCalledWith('/api/v1/chat/c1')
    expect(queryClient.getQueryData(historyKeys.detail('c1'))).toEqual(rows)
  })

  it('does not fetch, and is not loading, without an id', async () => {
    const { api } = await mountHook(() => useChatMessages(undefined))

    expect(fetcherMock).not.toHaveBeenCalled()
    expect(api().isLoading).toBe(false)
    expect(api().data).toBeUndefined()
  })
})

describe('useInvalidateChatHistory', () => {
  it('marks the list stale without touching any chat detail', async () => {
    const { queryClient, api } = await mountHook(useInvalidateChatHistory)
    seedCaches(queryClient)

    act(() => {
      api()()
    })

    expect(queryClient.getQueryState(historyKeys.all)?.isInvalidated).toBe(true)
    expect(
      queryClient.getQueryState(historyKeys.detail('c1'))?.isInvalidated
    ).toBe(false)
  })
})

describe('useUpdateChat', () => {
  afterEach(() => {
    updateChatService.mockReset()
    sileoSuccess.mockClear()
    sileoError.mockClear()
    report.mockClear()
  })

  it('saves, marks only the list stale, and toasts', async () => {
    updateChatService.mockResolvedValue(null)
    const { queryClient, api } = await mountHook(useUpdateChat)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync({ id: 'c1', favorite: true })
    })

    expect(updateChatService).toHaveBeenCalledWith({
      id: 'c1',
      favorite: true
    })
    expect(queryClient.getQueryState(historyKeys.all)?.isInvalidated).toBe(true)
    // A rename must not re-GET the open chat's messages: the delete path would
    // 404 on it, and a finished run would swap the messages under `<Chat>`.
    expect(
      queryClient.getQueryState(historyKeys.detail('c1'))?.isInvalidated
    ).toBe(false)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'chat:toast.chatUpdated'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('a failed save reaches the global handler only: reported and toasted, nothing invalidated', async () => {
    updateChatService.mockRejectedValue(new Error('disk full'))
    const { queryClient, api } = await mountHookOnAppClient(useUpdateChat)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ id: 'c1', title: 'x' })
        .catch(() => {})
    })

    expect(queryClient.getQueryState(historyKeys.all)?.isInvalidated).toBe(
      false
    )
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('mutation', expect.any(Error), {
      mutationKey: undefined
    })
    expect(sileoError).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'errors:generic',
      description: 'disk full'
    })
  })
})

describe('useDeleteChat', () => {
  beforeEach(() => {
    window.location.hash = '#/chat/c1'
  })
  afterEach(() => {
    deleteChatService.mockReset()
    sileoSuccess.mockClear()
    sileoError.mockClear()
    report.mockClear()
  })

  it('deletes by id, marks only the list stale, and toasts with the chat title', async () => {
    deleteChatService.mockResolvedValue(null)
    const { queryClient, api } = await mountHook(useDeleteChat)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync({ chat: { id: 'c1', title: 'Old chat' } })
    })

    expect(deleteChatService).toHaveBeenCalledWith('c1')
    expect(queryClient.getQueryState(historyKeys.all)?.isInvalidated).toBe(true)
    // The deleted chat's detail would 404 on a refetch — the list is all that
    // has to change.
    expect(
      queryClient.getQueryState(historyKeys.detail('c1'))?.isInvalidated
    ).toBe(false)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'chat:toast.chatDeleted',
      description: 'Old chat'
    })
  })

  it('goes home when the deleted chat is the open one', async () => {
    deleteChatService.mockResolvedValue(null)
    const { api } = await mountHook(useDeleteChat)

    await act(async () => {
      await api().mutateAsync({
        chat: { id: 'c1', title: 'Old chat' },
        currentId: 'c1'
      })
    })

    expect(window.location.hash).toBe('#/')
  })

  it('stays put when another chat is open, or none', async () => {
    deleteChatService.mockResolvedValue(null)
    const { api } = await mountHook(useDeleteChat)

    await act(async () => {
      await api().mutateAsync({
        chat: { id: 'c1', title: 'Old chat' },
        currentId: 'c2'
      })
    })
    expect(window.location.hash).toBe('#/chat/c1')

    await act(async () => {
      await api().mutateAsync({ chat: { id: 'c1', title: 'Old chat' } })
    })
    expect(window.location.hash).toBe('#/chat/c1')
  })

  it('a failed delete reaches the global handler only: no navigation, no success toast', async () => {
    deleteChatService.mockRejectedValue(new Error('locked'))
    const { queryClient, api } = await mountHookOnAppClient(useDeleteChat)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ chat: { id: 'c1', title: 'Old chat' }, currentId: 'c1' })
        .catch(() => {})
    })

    expect(window.location.hash).toBe('#/chat/c1')
    expect(queryClient.getQueryState(historyKeys.all)?.isInvalidated).toBe(
      false
    )
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'errors:generic',
      description: 'locked'
    })
  })
})
