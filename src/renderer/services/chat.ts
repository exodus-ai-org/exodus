import { Chat } from '@shared/types/db'
import { fetcher } from '@shared/utils/http'
import { sileo } from 'sileo'
import { mutate } from 'swr'

export const updateChat = async (payload: Partial<Chat>) => {
  await fetcher<string>('/api/chat', {
    method: 'PUT',
    body: payload,
    responseType: 'text'
  })

  mutate('/api/history')
  sileo.success({ title: 'Chat updated' })
}

export const deleteChat = async (chat: Chat, currentId?: string) => {
  await fetcher<string>(`/api/chat/${chat.id}`, {
    method: 'DELETE',
    responseType: 'text'
  })

  mutate('/api/history')
  if (chat.id === currentId) {
    window.location.href = '/'
  }

  sileo.success({ title: 'Chat deleted', description: chat.title })
}
