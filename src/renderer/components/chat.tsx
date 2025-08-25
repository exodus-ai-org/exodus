import { bringWindowToFront, subscribeQuickChatInput } from '@/lib/ipc'
import { advancedToolsAtom } from '@/stores/chat'
import { useChat } from '@ai-sdk/react'
import { QUICK_CHAT_KEY } from '@shared/constants/misc'
import { BASE_URL } from '@shared/constants/systems'
import { ChatMessage } from '@shared/types/message'
import { DefaultChatTransport } from 'ai'
import { IpcRendererEvent } from 'electron'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { mutate } from 'swr'
import { v4 as uuidV4 } from 'uuid'
import Messages from './messages'
import MultimodalInput from './multimodel-input'

interface Props {
  id: string
  initialMessages: ChatMessage[]
}

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  try {
    const response = await fetch(input, init)

    if (!response.ok) {
      const { code, cause } = await response.json()
      throw new Error(`[${code}] ${cause}`)
    }

    return response
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('offline:chat')
    }

    throw error
  }
}

export function Chat({ id, initialMessages }: Props) {
  const [input, setInput] = useState<string>('')
  const quickChat = window.localStorage.getItem(QUICK_CHAT_KEY)
  const advancedTools = useAtomValue(advancedToolsAtom)
  const { messages, setMessages, sendMessage, status, stop, regenerate } =
    useChat<ChatMessage>({
      id,
      messages: initialMessages,
      generateId: uuidV4,
      transport: new DefaultChatTransport({
        api: `${BASE_URL}/api/chat`,
        // fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest({ messages, id, body }) {
          return {
            body: {
              id,
              message: messages.at(-1),
              advancedTools,
              ...body
            }
          }
        }
      }),
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
      subscribeQuickChatInput(async (_: IpcRendererEvent, input: string) => {
        await bringWindowToFront()
        window.localStorage.setItem(QUICK_CHAT_KEY, input)
        window.location.href = '/'
      })
    }
  }, [id])

  useEffect(() => {
    if (quickChat) {
      window.history.replaceState({}, '', `/chat/${id}`)
      sendMessage(undefined, {})
      window.localStorage.removeItem(QUICK_CHAT_KEY)
    }
  }, [sendMessage, id, quickChat])

  return (
    <>
      <Messages
        chatId={id}
        status={status}
        messages={messages}
        setMessages={setMessages}
        regenerate={regenerate}
      />
      <MultimodalInput
        chatId={id}
        messages={messages}
        status={status}
        stop={stop}
        sendMessage={sendMessage}
        setMessages={setMessages}
        input={input}
        setInput={setInput}
      />
    </>
  )
}
