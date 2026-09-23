// @vitest-environment happy-dom
import type {
  SkillAuditResponse,
  SkillCuratedResponse,
  SkillDetail,
  SkillListResponse,
  SkillSearchResponse,
  SkillsView
} from '@exodus/shared/types/skills'
import {
  QueryClient,
  QueryClientProvider,
  type QueryKey
} from '@tanstack/react-query'
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithQueryClient } from '../../helpers/query-test-utils'

const getSkillsRegistryService = vi.fn()
const searchSkillsService = vi.fn()
const getSkillDetailService = vi.fn()
const getSkillAuditService = vi.fn()
const getCuratedSkillsService = vi.fn()
vi.mock('@/services/skills', () => ({
  getSkillsRegistry: (...args: unknown[]) => getSkillsRegistryService(...args),
  searchSkills: (...args: unknown[]) => searchSkillsService(...args),
  getSkillDetail: (...args: unknown[]) => getSkillDetailService(...args),
  getSkillAudit: (...args: unknown[]) => getSkillAuditService(...args),
  getCuratedSkills: (...args: unknown[]) => getCuratedSkillsService(...args)
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
  skillsKeys,
  useCuratedSkills,
  useSkillAudit,
  useSkillDetail,
  useSkillsInfiniteRegistry,
  useSkillsSearch
} = await import('@/hooks/use-skills-registry')
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

// Roots the test mounted, unmounted in afterEach so none outlives its test.
const mounted: Array<() => Promise<void>> = []

// Mounts on a client the test owns, so a second mount can share its cache and
// the first can be unmounted (the tab closing and opening again).
async function mountOn<T>(queryClient: QueryClient, hook: () => T) {
  let latest: T | undefined
  const root = createRoot(document.createElement('div'))
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(Probe<T>, {
          hook,
          onReady: (value) => {
            latest = value
          }
        })
      )
    )
  })
  const unmount = async () => {
    await act(async () => {
      root.unmount()
    })
  }
  mounted.push(unmount)
  return { api: () => latest!, unmount }
}

async function mountHook<T>(hook: () => T) {
  let latest: T | undefined
  const { queryClient } = await renderWithQueryClient(
    createElement(Probe<T>, { hook, onReady: (value) => (latest = value) })
  )
  return { queryClient, api: () => latest! }
}

// The app's own client, so a failing read goes through the real
// `queryCache.onError`; retries off so the failure lands without a backoff.
async function mountHookOnAppClient<T>(hook: () => T) {
  const queryClient = createAppQueryClient()
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false }
  })
  return { queryClient, ...(await mountOn(queryClient, hook)) }
}

const plainClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } })

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const item = (n: number) => ({
  id: `owner/repo/skill-${n}`,
  slug: `skill-${n}`,
  name: `skill-${n}`,
  source: 'owner/repo',
  installs: 100 - n,
  sourceType: 'github',
  installUrl: 'https://github.com/owner/repo',
  url: `https://skills.sh/owner/repo/skill-${n}`
})

const page = (n: number, hasMore: boolean, total = 57): SkillListResponse => ({
  data: [item(n)],
  pagination: { page: n, perPage: 24, total, hasMore }
})

const searchResponse: SkillSearchResponse = {
  data: [item(1)],
  query: 'pdf',
  searchType: 'fuzzy',
  count: 1,
  durationMs: 4
}

const ID = 'anthropics/skills/pdf'
const detail: SkillDetail = {
  id: ID,
  source: 'anthropics/skills',
  slug: 'pdf',
  installs: 9,
  hash: 'abc',
  files: [{ path: 'SKILL.md', contents: '# PDF' }]
}

const audit: SkillAuditResponse = {
  id: ID,
  source: 'anthropics/skills',
  slug: 'pdf',
  audits: []
}

const curated: SkillCuratedResponse = {
  data: [],
  totalOwners: 0,
  totalSkills: 0,
  generatedAt: '2026-09-23T00:00:00.000Z'
}

interface Read {
  name: string
  service: typeof getSkillsRegistryService
  value: unknown
  key: QueryKey
  staleMs: number
  hook: () => { data: unknown; isLoading: boolean }
}

