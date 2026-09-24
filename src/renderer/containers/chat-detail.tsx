import { useSetAtom } from 'jotai'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router'

import { Chat } from '@/components/chat'
import { useChatHistory, useChatMessages } from '@/hooks/use-chat-history'
import { convertToUIMessages } from '@/lib/utils'
import { openTabsAtom } from '@/stores/chat'

export function ChatDetail() {
  const { id } = useParams()
  const { data: messagesFromDb, isLoading } = useChatMessages(id)
  const { data: history } = useChatHistory()
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
  }, [id, history, setOpenTabs])

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
      chatTitle={chatRecord?.title ?? 'New chat'}
    />
  )
}
