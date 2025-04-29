import { BASE_URL } from '@shared/constants'
import { Chat } from '@shared/types/db'
import { toast } from 'sonner'
import { mutate } from 'swr'

export const updateChat = async (payload: Partial<Chat>) => {
  await fetch(`${BASE_URL}/api/chat`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  mutate('/api/history')
  toast.success(`Succeed to update chat ${payload.id}.`)
}

export const deleteChat = async (chatId: string, currentId?: string) => {
  await fetch(`${BASE_URL}/api/chat/${chatId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  mutate('/api/history')
  if (chatId === currentId) {
    window.location.href = '/'
  }

  toast.success(`Succeed to delete ${chatId}.`)
}
