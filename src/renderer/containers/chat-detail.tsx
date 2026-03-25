import type { Chat as ChatRecord, Message as DBMessage } from '@shared/types/db'
import { useSetAtom } from 'jotai'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router'
import useSWR from 'swr'

import { Chat } from '@/components/chat'
import { convertToUIMessages } from '@/lib/utils'
import { openTabsAtom } from '@/stores/chat'

export function ChatDetail() {
  const { id } = useParams()
  const { data: messagesFromDb, isLoading } = useSWR<DBMessage[]>(
    id ? `/api/chat/${id}` : null
  )
  const { data: history } = useSWR<ChatRecord[]>('/api/history', {
    fallbackData: []
  })
  const setOpenTabs = useSetAtom(openTabsAtom)

  useEffect(() => {
    if (!id || !history?.length) return
    const chat = history.find((c) => c.id === id)
    if (!chat) return
    setOpenTabs((prev) =>
      prev.find((t) => t.id === id)
        ? prev
        : [...prev, { id, title: chat.title }]
    )
  }, [id, history])

  const initialMessages = useMemo(
    () => convertToUIMessages(messagesFromDb ?? []),
    [messagesFromDb]
  )

  const chatRecord = history?.find((c) => c.id === id)

  if (!id || isLoading || !messagesFromDb) return null

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      projectId={chatRecord?.projectId ?? undefined}
    />
  )
}
