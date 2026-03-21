import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { BASE_URL } from '@shared/constants/systems'
import { Attachment, ChatMessage } from '@shared/types/chat'
import { IpcRendererEvent } from 'electron'
import { useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { sileo } from 'sileo'
import { mutate } from 'swr'
import { v4 as uuidV4 } from 'uuid'

import { useChat } from '@/hooks/use-chat'
import { bringWindowToFront, subscribeQuickChatInput } from '@/lib/ipc'
import { advancedToolsAtom } from '@/stores/chat'

import Messages from './messages'
import MultimodalInput from './multimodel-input'

interface Props {
  id: string
  initialMessages: ChatMessage[]
}

export function Chat({ id, initialMessages }: Props) {
  const quickChat = window.localStorage.getItem(QUICK_CHAT_KEY)
  const advancedTools = useAtomValue(advancedToolsAtom)
  const advancedToolsRef = useRef(advancedTools)
  advancedToolsRef.current = advancedTools

  const [input, setInput] = useState(quickChat ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    stop,
    regenerate,
    lastUsage
  } = useChat({
    id,
    api: `${BASE_URL}/api/chat`,
    messages: initialMessages,
    generateId: uuidV4,
    prepareBody: ({ id, messages, body }) => ({
      ...body,
      id,
      messages,
      advancedTools: advancedToolsRef.current
    }),
    onFinish: () => {
      mutate('/api/history')
    },
    onError: (e) => {
      sileo.error({
        title: 'Something went wrong',
        description:
          e instanceof Error
            ? e.message
            : 'An error occurred, please try again!'
      })
    }
  })

  useEffect(() => {
    return () => {
      subscribeQuickChatInput(async (_: IpcRendererEvent, text: string) => {
        await bringWindowToFront()
        window.localStorage.setItem(QUICK_CHAT_KEY, text)
        window.location.href = '/'
      })
    }
  }, [id])

  useEffect(() => {
    if (quickChat) {
      window.history.replaceState({}, '', `/chat/${id}`)
      sendMessage({ text: quickChat })
      setInput('')
      window.localStorage.removeItem(QUICK_CHAT_KEY)
    }
  }, [id, quickChat, sendMessage])

  return (
    <>
      <Messages status={status} messages={messages} regenerate={regenerate} />
      <MultimodalInput
        chatId={id}
        input={input}
        setInput={setInput}
        status={status}
        stop={stop}
        attachments={attachments}
        setAttachments={setAttachments}
        messages={messages}
        setMessages={setMessages}
        sendMessage={sendMessage}
        lastUsage={lastUsage}
      />
    </>
  )
}
