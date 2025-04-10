import AssistantImg from '@/assets/images/sayaka.jpg'
import { useArtifact } from '@/hooks/use-artifact'
import { cn } from '@/lib/utils'
import { UseChatHelpers } from '@ai-sdk/react'
import { throttle } from 'lodash-es'
import { memo, useEffect, useRef } from 'react'
import Markdown from './markdown'
import { MessageAction } from './massage-action'
import { MessageSpinner } from './message-spinner'
import { Avatar, AvatarImage } from './ui/avatar'

function Messages({
  // chatId,
  messages,
  // setMessages,
  status
  // reload
}: {
  chatId: string
  messages: UseChatHelpers['messages']
  setMessages: UseChatHelpers['setMessages']
  status: UseChatHelpers['status']
  reload: UseChatHelpers['reload']
}) {
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const { show: showArtifactSheet } = useArtifact()

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
          <div
            key={message.id}
            className={cn('flex flex-col', {
              'items-start': message.role === 'assistant',
              'my-8 items-end first:mt-0': message.role === 'user'
            })}
          >
            {message.role === 'assistant' && (
              <div className="flex gap-4">
                <Avatar>
                  <AvatarImage src={AssistantImg} />
                </Avatar>
                <div className="group relative">
                  {message.parts.filter(
                    (part) => part.type === 'tool-invocation'
                  ).length > 0 ? (
                    <p>Calling Tools...</p>
                  ) : (
                    <>
                      <Markdown src={message.content} />
                      <MessageAction content={message.content} />
                    </>
                  )}
                </div>
              </div>
            )}
            {message.role === 'user' && (
              <p className="bg-accent rounded-xl px-3 py-2 break-words whitespace-pre-wrap">
                {Array.isArray(message.experimental_attachments) &&
                  message.experimental_attachments.length > 0 &&
                  message.experimental_attachments.map((attachment) => {
                    if (attachment.contentType?.startsWith('image')) {
                      return (
                        <img
                          className="mb-4 max-h-48"
                          key={attachment.name}
                          src={attachment.url}
                          alt={attachment.name}
                        />
                      )
                    }

                    return null
                  })}
                {message.content}
              </p>
            )}
          </div>
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
