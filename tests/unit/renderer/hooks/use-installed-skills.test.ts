// @vitest-environment happy-dom
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithQueryClient } from '../../helpers/query-test-utils'

const getInstalledService = vi.fn()
const installService = vi.fn()
const uninstallService = vi.fn()
const toggleService = vi.fn()
vi.mock('@/services/skills', () => ({
  getInstalledSkills: (...args: unknown[]) => getInstalledService(...args),
  installSkill: (...args: unknown[]) => installService(...args),
  uninstallSkill: (...args: unknown[]) => uninstallService(...args),
  toggleSkill: (...args: unknown[]) => toggleService(...args)
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
  installedSkillsKeys,
  useInstalledSkills,
  useInstallSkill,
  useUninstallSkill,
  useToggleSkill
} = await import('@/hooks/use-installed-skills')
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

afterEach(() => {
  getInstalledService.mockReset()
  installService.mockReset()
  uninstallService.mockReset()
  toggleService.mockReset()
  report.mockClear()
  sileoSuccess.mockClear()
  sileoError.mockClear()
})

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

const isInvalidated = (queryClient: QueryClient, key: readonly unknown[]) =>
  queryClient.getQueryState(key)?.isInvalidated

function seedCaches(queryClient: QueryClient) {
  queryClient.setQueryData(installedSkillsKeys.all, skills)
  queryClient.setQueryData(['usage'], { totalCost: 0 })
}

function expectListInvalidated(queryClient: QueryClient) {
  expect(isInvalidated(queryClient, installedSkillsKeys.all)).toBe(true)
  expect(isInvalidated(queryClient, ['usage'])).toBe(false)
}

function expectNothingInvalidated(queryClient: QueryClient) {
  expect(isInvalidated(queryClient, installedSkillsKeys.all)).toBe(false)
  expect(isInvalidated(queryClient, ['usage'])).toBe(false)
}

// One toast, from the global handler, plus one report: a second toast would
// be a local catch doubling it.
function expectSingleGlobalFailure(title: string, message: string) {
  expect(report).toHaveBeenCalledTimes(1)
  expect(report).toHaveBeenCalledWith('mutation', expect.any(Error), {
    mutationKey: undefined
  })
  expect(sileoError).toHaveBeenCalledTimes(1)
  expect(sileoError).toHaveBeenCalledWith({ title, description: message })
  expect(sileoSuccess).not.toHaveBeenCalled()
}

describe('installedSkillsKeys', () => {
  it('has one root key', () => {
    expect(installedSkillsKeys.all).toEqual(['installed-skills'])
  })
})

describe('useInstalledSkills', () => {
  it('reads the installed skills once through the service and caches them at installedSkillsKeys.all', async () => {
    getInstalledService.mockResolvedValue(skills)
    const { queryClient, api } = await mountHook(useInstalledSkills)
    expect(api().data).toBeUndefined()

    await act(async () => {
      await vi.waitFor(() => expect(api().data).toEqual(skills))
    })

    expect(getInstalledService).toHaveBeenCalledTimes(1)
    expect(getInstalledService).toHaveBeenCalledWith()
    expect(queryClient.getQueryData(installedSkillsKeys.all)).toEqual(skills)
  })

  it('a failed read is reported and never toasted, and leaves the data undefined', async () => {
    getInstalledService.mockRejectedValue(new Error('skills are down'))
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

describe('useInstallSkill', () => {
  it('installs by registry id alone, toasts the installed name once, and marks the list stale', async () => {
    installService.mockResolvedValue({ ...skills[0], displayName: 'PDF Tools' })
    const { queryClient, api } = await mountHook(useInstallSkill)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync('anthropics/skills/pdf')
    })

    // React Query hands a mutationFn (variables, context); the service takes
    // the id alone.
    expect(installService).toHaveBeenCalledTimes(1)
    expect(installService).toHaveBeenCalledWith('anthropics/skills/pdf')
    expectListInvalidated(queryClient)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'settings:skillsMarket.toast.installedTitle[PDF Tools]'
    })
    expect(sileoError).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()
  })

  it('a failed install reaches the global handler only: one report, one toast, nothing invalidated', async () => {
    installService.mockRejectedValue(new Error('registry is down'))
    const { queryClient, api } = await mountHookOnAppClient(useInstallSkill)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync('anthropics/skills/pdf')
        .catch(() => {})
    })

    expectNothingInvalidated(queryClient)
    expectSingleGlobalFailure(
      'settings:skillsMarket.toast.installFailed',
      'registry is down'
    )
  })
})

