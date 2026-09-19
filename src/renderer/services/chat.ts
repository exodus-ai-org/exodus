import { fetcher } from '@exodus/shared/utils/http'
import { sileo } from 'sileo'
import { mutate } from 'swr'

import { i18n } from '@/lib/i18n'
import { Chat } from '@/types/db'

export const updateChat = async (payload: Partial<Chat>) => {
  await fetcher<void>('/api/v1/chat', {
    method: 'PUT',
    body: payload
  })

  mutate('/api/v1/history')
  sileo.success({ title: i18n.t('chat:toast.chatUpdated') })
}

export const deleteChat = async (chat: Chat, currentId?: string) => {
  await fetcher<void>(`/api/v1/chat/${chat.id}`, {
    method: 'DELETE'
  })

  mutate('/api/v1/history')
  if (chat.id === currentId) {
    // Hash-only navigation — an absolute `href = '/'` resolves against the
    // packaged app's `file://` origin as the filesystem root, not index.html.
    window.location.hash = '/'
  }

  sileo.success({
    title: i18n.t('chat:toast.chatDeleted'),
    description: chat.title
  })
}
