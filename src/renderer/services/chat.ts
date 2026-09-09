import { Chat } from '@shared/types/db'
import { fetcher } from '@shared/utils/http'
import { sileo } from 'sileo'
import { mutate } from 'swr'

export const updateChat = async (payload: Partial<Chat>) => {
  await fetcher<void>('/api/chat', {
    method: 'PUT',
    body: payload
  })

  mutate('/api/history')
  sileo.success({ title: 'Chat updated' })
}

export const deleteChat = async (chat: Chat, currentId?: string) => {
  await fetcher<void>(`/api/chat/${chat.id}`, {
    method: 'DELETE'
  })

  mutate('/api/history')
  if (chat.id === currentId) {
    window.location.href = '/'
  }

  sileo.success({ title: 'Chat deleted', description: chat.title })
}
