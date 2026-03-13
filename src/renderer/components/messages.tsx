import { useImmersion } from '@/hooks/use-immersion'
import { useSetting } from '@/hooks/use-setting'
import { cn } from '@/lib/utils'
import { UseChatHelpers } from '@ai-sdk/react'
import { ChatMessage } from '@shared/types/chat'
import { getStaticToolName, isStaticToolUIPart } from 'ai'
import { Fragment, memo, useCallback, useEffect, useRef } from 'react'
import Zoom from 'react-medium-image-zoom'
import Markdown from './markdown'
import { MessageAction } from './massage-action'
import { MessageReasoning } from './message-reasoning'
import { MessageSpinner } from './message-spinner'
import { MessageCallingTools } from './messages-calling-tools'
import { ShimmeringText } from './shimmering-text'
import { Avatar, AvatarImage } from './ui/avatar'

type MessagesProps = {
  status: UseChatHelpers<ChatMessage>['status']
  messages: ChatMessage[]
  regenerate: UseChatHelpers<ChatMessage>['regenerate']
}

function Messages({ status, messages, regenerate }: MessagesProps) {
  const isLoading = status === 'streaming' || status === 'submitted'
  const { data: setting } = useSetting()
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
      className="no-scrollbar flex min-w-0 flex-1 flex-col items-center gap-8 overflow-y-scroll p-4 transition-all"
      ref={chatBoxRef}
    >
      {isImmersionVisible && (
        <div className="from-background via-background/75 pointer-events-none absolute top-0 left-0 z-10 h-8 w-full bg-linear-to-b to-transparent opacity-100 transition-opacity" />
      )}

      {messages.length === 0 && (
        <div className="mx-auto flex size-full max-w-4xl flex-col justify-center px-8 md:mt-20">
          <p className="animate-bounce text-2xl font-semibold">Hello there!</p>
          <p className="text-2xl text-zinc-500">
            How can I assistant you today?
          </p>
        </div>
      )}

      <div className="w-full md:max-w-4xl">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn('mb-8 flex flex-col last:mb-4', {
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
                {!isImmersionVisible && !!setting?.assistantAvatar && (
                  <Avatar>
                    <AvatarImage
                      src={setting.assistantAvatar}
                      className="object-cover"
                    />
                  </Avatar>
                )}
                <div className="w-full">
                  {message.parts.map((part, idx) => {
                    const key = `message-${message.id}-part-${idx}`

                    if (part.type === 'reasoning') {
                      const hasContent = part.text?.trim().length > 0
                      const isStreaming =
                        'state' in part && part.state === 'streaming'
                      if (hasContent || isStreaming) {
                        return (
                          <MessageReasoning
                            key={key}
                            isLoading={isLoading || isStreaming}
                            reasoning={part.text}
                          />
                        )
                      }
                    }

                    if (part.type === 'text' && part.text.trim() !== '') {
                      return (
                        <section
                          key={key}
                          className="group relative mb-16 last:mb-0"
                        >
                          <Markdown src={part.text} parts={message.parts} />
                          <MessageAction
                            regenerate={regenerate}
                            content={part.text}
                          />
                        </section>
                      )
                    }

                    if (isStaticToolUIPart(part)) {
                      if (part.state === 'output-available') {
                        return (
                          <MessageCallingTools
                            key={key}
                            toolInvocation={part}
                          />
                        )
                      } else {
                        return (
                          <ShimmeringText
                            key={key}
                            className="mb-4"
                            text={`Calling tool: ${getStaticToolName(part)}`}
                          />
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
                {message.parts.some((p) => p.type === 'file') && (
                  <div className="mb-4 flex gap-4">
                    {message.parts.map((part, i) => {
                      if (
                        part.type === 'file' &&
                        part.mediaType?.startsWith('image')
                      ) {
                        return (
                          <Zoom key={i}>
                            <img
                              className="max-h-96 max-w-64 rounded-lg object-cover"
                              src={part.url}
                              alt={part.filename ?? 'attachment'}
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
                    'bg-accent max-w-[60%] rounded-xl px-3 py-2 wrap-break-word whitespace-pre-wrap',
                    { ['max-w-92']: isImmersionVisible }
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
