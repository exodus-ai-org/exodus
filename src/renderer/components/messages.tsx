import type {
  ChatAssistantMessage,
  ChatMessage,
  ChatToolResultMessage,
  ImageContent,
  TextContent
} from '@shared/types/chat'
import type { WebSearchResult } from '@shared/types/web-search'
import { ChevronDownIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Zoom from 'react-medium-image-zoom'

import { Button } from '@/components/ui/button'
import type { ChatStatus } from '@/hooks/use-chat'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import Markdown from './markdown'
import { MessageAction } from './massage-action'
import { MessageSpinner } from './message-spinner'
import { MessageCallingTools } from './messages-calling-tools'
import { ShimmeringText } from './shimmering-text'
import { ThinkingTimeline, TimelineStep } from './thinking-timeline'
import { Avatar, AvatarImage } from './ui/avatar'

type MessagesProps = {
  status: ChatStatus
  messages: ChatMessage[]
  regenerate: () => void
}

const AT_BOTTOM_THRESHOLD = 80

/**
 * A "turn" groups all assistant/toolResult messages between two user messages.
 * This lets us render thinking+tools as a timeline above the final text.
 */
interface AssistantTurn {
  /** All messages in this turn (assistant + toolResult) */
  messages: ChatMessage[]
  /** Timeline steps extracted from thinking blocks and tool interactions */
  steps: TimelineStep[]
  /** The final text blocks to render as the main answer */
  finalTextBlocks: Array<{ text: string; messageId: string; blockIdx: number }>
  /** Pending tool calls from the latest assistant message (for shimmer) */
  pendingToolCalls: Array<{ name: string; id: string }>
  /** Non-webSearch tool results that have visual cards (weather, maps, etc.) */
  toolCards: ChatToolResultMessage[]
  /** Duration of the turn in milliseconds (first msg → last msg) */
  durationMs: number
  /** Whether this turn has any content at all */
  hasContent: boolean
  /** All webSearch results collected in this turn */
  webSearchResults: WebSearchResult[]
}

function buildAssistantTurn(turnMessages: ChatMessage[]): AssistantTurn {
  const steps: TimelineStep[] = []
  const finalTextBlocks: AssistantTurn['finalTextBlocks'] = []
  const pendingToolCalls: AssistantTurn['pendingToolCalls'] = []
  const toolCards: ChatToolResultMessage[] = []
  const webSearchResults: WebSearchResult[] = []

  for (const msg of turnMessages) {
    if (msg.role === 'assistant') {
      const assistantMsg = msg as ChatAssistantMessage
      for (const [idx, block] of assistantMsg.content.entries()) {
        if (block.type === 'thinking' && block.thinking?.trim()) {
          steps.push({ type: 'thinking', text: block.thinking })
        } else if (block.type === 'toolCall') {
          steps.push({
            type: 'toolCall',
            text: `${block.name}${block.arguments?.query ? `: ${block.arguments.query}` : ''}`,
            toolName: block.name
          })
          pendingToolCalls.push({ name: block.name, id: block.id })
        } else if (block.type === 'text' && block.text.trim()) {
          finalTextBlocks.push({
            text: block.text,
            messageId: msg.id,
            blockIdx: idx
          })
        }
      }
    } else if (msg.role === 'toolResult') {
      const toolResult = msg as ChatToolResultMessage
      // Remove the matching pending tool call
      const pendingIdx = pendingToolCalls.findIndex(
        (tc) => tc.id === toolResult.toolCallId
      )
      if (pendingIdx >= 0) pendingToolCalls.splice(pendingIdx, 1)

      if (toolResult.isError) {
        const errorText =
          toolResult.content.find((c) => c.type === 'text')?.text ??
          `${toolResult.toolName} failed`
        steps.push({
          type: 'toolResult',
          text: errorText,
          isError: true,
          toolName: toolResult.toolName
        })
      }

      if (
        toolResult.toolName === 'webSearch' &&
        !toolResult.isError &&
        Array.isArray(toolResult.details) &&
        toolResult.details.length > 0
      ) {
        // Collect webSearch results and add as timeline step
        const results = toolResult.details as WebSearchResult[]
        webSearchResults.push(...results)
        steps.push({
          type: 'toolResult',
          text: `${results.length} results`,
          toolName: 'webSearch',
          webSearchResults: results
        })
      } else if (!toolResult.isError) {
        // Non-webSearch successful tool results → render as cards
        toolCards.push(toolResult)
      }
    }
  }

  const firstTs = turnMessages[0]?.timestamp ?? 0
  const lastTs = turnMessages[turnMessages.length - 1]?.timestamp ?? 0
  const durationMs = firstTs && lastTs ? lastTs - firstTs : 0

  return {
    messages: turnMessages,
    steps,
    finalTextBlocks,
    pendingToolCalls,
    toolCards,
    durationMs,
    hasContent:
      steps.length > 0 ||
      finalTextBlocks.length > 0 ||
      pendingToolCalls.length > 0 ||
      toolCards.length > 0,
    webSearchResults
  }
}

/**
 * Group messages into segments: each segment is either a user message
 * or a contiguous run of assistant+toolResult messages (a "turn").
 */
type Segment =
  | { type: 'user'; message: ChatMessage }
  | { type: 'assistantTurn'; turn: AssistantTurn }

function groupIntoSegments(messages: ChatMessage[]): Segment[] {
  const segments: Segment[] = []
  let turnBuffer: ChatMessage[] = []

  const flushTurn = () => {
    if (turnBuffer.length > 0) {
      const turn = buildAssistantTurn(turnBuffer)
      if (turn.hasContent) {
        segments.push({ type: 'assistantTurn', turn })
      }
      turnBuffer = []
    }
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      flushTurn()
      segments.push({ type: 'user', message: msg })
    } else {
      turnBuffer.push(msg)
    }
  }
  flushTurn()

  return segments
}

