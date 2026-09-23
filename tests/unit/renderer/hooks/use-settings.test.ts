// @vitest-environment happy-dom
import type { Settings } from '@exodus/shared/schemas/settings-schema'
import { act, createElement } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithQueryClient } from '../../helpers/query-test-utils'

const fetcherMock = vi.fn()
vi.mock('@exodus/shared/utils/http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@exodus/shared/utils/http')>()),
  fetcher: (...args: unknown[]) => fetcherMock(...args)
}))
const updateSettingsService = vi.fn()
vi.mock('@/services/settings', () => ({
  updateSettings: (...args: unknown[]) => updateSettingsService(...args)
}))
const sileoSuccess = vi.fn()
const sileoError = vi.fn()
vi.mock('sileo', () => ({
  sileo: {
    success: (...args: unknown[]) => sileoSuccess(...args),
    error: (...args: unknown[]) => sileoError(...args)
  }
}))
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { exists: () => false }
  })
}))

const { useSettings, settingsKeys } = await import('@/hooks/use-settings')
const { HttpError } = await import('@exodus/shared/utils/http')

;(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true

const initial = {
  language: 'en',
  updatedAt: '2026-01-01T00:00:00Z'
} as unknown as Settings

function Probe({
  onReady
}: {
  onReady: (api: ReturnType<typeof useSettings>) => void
}) {
  onReady(useSettings())
  return null
}

async function mountSettled() {
  let latest: ReturnType<typeof useSettings> | undefined
  const { queryClient } = await renderWithQueryClient(
    createElement(Probe, { onReady: (api) => (latest = api) })
  )
  await act(async () => {
    await vi.waitFor(() =>
      expect(queryClient.getQueryData(settingsKeys.all)).toEqual(initial)
    )
  })
  return { queryClient, api: () => latest! }
}

describe('useSettings', () => {
  beforeEach(() => {
    fetcherMock.mockResolvedValue(initial)
  })

  afterEach(() => {
    fetcherMock.mockReset()
    updateSettingsService.mockReset()
    sileoSuccess.mockClear()
    sileoError.mockClear()
  })

  it('after a successful save, the cache holds the merged payload with no revalidating GET', async () => {
    updateSettingsService.mockResolvedValue(null)
    const { queryClient, api } = await mountSettled()
    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(fetcherMock).toHaveBeenCalledWith('/api/v1/settings')

    const payload = { language: 'ja' } as unknown as Settings
    await act(async () => {
      await api().updateSettings(payload)
    })
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
    })

    expect(updateSettingsService).toHaveBeenCalledWith(payload)
    expect(queryClient.getQueryData<Settings>(settingsKeys.all)).toEqual({
      language: 'ja',
      updatedAt: '2026-01-01T00:00:00Z'
    })
    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryState(settingsKeys.all)?.fetchStatus).toBe(
      'idle'
    )
    expect(sileoSuccess).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).toHaveBeenCalledWith({
      title: 'settings:toast.autoSaved'
    })
    expect(sileoError).not.toHaveBeenCalled()
  })

  it('a failed save toasts an error and leaves the cache untouched', async () => {
    updateSettingsService.mockRejectedValue(
      new HttpError(500, 'internal', 'network down')
    )
    const { queryClient, api } = await mountSettled()
    const before = queryClient.getQueryData<Settings>(settingsKeys.all)

    await act(async () => {
      await api().updateSettings({ language: 'ja' } as unknown as Settings)
    })

    expect(queryClient.getQueryData(settingsKeys.all)).toBe(before)
    expect(fetcherMock).toHaveBeenCalledTimes(1)
    expect(sileoSuccess).not.toHaveBeenCalled()
    expect(sileoError).toHaveBeenCalledTimes(1)
    expect(sileoError).toHaveBeenCalledWith({
      title: 'settings:toast.saveFailed',
      description: expect.any(String)
    })
  })
})
