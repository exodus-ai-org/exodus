// @vitest-environment happy-dom
import {
  focusManager,
  QueryClient,
  QueryClientProvider
} from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetcherMock = vi.fn()
vi.mock('@exodus/shared/utils/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@exodus/shared/utils/http')>()),
  fetcher: (...args: unknown[]) => fetcherMock(...args)
}))
const getProjectsService = vi.fn()
const getProjectService = vi.fn()
const createProjectService = vi.fn()
const updateProjectService = vi.fn()
const deleteProjectService = vi.fn()
vi.mock('@/services/project', () => ({
  getProjects: (...args: unknown[]) => getProjectsService(...args),
  getProject: (...args: unknown[]) => getProjectService(...args),
  createProject: (...args: unknown[]) => createProjectService(...args),
  updateProject: (...args: unknown[]) => updateProjectService(...args),
  deleteProject: (...args: unknown[]) => deleteProjectService(...args)
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
  projectKeys,
  useProjects,
  useProject,
  useProjectChats,
  useCreateProject,
  useUpdateProject,
  useDeleteProject
} = await import('@/hooks/use-projects')
const { historyKeys } = await import('@/hooks/use-chat-history')
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

// useProjects/useProjectChats can opt into refetchOnWindowFocus, and every
// mounted client listens to the one global focusManager: a root left mounted
// from an earlier test would answer a later test's focus toggles with
// requests of its own.
const mounted: Array<() => Promise<void>> = []

async function mountHook<T>(hook: () => T) {
  let latest: T | undefined
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  const probe = createElement(Probe<T>, {
    hook,
    onReady: (value) => (latest = value)
  })
  const root = createRoot(document.createElement('div'))
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

// The app's own client, so a failing mutation goes through the real
// `mutationCache.onError` (report + toast) instead of a hook-local catch.
async function mountHookOnAppClient<T>(hook: () => T) {
  let latest: T | undefined
  const queryClient = createAppQueryClient()
  const probe = createElement(Probe<T>, {
    hook,
    onReady: (value) => (latest = value)
  })
  const root = createRoot(document.createElement('div'))
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

afterEach(async () => {
  for (const unmount of mounted.splice(0)) await unmount()
  focusManager.setFocused(undefined)
})

const p1 = { id: 'p1', name: 'Alpha' }
const p2 = { id: 'p2', name: 'Beta' }
const projects = [p1, p2]

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData(projectKeys.all, projects)
  queryClient.setQueryData(projectKeys.detail('p1'), p1)
  queryClient.setQueryData(projectKeys.chats('p1'), [])
  queryClient.setQueryData(projectKeys.detail('p2'), p2)
  queryClient.setQueryData(projectKeys.chats('p2'), [])
  queryClient.setQueryData(historyKeys.all, [])
}

const isInvalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated

const resetMocks = () => {
  fetcherMock.mockReset()
  getProjectsService.mockReset()
  getProjectService.mockReset()
  createProjectService.mockReset()
  updateProjectService.mockReset()
  deleteProjectService.mockReset()
  sileoSuccess.mockClear()
  sileoError.mockClear()
  report.mockClear()
}

describe('projectKeys', () => {
  it('nests every project query under the project root', () => {
    expect(projectKeys.all).toEqual(['project'])
    expect(projectKeys.detail('p1')).toEqual(['project', 'detail', 'p1'])
    expect(projectKeys.chats('p1')).toEqual(['project', 'chats', 'p1'])
  })
})

describe('useProjects', () => {
  afterEach(resetMocks)

  it('fetches the list once and caches it at projectKeys.all', async () => {
    getProjectsService.mockResolvedValue(projects)
    const { queryClient, api } = await mountHook(useProjects)
    expect(api().isLoading).toBe(true)
    expect(api().data).toBeUndefined()

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(projects))
    })

    expect(getProjectsService).toHaveBeenCalledTimes(1)
    expect(api().isLoading).toBe(false)
    expect(queryClient.getQueryData(projectKeys.all)).toEqual(projects)
  })

  it('reads again when the window regains focus, so a project exodus-ios or the CLI edited shows up, although the app turns that off', async () => {
    getProjectsService
      .mockResolvedValueOnce(projects)
      .mockResolvedValueOnce([
        ...projects,
        { id: 'p3', name: 'From the phone' }
      ])
    const { queryClient, api } = await mountHookOnAppClient(useProjects)
    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(projects))
    })
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      false
    )

    await act(async () => {
      focusManager.setFocused(false)
    })
    expect(getProjectsService).toHaveBeenCalledTimes(1)

    await act(async () => {
      focusManager.setFocused(true)
      await vi.waitFor(() => expect(api().data).toHaveLength(3))
    })

    expect(getProjectsService).toHaveBeenCalledTimes(2)
    expect(report).not.toHaveBeenCalled()
  })
})

