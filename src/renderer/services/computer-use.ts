import type { InstalledApp } from '@shared/types/computer-use'
import { fetcher } from '@shared/utils/http'

export const abortComputerUse = () =>
  fetcher<void>('/api/computer-use/abort', { method: 'POST' })

export const getInstalledApps = () =>
  fetcher<{ apps: InstalledApp[] }>('/api/computer-use/apps')

export const answerComputerUse = (sessionId: string, answer: string) =>
  fetcher<void>('/api/computer-use/answer', {
    method: 'POST',
    body: { sessionId, answer }
  })