interface RetryableRead extends Omit<Read, 'hook'> {
  hook: () => {
    data: unknown
    isLoading: boolean
    error: Error | null
    refetch: () => Promise<unknown>
  }
}

const FIVE_MIN = 5 * 60_000
const TEN_MIN = 10 * 60_000

// The four reads a component shows a "load failed" state and a retry for.
const retryableReads: RetryableRead[] = [
  {
    name: 'the registry',
    service: getSkillsRegistryService,
    value: page(0, false),
    key: skillsKeys.registry('all-time'),
    staleMs: FIVE_MIN,
    hook: () => useSkillsInfiniteRegistry('all-time')
  },
  {
    name: 'a search',
    service: searchSkillsService,
    value: searchResponse,
    key: skillsKeys.search('pdf'),
    staleMs: FIVE_MIN,
    hook: () => useSkillsSearch('pdf')
  },
  {
    name: 'a detail',
    service: getSkillDetailService,
    value: detail,
    key: skillsKeys.detail(ID),
    staleMs: FIVE_MIN,
    hook: () => useSkillDetail(ID)
  },
  {
    name: 'the curated list',
    service: getCuratedSkillsService,
    value: curated,
    key: skillsKeys.curated,
    staleMs: TEN_MIN,
    hook: useCuratedSkills
  }
]

const auditRead: Read = {
  name: 'an audit',
  service: getSkillAuditService,
  value: audit,
  key: skillsKeys.audit(ID),
  staleMs: FIVE_MIN,
  hook: () => useSkillAudit(ID)
}

const reads: Read[] = [...retryableReads, auditRead]

afterEach(async () => {
  vi.useRealTimers()
  for (const unmount of mounted.splice(0)) await unmount()
  getSkillsRegistryService.mockReset()
  searchSkillsService.mockReset()
  getSkillDetailService.mockReset()
  getSkillAuditService.mockReset()
  getCuratedSkillsService.mockReset()
  report.mockClear()
  sileoSuccess.mockClear()
  sileoError.mockClear()
})

describe('skillsKeys', () => {
  it('nests every read under one skills root, distinct per view, query and id', () => {
    expect(skillsKeys.registry('all-time')).toEqual([
      'skills',
      'registry',
      'all-time'
    ])
    expect(skillsKeys.registry('trending')).toEqual([
      'skills',
      'registry',
      'trending'
    ])
    expect(skillsKeys.registry('hot')).not.toEqual(
      skillsKeys.registry('trending')
    )
    expect(skillsKeys.search('pdf')).toEqual(['skills', 'search', 'pdf'])
    expect(skillsKeys.search('pdf')).not.toEqual(skillsKeys.search('sql'))
    expect(skillsKeys.detail(ID)).toEqual(['skills', 'detail', ID])
    expect(skillsKeys.audit(ID)).toEqual(['skills', 'audit', ID])
    expect(skillsKeys.detail(ID)).not.toEqual(skillsKeys.audit(ID))
    expect(skillsKeys.curated).toEqual(['skills', 'curated'])
  })
})