describe('useProject', () => {
  afterEach(resetMocks)

  it('fetches one project and caches it at projectKeys.detail(id)', async () => {
    const detail = { ...p1, chatCount: 3 }
    getProjectService.mockResolvedValue(detail)
    const { queryClient, api } = await mountHook(() => useProject('p1'))

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(detail))
    })

    expect(getProjectService).toHaveBeenCalledTimes(1)
    expect(getProjectService).toHaveBeenCalledWith('p1')
    expect(queryClient.getQueryData(projectKeys.detail('p1'))).toEqual(detail)
  })

  it('does not fetch, and is not loading, without an id', async () => {
    const { api } = await mountHook(() => useProject(undefined))

    expect(getProjectService).not.toHaveBeenCalled()
    expect(api().isLoading).toBe(false)
    expect(api().data).toBeUndefined()
  })
})

describe('useProjectChats', () => {
  afterEach(resetMocks)

  it("fetches the project's own chats, cached apart from the unfiltered history", async () => {
    const rows = [{ id: 'c1', title: 'In the project' }]
    fetcherMock.mockResolvedValue(rows)
    const { queryClient, api } = await mountHook(() => useProjectChats('p1'))

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(rows))
    })

    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(fetcherMock).toHaveBeenCalledWith('/api/v1/history?projectId=p1')
    expect(queryClient.getQueryData(projectKeys.chats('p1'))).toEqual(rows)
    expect(queryClient.getQueryData(historyKeys.all)).toBeUndefined()
  })

  it('does not fetch, and is not loading, without an id', async () => {
    const { api } = await mountHook(() => useProjectChats(undefined))

    expect(fetcherMock).not.toHaveBeenCalled()
    expect(api().isLoading).toBe(false)
    expect(api().data).toBeUndefined()
  })

  it('reads again when the window regains focus, so a chat exodus-ios or the CLI moved into the project shows up, although the app turns that off', async () => {
    const rows = [{ id: 'c1', title: 'In the project' }]
    fetcherMock
      .mockResolvedValueOnce(rows)
      .mockResolvedValueOnce([...rows, { id: 'c2', title: 'Moved in' }])
    const { queryClient, api } = await mountHookOnAppClient(() =>
      useProjectChats('p1')
    )
    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(rows))
    })
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(
      false
    )

    await act(async () => {
      focusManager.setFocused(false)
    })
    expect(fetcherMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      focusManager.setFocused(true)
      await vi.waitFor(() => expect(api().data).toHaveLength(2))
    })

    expect(fetcherMock).toHaveBeenCalledTimes(2)
    expect(report).not.toHaveBeenCalled()
  })
})

describe('useCreateProject', () => {
  afterEach(resetMocks)

  it('creates, marks only the list stale, toasts, and hands back the new project', async () => {
    createProjectService.mockResolvedValue({ id: 'p3', name: 'New' })
    const { queryClient, api } = await mountHook(useCreateProject)
    seedCaches(queryClient)

    let created: unknown
    await act(async () => {
      created = await api().mutateAsync({ name: 'New' })
    })

    expect(created).toEqual({ id: 'p3', name: 'New' })
    expect(createProjectService).toHaveBeenCalledWith({ name: 'New' })
    expect(isInvalidated(queryClient, projectKeys.all)).toBe(true)
    // `all` is a prefix of every project's detail and chats: a bare prefix
    // invalidation would re-GET what is open on screen.
    expect(isInvalidated(queryClient, projectKeys.detail('p1'))).toBe(false)
    expect(isInvalidated(queryClient, projectKeys.chats('p1'))).toBe(false)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'chat:projectDetail.toast.createdTitle'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('a failed create reaches the global handler only: reported and toasted, nothing invalidated', async () => {
    createProjectService.mockRejectedValue(new Error('name taken'))
    const { queryClient, api } = await mountHookOnAppClient(useCreateProject)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ name: 'Alpha' })
        .catch(() => {})
    })

    expect(isInvalidated(queryClient, projectKeys.all)).toBe(false)
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('mutation', expect.any(Error), {
      mutationKey: undefined
    })
    expect(sileoError).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'errors:generic',
      description: 'name taken'
    })
  })
})

