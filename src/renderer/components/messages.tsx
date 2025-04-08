import { cn } from '@/lib/utils'
import { showArtifactSheetAtom } from '@/stores/chat'
import { UseChatHelpers } from '@ai-sdk/react'
import { useAtomValue } from 'jotai'
import { FC, memo, useRef } from 'react'
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
    </section>
  )
}

export default memo(Messages)
