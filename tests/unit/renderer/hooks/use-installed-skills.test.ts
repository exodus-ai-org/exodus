// @vitest-environment happy-dom
import { QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithQueryClient } from '../../helpers/query-test-utils'

const fetcherMock = vi.fn()
vi.mock('@exodus/shared/utils/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@exodus/shared/utils/http')>()),
  fetcher: (...args: unknown[]) => fetcherMock(...args)
}))
const report = vi.fn()
vi.mock('@/lib/report-error', () => ({
  reportRendererError: (...args: unknown[]) => report(...args)
}))
const sileoError = vi.fn()
vi.mock('sileo', () => ({
  sileo: { error: (...args: unknown[]) => sileoError(...args) }
}))

const { installedSkillsKeys, useInstalledSkills } =
  await import('@/hooks/use-installed-skills')
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

// The app's own client, so a failing read goes through the real
// `queryCache.onError`; retries off so the failure lands without a backoff.
async function mountHookOnAppClient<T>(hook: () => T) {
  let latest: T | undefined
  const queryClient = createAppQueryClient()
  queryClient.setDefaultOptions({
    ...queryClient.getDefaultOptions(),
    queries: { ...queryClient.getDefaultOptions().queries, retry: false }
  })
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

const skills = [
  {
    slug: 'pdf',
    displayName: 'PDF',
    version: '1.0.0',
    isActive: true,
    installPath: '/home/.exodus/skills/pdf',
    installedAt: 1
  },
  {
    slug: 'sql',
    displayName: 'SQL',
    version: '0.2.0',
    isActive: false,
    installPath: '/home/.exodus/skills/sql',
    installedAt: 2
  }
]

describe('installedSkillsKeys', () => {
  it('has one root key', () => {
    expect(installedSkillsKeys.all).toEqual(['installed-skills'])
  })
})

describe('useInstalledSkills', () => {
  afterEach(() => {
    fetcherMock.mockReset()
    report.mockClear()
    sileoError.mockClear()
  })

  it('reads the installed route once and caches it at installedSkillsKeys.all', async () => {
    fetcherMock.mockResolvedValue(skills)
    const { queryClient, api } = await mountHook(useInstalledSkills)
    expect(api().data).toBeUndefined()

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(skills))
    })

    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(fetcherMock).toHaveBeenCalledWith('/api/v1/skills/installed')
    expect(queryClient.getQueryData(installedSkillsKeys.all)).toEqual(skills)
  })

  it('a failed read is reported and never toasted, and leaves the data undefined', async () => {
    fetcherMock.mockRejectedValue(new Error('skills are down'))
    const { api } = await mountHookOnAppClient(useInstalledSkills)

    await act(async () => {
      await vi.waitFor(() => expect(api().isLoading).toBe(false))
    })

    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('query', expect.any(Error), {
      queryKey: installedSkillsKeys.all
    })
    expect(sileoError).not.toHaveBeenCalled()
    expect(api().data).toBeUndefined()
  })
})
