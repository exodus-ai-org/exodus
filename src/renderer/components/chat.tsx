import { bringWindowToFront, subscribeQuickChatInput } from '@/lib/ipc'
import { advancedToolsAtom } from '@/stores/chat'
import { useChat } from '@ai-sdk/react'
import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { BASE_URL } from '@shared/constants/systems'
import { Attachment, ChatMessage } from '@shared/types/chat'
import { DefaultChatTransport, type UIMessage } from 'ai'
import { IpcRendererEvent } from 'electron'
import { useAtomValue } from 'jotai'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { v4 as uuidV4 } from 'uuid'
import Messages from './messages'
import MultimodalInput from './multimodel-input'

interface Props {
  id: string
  initialMessages: UIMessage[]
}

export function Chat({ id, initialMessages }: Props) {
  const quickChat = window.localStorage.getItem(QUICK_CHAT_KEY)
  const advancedTools = useAtomValue(advancedToolsAtom)
  const advancedToolsRef = useRef(advancedTools)
  advancedToolsRef.current = advancedTools

  const [input, setInput] = useState(quickChat ?? '')
  const [attachments, setAttachments] = useState<Attachment[]>([])

  const { messages, setMessages, sendMessage, status, stop, regenerate } =
    useChat<ChatMessage>({
      transport: new DefaultChatTransport({
        api: `${BASE_URL}/api/chat`,
        prepareSendMessagesRequest: ({ body }) => ({
          body: { ...body, advancedTools: advancedToolsRef.current }
        })
      }),
      id,
      messages: initialMessages as ChatMessage[],
      generateId: uuidV4,
      onFinish: () => {
        mutate('/api/history')
      },
      onError: (e) => {
        toast.error(
          e instanceof Error
            ? e.message
            : 'An error occurred, please try again!'
        )
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
      />
    </>
  )
}