describe('useSkillsInfiniteRegistry', () => {
  it('reads page 0 only on the first render, caches it, and has the total in pages[0]', async () => {
    const first = deferred<SkillListResponse>()
    getSkillsRegistryService.mockReturnValue(first.promise)
    const { queryClient, api } = await mountHook(() =>
      useSkillsInfiniteRegistry('all-time')
    )
    expect(api().isLoading).toBe(true)
    expect(api().data).toBeUndefined()

    await act(async () => {
      first.resolve(page(0, true, 57))
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(1))
    })

    expect(getSkillsRegistryService).toHaveBeenCalledTimes(1)
    expect(getSkillsRegistryService).toHaveBeenCalledWith('all-time', 0)
    expect(api().isLoading).toBe(false)
    expect(api().data?.pages[0]?.pagination.total).toBe(57)
    expect(api().hasNextPage).toBe(true)
    expect(queryClient.getQueryData(skillsKeys.registry('all-time'))).toEqual({
      pages: [page(0, true, 57)],
      pageParams: [0]
    })
  })

  it('fetchNextPage asks for page 1 and does not read page 0 again, until a page says there is no more', async () => {
    getSkillsRegistryService.mockImplementation(
      (_view: SkillsView, index: number) =>
        Promise.resolve(page(index, index < 2))
    )
    const { api } = await mountHook(() => useSkillsInfiniteRegistry('trending'))
    await act(async () => {
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(1))
    })

    await act(async () => {
      await api().fetchNextPage()
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(2))
    })

    expect(getSkillsRegistryService.mock.calls).toEqual([
      ['trending', 0],
      ['trending', 1]
    ])
    expect(api().data?.pages.map((p) => p.pagination.page)).toEqual([0, 1])
    expect(api().hasNextPage).toBe(true)

    await act(async () => {
      await api().fetchNextPage()
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(3))
    })

    expect(getSkillsRegistryService.mock.calls).toEqual([
      ['trending', 0],
      ['trending', 1],
      ['trending', 2]
    ])
    expect(api().hasNextPage).toBe(false)

    await act(async () => {
      await api().fetchNextPage()
    })
    expect(getSkillsRegistryService).toHaveBeenCalledTimes(3)
  })

  it('has no next page when the first one says hasMore is false', async () => {
    getSkillsRegistryService.mockResolvedValue(page(0, false, 3))
    const { api } = await mountHook(() => useSkillsInfiniteRegistry('hot'))

    await act(async () => {
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(1))
    })

    expect(api().hasNextPage).toBe(false)
  })

  it('is loading-more, not loading, while a next page is on its way, and keeps the pages it has', async () => {
    const second = deferred<SkillListResponse>()
    getSkillsRegistryService
      .mockResolvedValueOnce(page(0, true))
      .mockReturnValueOnce(second.promise)
    const { api } = await mountHook(() => useSkillsInfiniteRegistry('all-time'))
    await act(async () => {
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(1))
    })
    expect(api().isFetchingNextPage).toBe(false)

    await act(async () => {
      void api().fetchNextPage()
      await vi.waitFor(() => expect(api().isFetchingNextPage).toBe(true))
    })

    expect(api().isLoading).toBe(false)
    expect(api().data?.pages).toHaveLength(1)

    await act(async () => {
      second.resolve(page(1, false))
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(2))
    })
    expect(api().isFetchingNextPage).toBe(false)
    expect(api().hasNextPage).toBe(false)
  })

  it('keeps each view in a cache of its own', async () => {
    const ofView = (view: SkillsView) => ({
      ...page(0, false),
      data: [{ ...item(0), id: `${view}/repo/skill` }]
    })
    const trending = deferred<SkillListResponse>()
    getSkillsRegistryService
      .mockResolvedValueOnce(ofView('all-time'))
      .mockReturnValueOnce(trending.promise)
    const { api, queryClient } = await mountHook(() => {
      const [view, setView] = useState<SkillsView>('all-time')
      return { ...useSkillsInfiniteRegistry(view), setView }
    })
    await act(async () => {
      await vi.waitFor(() =>
        expect(api().data?.pages[0]?.data[0]?.id).toBe('all-time/repo/skill')
      )
    })

    await act(async () => {
      api().setView('trending')
    })

    expect(getSkillsRegistryService).toHaveBeenLastCalledWith('trending', 0)
    expect(api().data).toBeUndefined()
    expect(api().isLoading).toBe(true)
    await act(async () => {
      trending.resolve(ofView('trending'))
      await vi.waitFor(() =>
        expect(api().data?.pages[0]?.data[0]?.id).toBe('trending/repo/skill')
      )
    })
    expect(
      queryClient.getQueryData<{ pages: SkillListResponse[] }>(
        skillsKeys.registry('all-time')
      )?.pages[0]?.data[0]?.id
    ).toBe('all-time/repo/skill')
  })

  it('shares one request between the tab total and the leaderboard reading the same view', async () => {
    getSkillsRegistryService.mockResolvedValue(page(0, true, 57))
    const { api } = await mountHook(() => ({
      tab: useSkillsInfiniteRegistry('all-time'),
      board: useSkillsInfiniteRegistry('all-time')
    }))

    await act(async () => {
      await vi.waitFor(() => expect(api().board.data?.pages).toHaveLength(1))
    })

    expect(getSkillsRegistryService).toHaveBeenCalledTimes(1)
    expect(getSkillsRegistryService).toHaveBeenCalledWith('all-time', 0)
    expect(api().tab.data?.pages[0]?.pagination.total).toBe(57)
    expect(api().board.data).toBe(api().tab.data)
  })

  it('a failed load-more is reported, keeps the pages already read, and a second try reads the same page', async () => {
    getSkillsRegistryService
      .mockResolvedValueOnce(page(0, true))
      .mockRejectedValueOnce(new Error('relay hiccup'))
      .mockResolvedValueOnce(page(1, false))
    const { api } = await mountHookOnAppClient(() =>
      useSkillsInfiniteRegistry('all-time')
    )
    await act(async () => {
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(1))
    })

    await act(async () => {
      await api().fetchNextPage()
      await vi.waitFor(() => expect(api().error).toBeInstanceOf(Error))
    })

    expect(api().data?.pages).toHaveLength(1)
    expect(api().hasNextPage).toBe(true)
    expect(api().isFetchingNextPage).toBe(false)
    expect(report).toHaveBeenCalledTimes(1)
    expect(sileoError).not.toHaveBeenCalled()

    await act(async () => {
      await api().fetchNextPage()
      await vi.waitFor(() => expect(api().data?.pages).toHaveLength(2))
    })

    expect(getSkillsRegistryService.mock.calls).toEqual([
      ['all-time', 0],
      ['all-time', 1],
      ['all-time', 1]
    ])
    expect(api().error).toBeNull()
  })

  it('exposes only what the components read', async () => {
    getSkillsRegistryService.mockResolvedValue(page(0, false))
    const { api } = await mountHook(() => useSkillsInfiniteRegistry('all-time'))

    expect(Object.keys(api()).sort()).toEqual(
      [
        'data',
        'error',
        'fetchNextPage',
        'hasNextPage',
        'isFetchingNextPage',
        'isLoading',
        'refetch'
      ].sort()
    )
  })
})

