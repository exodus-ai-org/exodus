import { fetcher } from '@exodus/shared/utils/http'

import type { Chat } from '@/types/db'

export const updateChat = (payload: Partial<Chat>) =>
  fetcher<void>('/api/v1/chat', { method: 'PUT', body: payload })

export const deleteChat = (id: string) =>
  fetcher<void>(`/api/v1/chat/${id}`, { method: 'DELETE' })