describe('useUpdateProject', () => {
  afterEach(resetMocks)

  it('saves, marks the list and that project stale, and toasts', async () => {
    updateProjectService.mockResolvedValue(p1)
    const { queryClient, api } = await mountHook(useUpdateProject)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync({ id: 'p1', data: { name: 'Alpha 2' } })
    })

    expect(updateProjectService).toHaveBeenCalledWith('p1', { name: 'Alpha 2' })
    expect(isInvalidated(queryClient, projectKeys.all)).toBe(true)
    expect(isInvalidated(queryClient, projectKeys.detail('p1'))).toBe(true)
    expect(isInvalidated(queryClient, projectKeys.chats('p1'))).toBe(false)
    expect(isInvalidated(queryClient, projectKeys.detail('p2'))).toBe(false)
    expect(isInvalidated(queryClient, projectKeys.chats('p2'))).toBe(false)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'chat:projectDetail.toast.updatedTitle'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('a failed save reaches the global handler only: reported and toasted, nothing invalidated', async () => {
    updateProjectService.mockRejectedValue(new Error('disk full'))
    const { queryClient, api } = await mountHookOnAppClient(useUpdateProject)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ id: 'p1', data: { name: 'x' } })
        .catch(() => {})
    })

    expect(isInvalidated(queryClient, projectKeys.all)).toBe(false)
    expect(isInvalidated(queryClient, projectKeys.detail('p1'))).toBe(false)
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'errors:generic',
      description: 'disk full'
    })
  })
})

describe('useDeleteProject', () => {
  beforeEach(() => {
    deleteProjectService.mockResolvedValue(undefined)
  })
  afterEach(resetMocks)

  it('deletes by id, marks the lists stale, drops that project, and toasts with its name', async () => {
    const { queryClient, api } = await mountHook(useDeleteProject)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync({ id: 'p1', name: 'Alpha' })
    })

    expect(deleteProjectService).toHaveBeenCalledWith('p1')
    expect(isInvalidated(queryClient, projectKeys.all)).toBe(true)
    // Deleting a project deletes its chats, and focus refetching is off, so
    // the sidebar's chat list would keep them until something else refetched.
    expect(isInvalidated(queryClient, historyKeys.all)).toBe(true)
    // The deleted project's detail and chats would 404 on a refetch: they go,
    // rather than get invalidated. The neighbour is untouched.
    expect(queryClient.getQueryState(projectKeys.detail('p1'))).toBeUndefined()
    expect(queryClient.getQueryState(projectKeys.chats('p1'))).toBeUndefined()
    expect(queryClient.getQueryData(projectKeys.detail('p2'))).toEqual(p2)
    expect(isInvalidated(queryClient, projectKeys.detail('p2'))).toBe(false)
    expect(isInvalidated(queryClient, projectKeys.chats('p2'))).toBe(false)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'chat:projectDetail.toast.deletedTitle',
      description: 'Alpha'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('leaves a project that is still on screen alone: no re-GET of the deleted project', async () => {
    getProjectService.mockResolvedValue({ ...p1, chatCount: 0 })
    const { queryClient, api } = await mountHook(() => ({
      project: useProject('p1'),
      remove: useDeleteProject()
    }))
    await act(async () => {
      await vi.waitFor(() => expect(api().project.data).toBeDefined())
    })
    expect(getProjectService).toHaveBeenCalledTimes(1)

    // Removing a query that has an observer and then re-rendering it makes the
    // observer build a fresh query and fetch it — a 404 for a deleted project.
    await act(async () => {
      await api().remove.mutateAsync({ id: 'p1', name: 'Alpha' })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(getProjectService).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(projectKeys.detail('p1'))).toBeDefined()
  })

  it('a failed delete reaches the global handler only: nothing invalidated or removed, no success toast', async () => {
    deleteProjectService.mockRejectedValue(new Error('locked'))
    const { queryClient, api } = await mountHookOnAppClient(useDeleteProject)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ id: 'p1', name: 'Alpha' })
        .catch(() => {})
    })

    expect(isInvalidated(queryClient, projectKeys.all)).toBe(false)
    expect(isInvalidated(queryClient, historyKeys.all)).toBe(false)
    expect(queryClient.getQueryData(projectKeys.detail('p1'))).toEqual(p1)
    expect(queryClient.getQueryData(projectKeys.chats('p1'))).toEqual([])
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'errors:generic',
      description: 'locked'
    })
  })
})