describe('useSkillsSearch', () => {
  it('makes no request, and is not loading, for an empty query, and starts once there is one', async () => {
    const results = deferred<SkillSearchResponse>()
    searchSkillsService.mockReturnValue(results.promise)
    const { api, queryClient } = await mountHook(() => {
      const [query, setQuery] = useState('')
      return { ...useSkillsSearch(query), setQuery }
    })

    expect(searchSkillsService).not.toHaveBeenCalled()
    expect(api().isLoading).toBe(false)
    expect(api().data).toBeUndefined()

    await act(async () => {
      api().setQuery('pdf')
    })
    expect(api().isLoading).toBe(true)
    await act(async () => {
      results.resolve(searchResponse)
      await vi.waitFor(() => expect(api().data).toEqual(searchResponse))
    })

    expect(searchSkillsService).toHaveBeenCalledTimes(1)
    expect(searchSkillsService).toHaveBeenCalledWith('pdf')
    expect(queryClient.getQueryData(skillsKeys.search('pdf'))).toEqual(
      searchResponse
    )
  })

  it('hands the query to the service as typed, which encodes it for the URL', async () => {
    searchSkillsService.mockResolvedValue(searchResponse)
    const { api } = await mountHook(() => useSkillsSearch('a&b=c d'))

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(searchResponse))
    })

    expect(searchSkillsService).toHaveBeenCalledWith('a&b=c d')
  })

  it('a changed query is a new key: it reads as loading until it lands, and the old one stays cached', async () => {
    const second = deferred<SkillSearchResponse>()
    searchSkillsService
      .mockResolvedValueOnce(searchResponse)
      .mockReturnValueOnce(second.promise)
    const { api, queryClient } = await mountHook(() => {
      const [query, setQuery] = useState('pdf')
      return { ...useSkillsSearch(query), setQuery }
    })
    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(searchResponse))
    })

    await act(async () => {
      api().setQuery('sql')
    })

    expect(searchSkillsService).toHaveBeenLastCalledWith('sql')
    expect(api().data).toBeUndefined()
    expect(api().isLoading).toBe(true)

    const sqlResults = { ...searchResponse, query: 'sql' }
    await act(async () => {
      second.resolve(sqlResults)
      await vi.waitFor(() => expect(api().data).toEqual(sqlResults))
    })
    expect(queryClient.getQueryData(skillsKeys.search('pdf'))).toEqual(
      searchResponse
    )
    expect(queryClient.getQueryData(skillsKeys.search('sql'))).toEqual(
      sqlResults
    )
  })
})

