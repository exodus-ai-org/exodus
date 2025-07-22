import { useImmersion } from '@/hooks/use-immersion'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'
import { UseChatHelpers } from '@ai-sdk/react'
import { Fragment, memo, useCallback, useEffect, useRef } from 'react'
import Zoom from 'react-medium-image-zoom'
import Markdown from './markdown'
import { MessageAction } from './massage-action'
import { MessageReasoning } from './message-reasoning'
import { MessageSpinner } from './message-spinner'
import { MessageCallingTools } from './messages-calling-tools'
import { Avatar, AvatarImage } from './ui/avatar'

function Messages({
  messages,
  // chatId,
  // setMessages,
  status,
  reload
}: {
  chatId: string
  messages: UseChatHelpers['messages']
  setMessages: UseChatHelpers['setMessages']
  status: UseChatHelpers['status']
  reload: UseChatHelpers['reload']
}) {
  const { data: settings } = useSettings()
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const { show: isImmersionVisible } = useImmersion()

  const scrollToBottom = useCallback(() => {
    if (!chatBoxRef.current) return
    const $el = chatBoxRef.current

    if ($el.scrollHeight > $el.scrollTop + $el.clientHeight + 24) {
      $el.scrollTo({
        top: $el.scrollHeight,
        left: 0,
        behavior: 'smooth'
      })
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  return (
    <section
      className="no-scrollbar flex min-w-0 flex-1 flex-col items-center gap-8 overflow-y-scroll p-4 pt-0 transition-all"
      ref={chatBoxRef}
    >
      {isImmersionVisible && (
        <div className="from-background via-background/75 pointer-events-none absolute top-0 left-0 z-10 h-8 w-full bg-gradient-to-b to-transparent opacity-100 transition-opacity" />
      )}

      {messages.length === 0 && (
        <div className="mx-auto flex size-full max-w-3xl flex-col justify-center px-8 md:mt-20">
          <p className="animate-bounce text-2xl font-semibold">Hello there!</p>
          <p className="text-2xl text-zinc-500">How can I help you today?</p>
        </div>
      )}

      <div className="w-full md:max-w-3xl">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('mb-8 flex flex-col', {
              'items-start': message.role === 'assistant',
              'items-end first:mt-0': message.role === 'user'
            })}
          >
            {message.role === 'assistant' && (
              <div
                className={cn('flex w-full gap-4', {
                  ['flex-col']: isImmersionVisible
                })}
              >
                {!isImmersionVisible && !!settings?.assistantAvatar && (
                  <Avatar>
                    <AvatarImage
                      src={settings.assistantAvatar}
                      className="object-cover"
                    />
                  </Avatar>
                )}
                <div className="w-full">
                  {message.parts.map((item, idx) => {
                    const key = `message-${message.id}-part-${idx}`

                    if (item.type === 'reasoning') {
                      return (
                        <MessageReasoning
                          key={key}
                          isLoading={status === 'streaming'}
                          reasoning={item.reasoning}
                        />
                      )
                    }

                    if (item.type === 'text' && item.text.trim() !== '') {
                      return (
                        <section
                          key={key}
                          className="group relative mb-16 last:mb-0"
                        >
                          <Markdown src={item.text} parts={message.parts} />
                          <MessageAction reload={reload} content={item.text} />
                        </section>
                      )
                    }

                    if (item.type === 'tool-invocation') {
                      if (item.toolInvocation.state === 'result') {
                        return (
                          <MessageCallingTools
                            key={key}
                            toolInvocation={item.toolInvocation}
                          />
                        )
                      } else {
                        return (
                          <p
                            key={key}
                            className="loading-shimmer-pure-text mb-4"
                          >
                            Calling tool:{' '}
                            <strong>{item.toolInvocation.toolName}</strong>
                          </p>
                        )
                      }
                    }

                    return <Fragment key={key} />
                  })}
                </div>
              </div>
            )}
            {message.role === 'user' && (
              <>
                {Array.isArray(message.experimental_attachments) &&
                  message.experimental_attachments.length > 0 && (
                    <div className="mb-4 flex gap-4">
                      {message.experimental_attachments.map((attachment) => {
                        if (attachment.contentType?.startsWith('image')) {
                          return (
                            <Zoom key={attachment.name}>
                              <img
                                className="max-h-96 max-w-64 rounded-lg object-cover"
                                src={attachment.url}
                                alt={attachment.name}
                              />
                            </Zoom>
                          )
                        }

                        return null
                      })}
                    </div>
                  )}

                <p
                  className={cn(
                    'bg-accent max-w-[60%] rounded-xl px-3 py-2 break-words whitespace-pre-wrap',
                    { ['max-w-[24rem]']: isImmersionVisible }
                  )}
                >
                  {message.parts.map((part) => {
                    if (part.type === 'text' && part.text !== '') {
                      return part.text
                    }

                    return null
                  })}
                </p>
              </>
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
