// @vitest-environment happy-dom
import type { QueryClient } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithQueryClient } from '../../helpers/query-test-utils'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))
const exportDataService = vi.fn()
const importAllDataService = vi.fn()
const resetAllDataService = vi.fn()
vi.mock('@/services/db', () => ({
  exportData: (...args: unknown[]) => exportDataService(...args),
  importAllData: (...args: unknown[]) => importAllDataService(...args),
  resetAllData: (...args: unknown[]) => resetAllDataService(...args)
}))
const sileoSuccess = vi.fn()
const sileoError = vi.fn()
vi.mock('sileo', () => ({
  sileo: {
    success: (...args: unknown[]) => sileoSuccess(...args),
    error: (...args: unknown[]) => sileoError(...args)
  }
}))

const { useDbIo } = await import('@/hooks/use-db-io')

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

// Stand-ins for whatever a real session would have cached (history,
// memories, settings, …) — `useDbIo` invalidates unfiltered, so any key
// works to prove the cache was (or wasn't) touched.
const seededKeys = [['history'], ['memories'], ['settings']] as const

function seedCaches(queryClient: QueryClient) {
  for (const key of seededKeys) queryClient.setQueryData(key, ['seeded'])
}

function isEveryKeyInvalidated(queryClient: QueryClient) {
  return seededKeys.every(
    (key) => queryClient.getQueryState(key)?.isInvalidated === true
  )
}

afterEach(() => {
  exportDataService.mockReset()
  importAllDataService.mockReset()
  resetAllDataService.mockReset()
  sileoSuccess.mockClear()
  sileoError.mockClear()
})

describe('useDbIo — importData', () => {
  it('invalidates the whole cache after a successful import', async () => {
    importAllDataService.mockResolvedValue({ success: true })
    const { queryClient, api } = await mountHook(useDbIo)
    seedCaches(queryClient)

    await act(async () => {
      await api().importData(new File(['x'], 'export.zip'))
    })

    expect(importAllDataService).toHaveBeenCalledTimes(1)
    expect(isEveryKeyInvalidated(queryClient)).toBe(true)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'dataControls.import.successToast'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('leaves the cache alone when the import fails', async () => {
    importAllDataService.mockRejectedValue(new Error('bad zip'))
    const { queryClient, api } = await mountHook(useDbIo)
    seedCaches(queryClient)

    await act(async () => {
      await api().importData(new File(['x'], 'export.zip'))
    })

    expect(isEveryKeyInvalidated(queryClient)).toBe(false)
    expect(sileoError).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'dataControls.import.errorToast',
      description: 'bad zip'
    })
    expect(sileoSuccess).not.toHaveBeenCalled()
  })
})

describe('useDbIo — deleteData', () => {
  it('invalidates the whole cache after a successful reset', async () => {
    resetAllDataService.mockResolvedValue({ success: true })
    const { queryClient, api } = await mountHook(useDbIo)
    seedCaches(queryClient)

    await act(async () => {
      await api().deleteData()
    })

    expect(resetAllDataService).toHaveBeenCalledTimes(1)
    expect(isEveryKeyInvalidated(queryClient)).toBe(true)
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'dataControls.delete.successToast'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('leaves the cache alone when the reset fails', async () => {
    resetAllDataService.mockRejectedValue(new Error('disk full'))
    const { queryClient, api } = await mountHook(useDbIo)
    seedCaches(queryClient)

    await act(async () => {
      await api().deleteData()
    })

    expect(isEveryKeyInvalidated(queryClient)).toBe(false)
    expect(sileoError).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'dataControls.delete.errorToast',
      description: 'disk full'
    })
    expect(sileoSuccess).not.toHaveBeenCalled()
  })
})
