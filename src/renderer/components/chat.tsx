import { advancedToolsAtom } from '@/stores/chat'
import { useChat } from '@ai-sdk/react'
import { BASE_URL } from '@shared/constants/systems'
import type { UIMessage } from 'ai'
import { IpcRendererEvent } from 'electron'
import { useAtomValue } from 'jotai'
import { useEffect } from 'react'
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
  const shortcutChatInput = window.localStorage.getItem(
    'exodus_shortcutChatInput'
  )
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
    initialInput: shortcutChatInput ?? undefined,
    initialMessages,
    experimental_throttle: 100,
    sendExtraMessageFields: true,
    generateId: uuidV4,
    onFinish: () => {
      mutate('/api/history')
    },
    onError: (e) => {
      toast.error(
        e instanceof Error ? e.message : 'An error occurred, please try again!'
      )
    }
  })

  useEffect(() => {
    const shortcutChatInputHandler = async (
      _: IpcRendererEvent,
      input: string
    ) => {
      await window.electron.ipcRenderer.invoke('bring-window-to-front')
      window.localStorage.setItem('exodus_shortcutChatInput', input)
      window.location.href = '/'
    }

    const removeListener = window.electron.ipcRenderer.on(
      'shortcut-chat-input',
      shortcutChatInputHandler
    )

    return () => {
      removeListener()
    }
  }, [handleSubmit, id, setInput])

  useEffect(() => {
    if (shortcutChatInput) {
      window.history.replaceState({}, '', `/chat/${id}`)
      handleSubmit(undefined, {})
      window.localStorage.removeItem('exodus_shortcutChatInput')
    }
  }, [handleSubmit, id, shortcutChatInput])

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
