import { advancedToolsAtom } from '@/stores/chat'
import { useChat } from '@ai-sdk/react'
import { BASE_URL } from '@shared/constants'
import type { UIMessage } from 'ai'
import { useAtomValue } from 'jotai'
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
  const advancedTools = useAtomValue(advancedToolsAtom)
  const {
    messages,
    setMessages,
    handleSubmit,
    input,
    status,
    setInput,
    append,
    stop,
    reload
  } = useChat({
    api: `${BASE_URL}/api/chat`,
    body: {
      advancedTools
    },
    id,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: uuidV4,
    onFinish: () => {
      mutate('/api/history')
    },
    onError: () => {
      toast.error('An error occurred, please try again!')
    }
  })

  return (
    <>
      <Messages
        chatId={id}
        status={status}
        messages={messages}
        setMessages={setMessages}
        reload={reload}
      />
      <MultimodalInput
        chatId={id}
        input={input}
        setInput={setInput}
        handleSubmit={handleSubmit}
        status={status}
        stop={stop}
        messages={messages}
        setMessages={setMessages}
        append={append}
      />
    </>
  )
}