describe('useUninstallSkill', () => {
  it('uninstalls by slug alone, toasts the uninstalled name once, and marks the list stale', async () => {
    uninstallService.mockResolvedValue(undefined)
    const { queryClient, api } = await mountHook(useUninstallSkill)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync({ slug: 'pdf', displayName: 'PDF' })
    })

    expect(uninstallService).toHaveBeenCalledTimes(1)
    expect(uninstallService).toHaveBeenCalledWith('pdf')
    expectListInvalidated(queryClient)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'settings:skillsMarket.toast.uninstalledTitle[PDF]'
    })
    expect(sileoError).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()
  })

  it('a failed uninstall reaches the global handler only: one report, one toast, nothing invalidated', async () => {
    uninstallService.mockRejectedValue(new Error('skill is in use'))
    const { queryClient, api } = await mountHookOnAppClient(useUninstallSkill)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ slug: 'pdf', displayName: 'PDF' })
        .catch(() => {})
    })

    expectNothingInvalidated(queryClient)
    expectSingleGlobalFailure(
      'settings:skillsMarket.toast.uninstallFailed',
      'skill is in use'
    )
  })
})

describe('useToggleSkill', () => {
  it('sets the skill active state with its slug and the flag, marks the list stale, and toasts nothing', async () => {
    toggleService.mockResolvedValue(undefined)
    const { queryClient, api } = await mountHook(useToggleSkill)
    seedCaches(queryClient)

    await act(async () => {
      await api().mutateAsync({ slug: 'pdf', isActive: false })
    })

    expect(toggleService).toHaveBeenCalledTimes(1)
    expect(toggleService).toHaveBeenCalledWith('pdf', false)
    expectListInvalidated(queryClient)
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(sileoError).not.toHaveBeenCalled()
    expect(report).not.toHaveBeenCalled()
  })

  it('passes the flag through both ways', async () => {
    toggleService.mockResolvedValue(undefined)
    const { api } = await mountHook(useToggleSkill)

    await act(async () => {
      await api().mutateAsync({ slug: 'sql', isActive: true })
    })

    expect(toggleService).toHaveBeenCalledWith('sql', true)
  })

  it('a failed toggle reaches the global handler only: one report, one toast, nothing invalidated', async () => {
    toggleService.mockRejectedValue(new Error('cannot write the lockfile'))
    const { queryClient, api } = await mountHookOnAppClient(useToggleSkill)
    seedCaches(queryClient)

    await act(async () => {
      await api()
        .mutateAsync({ slug: 'pdf', isActive: false })
        .catch(() => {})
    })

    expectNothingInvalidated(queryClient)
    expectSingleGlobalFailure(
      'settings:skillsMarket.toast.updateFailed',
      'cannot write the lockfile'
    )
  })
})

describe('the refresh after a write', () => {
  const writes = [
    {
      name: 'an install',
      arrange: () => installService.mockResolvedValue(skills[0]),
      hook: useInstallSkill,
      run: (m: { mutateAsync: (v: never) => Promise<unknown> }) =>
        m.mutateAsync('anthropics/skills/pdf' as never)
    },
    {
      name: 'an uninstall',
      arrange: () => uninstallService.mockResolvedValue(undefined),
      hook: useUninstallSkill,
      run: (m: { mutateAsync: (v: never) => Promise<unknown> }) =>
        m.mutateAsync({ slug: 'pdf', displayName: 'PDF' } as never)
    },
    {
      name: 'a toggle',
      arrange: () => toggleService.mockResolvedValue(undefined),
      hook: useToggleSkill,
      run: (m: { mutateAsync: (v: never) => Promise<unknown> }) =>
        m.mutateAsync({ slug: 'pdf', isActive: false } as never)
    }
  ]

  it.each(writes)(
    'settles $name only once the list has re-read, so the switch and the badge never flicker',
    async ({ arrange, hook, run }) => {
      const refreshed = deferred<typeof skills>()
      getInstalledService.mockResolvedValueOnce(skills)
      getInstalledService.mockReturnValueOnce(refreshed.promise)
      arrange()
      const { api } = await mountHook(() => ({
        list: useInstalledSkills(),
        write: hook() as {
          mutateAsync: (v: never) => Promise<unknown>
        }
      }))
      await act(async () => {
        await vi.waitFor(() => expect(api().list.data).toEqual(skills))
      })

      let settled = false
      await act(async () => {
        void run(api().write).then(() => {
          settled = true
        })
        await vi.waitFor(() =>
          expect(getInstalledService).toHaveBeenCalledTimes(2)
        )
      })
      expect(settled).toBe(false)

      const after = [skills[1]]
      await act(async () => {
        refreshed.resolve(after)
        await vi.waitFor(() => expect(settled).toBe(true))
      })
      expect(api().list.data).toEqual(after)
    }
  )

  it('a failed re-read does not turn a successful install into a failed one', async () => {
    getInstalledService.mockResolvedValueOnce(skills)
    getInstalledService.mockRejectedValueOnce(new Error('list is down'))
    installService.mockResolvedValue(skills[0])
    const { api } = await mountHookOnAppClient(() => ({
      list: useInstalledSkills(),
      install: useInstallSkill()
    }))
    await act(async () => {
      await vi.waitFor(() => expect(api().list.data).toEqual(skills))
    })

    await act(async () => {
      await api().install.mutateAsync('anthropics/skills/pdf')
    })

    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoError).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledTimes(1)
    expect(report).toHaveBeenCalledWith('query', expect.any(Error), {
      queryKey: installedSkillsKeys.all
    })
  })
})