function Messages({ status, messages, regenerate }: MessagesProps) {
  const isLoading = status === 'streaming' || status === 'submitted'
  const { data: settings } = useSettings()
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const segments = useMemo(() => groupIntoSegments(messages), [messages])

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
          <div className="animate-fade-in-up mx-auto flex size-full max-w-4xl flex-col justify-center px-8 md:mt-20">
            <p className="text-3xl font-bold tracking-tight">Hello there!</p>
            <p className="text-muted-foreground mt-2 text-lg">
              How can I assist you today?
            </p>
          </div>
        )}

        <div className="w-full md:max-w-4xl">
          {segments.map((segment, segIdx) => {
            if (segment.type === 'user') {
              const message = segment.message
              return (
                <div
                  key={message.id}
                  className="mb-8 flex flex-col items-end first:mt-0 last:mb-4"
                >
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
                  <p className="bg-primary text-primary-foreground max-w-[60%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm wrap-break-word whitespace-pre-wrap shadow-sm">
                    {typeof message.content === 'string'
                      ? message.content
                      : (message.content as Array<TextContent | ImageContent>)
                          .filter((c) => c.type === 'text')
                          .map((c) => (c as TextContent).text)
                          .join('')}
                  </p>
                </div>
              )
            }

            // assistantTurn
            const { turn } = segment
            const isLastSegment = segIdx === segments.length - 1
            const turnIsStreaming = isLoading && isLastSegment

            return (
              <div
                key={`turn-${segIdx}`}
                className="mb-8 flex flex-col items-start last:mb-4"
              >
                <div className="flex w-full gap-4">
                  {!!settings?.assistantAvatar && (
                    <Avatar>
                      <AvatarImage
                        src={settings.assistantAvatar}
                        className="object-cover"
                      />
                    </Avatar>
                  )}
                  <div className="w-full">
                    {/* Thinking timeline */}
                    {(turn.steps.length > 0 || turnIsStreaming) && (
                      <ThinkingTimeline
                        steps={turn.steps}
                        durationMs={turn.durationMs}
                        isStreaming={
                          turnIsStreaming && turn.finalTextBlocks.length === 0
                        }
                      />
                    )}

                    {/* Pending tool calls (shimmer) */}
                    {turnIsStreaming &&
                      turn.pendingToolCalls.map((tc) => (
                        <ShimmeringText
                          key={tc.id}
                          className="mb-4"
                          text={`Calling tool: ${tc.name}`}
                        />
                      ))}

                    {/* Tool result cards (weather, maps, etc.) */}
                    {turn.toolCards.map((toolResult) => (
                      <MessageCallingTools
                        key={toolResult.id}
                        toolResult={toolResult}
                      />
                    ))}

                    {/* Final text blocks */}
                    {turn.finalTextBlocks.map((block, i) => (
                      <section
                        key={`${block.messageId}-${block.blockIdx}`}
                        className={cn(
                          'group relative',
                          i < turn.finalTextBlocks.length - 1 && 'mb-16'
                        )}
                      >
                        <Markdown
                          src={block.text}
                          parts={[]}
                          webSearchResults={
                            turn.webSearchResults.length > 0
                              ? turn.webSearchResults
                              : undefined
                          }
                        />
                        <MessageAction
                          regenerate={regenerate}
                          content={block.text}
                          webSearchResults={
                            turn.webSearchResults.length > 0
                              ? turn.webSearchResults
                              : undefined
                          }
                        />
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}

          {(status === 'submitted' || status === 'streaming') &&
            messages[messages.length - 1]?.role !== 'assistant' && (
              <MessageSpinner />
            )}
        </div>
      </section>

      {showScrollButton && (
        <Button
          variant="outline"
          size="icon-sm"
          onClick={scrollToBottomSmooth}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full shadow-md"
          aria-label="Scroll to bottom"
        >
          <ChevronDownIcon size={16} />
        </Button>
      )}
    </div>
  )
}

export default memo(Messages)