describe('useSkillDetail', () => {
  it('reads the detail of an id and caches it under that id', async () => {
    const pending = deferred<SkillDetail>()
    getSkillDetailService.mockReturnValue(pending.promise)
    const { api, queryClient } = await mountHook(() => useSkillDetail(ID))
    expect(api().isLoading).toBe(true)

    await act(async () => {
      pending.resolve(detail)
      await vi.waitFor(() => expect(api().data).toEqual(detail))
    })

    expect(getSkillDetailService).toHaveBeenCalledTimes(1)
    expect(getSkillDetailService).toHaveBeenCalledWith(ID)
    expect(api().isLoading).toBe(false)
    expect(queryClient.getQueryData(skillsKeys.detail(ID))).toEqual(detail)
    expect(getSkillAuditService).not.toHaveBeenCalled()
  })

  it('a different id is a different read', async () => {
    const other = deferred<SkillDetail>()
    getSkillDetailService
      .mockResolvedValueOnce(detail)
      .mockReturnValueOnce(other.promise)
    const { api, queryClient } = await mountHook(() => {
      const [id, setId] = useState(ID)
      return { ...useSkillDetail(id), setId }
    })
    await act(async () => {
      await vi.waitFor(() => expect(api().data?.id).toBe(ID))
    })

    await act(async () => {
      api().setId('other/repo/skill')
    })
    expect(getSkillDetailService).toHaveBeenLastCalledWith('other/repo/skill')
    expect(api().data).toBeUndefined()
    await act(async () => {
      other.resolve({ ...detail, id: 'other/repo/skill' })
      await vi.waitFor(() => expect(api().data?.id).toBe('other/repo/skill'))
    })

    expect(getSkillDetailService).toHaveBeenCalledTimes(2)
    expect(queryClient.getQueryData(skillsKeys.detail(ID))).toEqual(detail)
  })
})

