import type { InstalledApp } from '@exodus/shared/types/computer-use'
import { fetcher } from '@exodus/shared/utils/http'

export const abortComputerUse = () =>
  fetcher<void>('/api/v1/computer-use/abort', { method: 'POST' })

export const getInstalledApps = () =>
  fetcher<{ apps: InstalledApp[] }>('/api/v1/computer-use/apps')

export const answerComputerUse = (sessionId: string, answer: string) =>
  fetcher<void>('/api/v1/computer-use/answer', {
    method: 'POST',
    body: { sessionId, answer }
  })
