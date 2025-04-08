import { cn } from '@/lib/utils'
import { showArtifactSheetAtom } from '@/stores/chat'
import { UseChatHelpers } from '@ai-sdk/react'
import { useAtomValue } from 'jotai'
import { throttle } from 'lodash-es'
import { FC, memo, useEffect, useRef } from 'react'
import ChatBubble from './chat-bubble'
import { MessageSpinner } from './message-spinner'

interface Props {
  chatId: string
  messages: UseChatHelpers['messages']
  setMessages: UseChatHelpers['setMessages']
  status: UseChatHelpers['status']
  reload: UseChatHelpers['reload']
}

const Messages: FC<Props> = ({
  // chatId,
  messages,
  // setMessages,
  status
  // reload
}) => {
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const showArtifactSheet = useAtomValue(showArtifactSheetAtom)

  const scrollToBottom = throttle(() => {
    if (!chatBoxRef.current) return
    const $el = chatBoxRef.current

    if ($el.scrollHeight > $el.scrollTop + $el.clientHeight + 24) {
      $el.scrollTo({
        top: $el.scrollHeight,
        left: 0
      })
    }
  }, 1000)

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <section
      className={cn(
        'no-scrollbar flex min-w-0 flex-1 flex-col items-center gap-8 overflow-y-scroll p-4 transition-all',
        { ['w-[25rem] overflow-x-hidden transition-all']: showArtifactSheet }
      )}
      ref={chatBoxRef}
    >
      <div className="w-full md:max-w-3xl">
        {messages.map((message) => (
          <ChatBubble key={message.id} message={message} />
        ))}

        {status === 'submitted' &&
          messages[messages.length - 1].role !== 'assistant' && (
            <MessageSpinner />
          )}
      </div>

      <p className="h-px w-px" />
    </section>
  )
}

export default memo(Messages)
