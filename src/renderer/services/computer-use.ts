import { fetcher } from '@shared/utils/http'

export const abortComputerUse = () =>
  fetcher<void>('/api/computer-use/abort', { method: 'POST' })

export const answerComputerUse = (sessionId: string, answer: string) =>
  fetcher<void>('/api/computer-use/answer', {
    method: 'POST',
    body: { sessionId, answer }
  })
