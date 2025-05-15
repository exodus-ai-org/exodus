import { Chat } from '@shared/types/db'
import { fetcher } from '@shared/utils/http'
import { toast } from 'sonner'
import { mutate } from 'swr'

export const updateChat = async (payload: Partial<Chat>) => {
  await fetcher<string>('/api/chat', {
    method: 'PUT',
    body: payload,
    responseType: 'text'
  })

  mutate('/api/history')
  toast.success(`Succeed to update chat ${payload.id}.`)
}

export const deleteChat = async (chatId: string, currentId?: string) => {
  await fetcher<string>(`/api/chat/${chatId}`, {
    method: 'DELETE',
    responseType: 'text'
  })

  mutate('/api/history')
  if (chatId === currentId) {
    window.location.href = '/'
  }

  toast.success(`Succeed to delete ${chatId}.`)
}