describe('useSkillAudit', () => {
  it('reads the audit of an id and caches it under that id', async () => {
    const pending = deferred<SkillAuditResponse>()
    getSkillAuditService.mockReturnValue(pending.promise)
    const { api, queryClient } = await mountHook(() => useSkillAudit(ID))
    expect(api().isLoading).toBe(true)

    await act(async () => {
      pending.resolve(audit)
      await vi.waitFor(() => expect(api().data).toEqual(audit))
    })

    expect(getSkillAuditService).toHaveBeenCalledTimes(1)
    expect(getSkillAuditService).toHaveBeenCalledWith(ID)
    expect(queryClient.getQueryData(skillsKeys.audit(ID))).toEqual(audit)
    expect(getSkillDetailService).not.toHaveBeenCalled()
  })

  it('tolerates null for an unaudited skill: a settled success, not an error and not undefined', async () => {
    getSkillAuditService.mockResolvedValue(null)
    const { api, queryClient } = await mountHookOnAppClient(() =>
      useSkillAudit(ID)
    )

    await act(async () => {
      await vi.waitFor(() => expect(api().isLoading).toBe(false))
    })

    expect(api().data).toBeNull()
    expect(queryClient.getQueryData(skillsKeys.audit(ID))).toBeNull()
    expect(queryClient.getQueryState(skillsKeys.audit(ID))?.status).toBe(
      'success'
    )
    expect(report).not.toHaveBeenCalled()
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('exposes only what the panel reads', async () => {
    getSkillAuditService.mockResolvedValue(audit)
    const { api } = await mountHook(() => useSkillAudit(ID))

    expect(Object.keys(api()).sort()).toEqual(['data', 'isLoading'])
  })
})

describe('useCuratedSkills', () => {
  it('reads the curated list once, with no parameters, and caches it', async () => {
    const pending = deferred<SkillCuratedResponse>()
    getCuratedSkillsService.mockReturnValue(pending.promise)
    const { api, queryClient } = await mountHook(useCuratedSkills)
    expect(api().isLoading).toBe(true)

    await act(async () => {
      pending.resolve(curated)
      await vi.waitFor(() => expect(api().data).toEqual(curated))
    })

    expect(getCuratedSkillsService).toHaveBeenCalledTimes(1)
    expect(getCuratedSkillsService).toHaveBeenCalledWith()
    expect(queryClient.getQueryData(skillsKeys.curated)).toEqual(curated)
  })

  it('keeps the list for ten minutes after the tab is left, so coming back does not download it again', async () => {
    vi.useFakeTimers()
    getCuratedSkillsService.mockResolvedValue(curated)
    const queryClient = plainClient()
    const first = await mountOn(queryClient, useCuratedSkills)
    await advance(0)
    expect(first.api().data).toEqual(curated)
    await first.unmount()

    await advance(TEN_MIN - FIVE_MIN + 1_000)
    const second = await mountOn(queryClient, useCuratedSkills)
    await advance(0)

    // Past the default five minutes both for staleness and for garbage collection.
    expect(second.api().data).toEqual(curated)
    expect(second.api().isLoading).toBe(false)
    expect(getCuratedSkillsService).toHaveBeenCalledTimes(1)
  })
})

describe.each(reads)('reading $name', (read) => {
  it(`is not read again for a mount within ${read.staleMs / 60_000} minutes, and is from then on`, async () => {
    vi.useFakeTimers()
    read.service.mockResolvedValue(read.value)
    const queryClient = plainClient()
    const first = await mountOn(queryClient, read.hook)
    await advance(0)
    expect(read.service).toHaveBeenCalledTimes(1)
    expect(first.api().data).toBeDefined()
    await first.unmount()

    await advance(read.staleMs - 1)
    const second = await mountOn(queryClient, read.hook)
    await advance(0)
    expect(read.service).toHaveBeenCalledTimes(1)
    expect(second.api().data).toBeDefined()
    expect(second.api().isLoading).toBe(false)
    await second.unmount()

    await advance(1)
    await mountOn(queryClient, read.hook)
    await advance(0)
    expect(read.service).toHaveBeenCalledTimes(2)
  })

  it('a failed read is reported once and never toasted, and leaves the data undefined', async () => {
    read.service.mockRejectedValue(new Error('relay is down'))
    const { api } = await mountHookOnAppClient(read.hook)

    await act(async () => {
      await vi.waitFor(() => expect(api().isLoading).toBe(false))
    })

    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('query', expect.any(Error), {
      queryKey: read.key
    })
    expect(sileoError).not.toHaveBeenCalled()
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(api().data).toBeUndefined()
  })
})

describe.each(retryableReads)('the failure of $name', (read) => {
  it('is exposed as error, and refetch reads again and clears it', async () => {
    read.service
      .mockRejectedValueOnce(new Error('relay is down'))
      .mockResolvedValueOnce(read.value)
    const { api } = await mountHookOnAppClient(read.hook)
    await act(async () => {
      await vi.waitFor(() => expect(api().isLoading).toBe(false))
    })
    expect(api().error).toBeInstanceOf(Error)
    expect(api().data).toBeUndefined()

    await act(async () => {
      await api().refetch()
      await vi.waitFor(() => expect(api().data).toBeDefined())
    })

    expect(read.service).toHaveBeenCalledTimes(2)
    expect(api().error).toBeNull()
    expect(api().isLoading).toBe(false)
  })

  it('reads as loading again while the retry is in flight, not as the empty state', async () => {
    const retry = deferred<unknown>()
    read.service
      .mockRejectedValueOnce(new Error('relay is down'))
      .mockReturnValueOnce(retry.promise)
    const { api } = await mountHookOnAppClient(read.hook)
    await act(async () => {
      await vi.waitFor(() => expect(api().error).toBeInstanceOf(Error))
    })

    await act(async () => {
      void api().refetch()
      await vi.waitFor(() => expect(api().isLoading).toBe(true))
    })

    expect(api().error).toBeNull()

    await act(async () => {
      retry.resolve(read.value)
      await vi.waitFor(() => expect(api().data).toBeDefined())
    })
  })
})
