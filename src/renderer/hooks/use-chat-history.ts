import { fetcher } from '@exodus/shared/utils/http'
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient
} from '@tanstack/react-query'
import { useCallback } from 'react'
import { sileo } from 'sileo'

import { i18n } from '@/lib/i18n'
import { deleteChat, updateChat } from '@/services/chat'
import type { Chat, Message } from '@/types/db'

export const historyKeys = {
  all: ['history'] as const,
  detail: (id: string) => [...historyKeys.all, 'detail', id] as const
}

// `exact`: only the list. Every chat's messages sit under the same root, and a
// prefix match would re-GET the open chat's messages too — a 404 when it is the
// chat that was just deleted.
const invalidateHistory = (queryClient: QueryClient) =>
  queryClient.invalidateQueries({ queryKey: historyKeys.all, exact: true })

export function useChatHistory() {
  const { data, isLoading } = useQuery({
    queryKey: historyKeys.all,
    queryFn: () => fetcher<Chat[]>('/api/v1/history')
  })
  return { data, isLoading }
}

export function useChatMessages(id: string | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: historyKeys.detail(id ?? ''),
    queryFn: () => fetcher<Message[]>(`/api/v1/chat/${id}`),
    enabled: !!id
  })
  return { data, isLoading }
}

// For the chat stream's own callbacks (a finished run, a generated title),
// which change the list without going through a mutation.
export function useInvalidateChatHistory() {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void invalidateHistory(queryClient)
  }, [queryClient])
}

export function useUpdateChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<Chat>) => updateChat(payload),
    meta: { errorTitle: i18n.t('errors:generic') },
    onSuccess: () => {
      void invalidateHistory(queryClient)
      sileo.success({ title: i18n.t('chat:toast.chatUpdated') })
    }
  })
}

export function useDeleteChat() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      chat
    }: {
      chat: Pick<Chat, 'id' | 'title'>
      currentId?: string
    }) => deleteChat(chat.id),
    meta: { errorTitle: i18n.t('errors:generic') },
    onSuccess: (_void, { chat, currentId }) => {
      void invalidateHistory(queryClient)
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
  })
}
