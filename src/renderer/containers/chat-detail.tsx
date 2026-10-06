import { useSetAtom } from 'jotai'
import { useEffect, useMemo } from 'react'
import { useParams } from 'react-router'

import { Chat } from '@/components/chat'
import { TranscriptSkeleton } from '@/components/chat/transcript-skeleton'
import { useChatHistory, useChatPage } from '@/hooks/use-chat-history'
import { convertToUIMessages } from '@/lib/utils'
import { openTabsAtom } from '@/stores/chat'

export function ChatDetail() {
  const { id } = useParams()
  // The newest page; older ones load as the user scrolls up (`useOlderPages`).
  const { data: page, isFresh } = useChatPage(id)
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
    () => convertToUIMessages(page?.messages ?? []),
    [page]
  )

  const chatRecord = history?.find((c) => c.id === id)

  if (!id) return null
  if (!isFresh || !page) return <TranscriptSkeleton />

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      history={page}
      chatTitle={chatRecord?.title ?? 'New chat'}
    />
  )
}
