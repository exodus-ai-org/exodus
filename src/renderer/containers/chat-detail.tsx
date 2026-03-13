import { Chat } from '@/components/chat'
import { convertToUIMessages } from '@/lib/utils'
import { openTabsAtom } from '@/stores/chat'
import type { Chat as ChatRecord, Message as DBMessage } from '@shared/types/db'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { useParams } from 'react-router'
import useSWR from 'swr'

export function ChatDetail() {
  const { id } = useParams()
  const { data: messagesFromDb } = useSWR<DBMessage[]>(`/api/chat/${id}`, {
    fallbackData: []
  })
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

  if (!id || !messagesFromDb) {
    window.location.href = '/'
    return null
  }

  return <Chat id={id} initialMessages={convertToUIMessages(messagesFromDb)} />
}
