import type { ChatStatus } from '@/hooks/use-chat'
import { useSetting } from '@/hooks/use-setting'
import { cn } from '@/lib/utils'
import type {
  ChatMessage,
  ChatToolResultMessage,
  ImageContent,
  TextContent
} from '@shared/types/chat'
import type { WebSearchResult } from '@shared/types/web-search'
import { ChevronDownIcon, WrenchIcon } from 'lucide-react'
import { Fragment, memo, useCallback, useEffect, useRef, useState } from 'react'
import Zoom from 'react-medium-image-zoom'
import Markdown from './markdown'
import { MessageAction } from './massage-action'
import { MessageReasoning } from './message-reasoning'
import { MessageSpinner } from './message-spinner'
import { MessageCallingTools } from './messages-calling-tools'
import { ShimmeringText } from './shimmering-text'
import { Avatar, AvatarImage } from './ui/avatar'

type MessagesProps = {
  status: ChatStatus
  messages: ChatMessage[]
  regenerate: () => void
}

const AT_BOTTOM_THRESHOLD = 80

// For a given message index, walk backwards to find the most recent webSearch
// tool results within the same turn (stops at a user message boundary).
function findWebSearchResults(
  messages: ChatMessage[],
  beforeIndex: number
): WebSearchResult[] | undefined {
  for (let i = beforeIndex - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'user') break
    if (
      msg.role === 'toolResult' &&
      (msg as ChatToolResultMessage).toolName === 'webSearch'
    ) {
      const details = (msg as ChatToolResultMessage).details
      if (Array.isArray(details) && details.length > 0) {
        return details as WebSearchResult[]
      }
    }
  }
  return undefined
}

function Messages({ status, messages, regenerate }: MessagesProps) {
  const isLoading = status === 'streaming' || status === 'submitted'
  const { data: setting } = useSetting()
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const scrollToBottomSmooth = useCallback(() => {
    const $el = chatBoxRef.current
    if (!$el) return
    $el.scrollTo({ top: $el.scrollHeight, behavior: 'smooth' })
    isAtBottom.current = true
    setShowScrollButton(false)
  }, [])

  // Mount: instant scroll to bottom
  useEffect(() => {
    const $el = chatBoxRef.current
    if ($el) $el.scrollTop = $el.scrollHeight
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Submit: always force-scroll regardless of user scroll position
  useEffect(() => {
    if (status === 'submitted') {
      isAtBottom.current = true
      setShowScrollButton(false)
      const $el = chatBoxRef.current
      if ($el) $el.scrollTop = $el.scrollHeight
    }
  }, [status])

  // Streaming: instant auto-follow only if user is already at bottom
  useEffect(() => {
    if (status === 'streaming' && isAtBottom.current) {
      const $el = chatBoxRef.current
      if ($el) $el.scrollTop = $el.scrollHeight
    }
  }, [messages, status])

  const handleScroll = useCallback(() => {
    const $el = chatBoxRef.current
    if (!$el) return
    const atBottom =
      $el.scrollHeight - $el.scrollTop - $el.clientHeight < AT_BOTTOM_THRESHOLD
    isAtBottom.current = atBottom
    setShowScrollButton(!atBottom)
  }, [])

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
      <section
        className="no-scrollbar flex flex-1 flex-col items-center gap-8 overflow-y-scroll px-16 py-4 transition-all"
        ref={chatBoxRef}
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="mx-auto flex size-full max-w-4xl flex-col justify-center px-8 md:mt-20">
            <p className="animate-bounce text-2xl font-semibold">
              Hello there!
            </p>
            <p className="text-2xl text-zinc-500">
              How can I assistant you today?
            </p>
          </div>
        )}

        <div className="w-full md:max-w-4xl">
          {messages.map((message, messageIdx) => (
            <div
              key={message.id}
              className={cn('mb-8 flex flex-col last:mb-4', {
                'items-start':
                  message.role === 'assistant' || message.role === 'toolResult',
                'items-end first:mt-0': message.role === 'user'
              })}
            >
              {message.role === 'assistant' && (
                <div className="flex w-full gap-4">
                  {!!setting?.assistantAvatar && (
                    <Avatar>
                      <AvatarImage
                        src={setting.assistantAvatar}
                        className="object-cover"
                      />
                    </Avatar>
                  )}
                  <div className="w-full">
                    {message.content.map((block, idx) => {
                      const key = `message-${message.id}-part-${idx}`

                      if (block.type === 'thinking') {
                        const hasContent = block.thinking?.trim().length > 0
                        const isStreaming =
                          isLoading && idx === message.content.length - 1
                        if (hasContent || isStreaming) {
                          return (
                            <MessageReasoning
                              key={key}
                              isLoading={isLoading || isStreaming}
                              reasoning={block.thinking}
                            />
                          )
                        }
                      }

                      if (block.type === 'text' && block.text.trim() !== '') {
                        return (
                          <section
                            key={key}
                            className="group relative mb-16 last:mb-0"
                          >
                            <Markdown
                              src={block.text}
                              parts={[]}
                              webSearchResults={findWebSearchResults(
                                messages,
                                messageIdx
                              )}
                            />
                            <MessageAction
                              regenerate={regenerate}
                              content={block.text}
                            />
                          </section>
                        )
                      }

                      if (block.type === 'toolCall') {
                        return isLoading ? (
                          <ShimmeringText
                            key={key}
                            className="mb-4"
                            text={`Calling tool: ${block.name}`}
                          />
                        ) : (
                          <p
                            key={key}
                            className="text-muted-foreground flex items-center gap-1.5 text-sm"
                          >
                            <WrenchIcon size={14} />
                            Used tool: {block.name}
                          </p>
                        )
                      }

                      return <Fragment key={key} />
                    })}
                  </div>
                </div>
              )}

              {message.role === 'toolResult' && (
                <MessageCallingTools toolResult={message} />
              )}

              {message.role === 'user' && (
                <>
                  {/* Images in user message */}
                  {Array.isArray(message.content) &&
                    message.content.some((c) => c.type === 'image') && (
                      <div className="mb-4 flex gap-4">
                        {(
                          message.content as Array<TextContent | ImageContent>
                        ).map((part, i) => {
                          if (part.type === 'image') {
                            return (
                              <Zoom key={i}>
                                <img
                                  className="max-h-96 max-w-64 rounded-lg object-cover"
                                  src={part.data}
                                  alt="attachment"
                                />
                              </Zoom>
                            )
                          }
                          return null
                        })}
                      </div>
                    )}

                  <p className="bg-accent max-w-[60%] rounded-xl px-3 py-2 text-sm wrap-break-word whitespace-pre-wrap">
                    {typeof message.content === 'string'
                      ? message.content
                      : (message.content as Array<TextContent | ImageContent>)
                          .filter((c) => c.type === 'text')
                          .map((c) => (c as TextContent).text)
                          .join('')}
                  </p>
                </>
              )}
            </div>
          ))}

          {(status === 'submitted' || status === 'streaming') &&
            messages[messages.length - 1]?.role !== 'assistant' && (
              <MessageSpinner />
            )}
        </div>
      </section>

      {showScrollButton && (
        <button
          onClick={scrollToBottomSmooth}
          className="bg-background border-border text-muted-foreground hover:text-foreground absolute bottom-4 left-1/2 -translate-x-1/2 cursor-pointer rounded-full border p-1.5 shadow-md transition-colors"
          aria-label="Scroll to bottom"
        >
          <ChevronDownIcon size={16} />
        </button>
      )}
    </div>
  )
}

export default memo(Messages)
