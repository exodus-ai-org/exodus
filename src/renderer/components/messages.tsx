import type {
  AssistantTurn,
  ChatAssistantMessage,
  ChatMessage,
  ChatStatus,
  ChatToolResultMessage,
  ImageContent,
  Segment,
  TextContent,
  TimelineStep
} from '@shared/types/chat'
import type { WebSearchResult } from '@shared/types/web-search'
import { ChevronDownIcon } from 'lucide-react'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Zoom from 'react-medium-image-zoom'

import { Button } from '@/components/ui/button'
import { useSettings } from '@/hooks/use-settings'
import { cn } from '@/lib/utils'

import Markdown from './markdown'
import { MessageAction } from './massage-action'
import { MessageSpinner } from './message-spinner'
import { MessageCallingTools } from './messages-calling-tools'
import { ShimmeringText } from './shimmering-text'
import { ThinkingTimeline } from './thinking-timeline'
import { Avatar, AvatarImage } from './ui/avatar'

type MessagesProps = {
  chatId: string
  status: ChatStatus
  messages: ChatMessage[]
  regenerate: () => void
}

const AT_BOTTOM_THRESHOLD = 80

const UserSegment = memo(function UserSegment({
  message
}: {
  message: ChatMessage
}) {
  return (
    <div className="mb-8 flex flex-col items-end first:mt-0 last:mb-4">
      {Array.isArray(message.content) &&
        message.content.some((c) => c.type === 'image') && (
          <div className="mb-4 flex gap-4">
            {(message.content as Array<TextContent | ImageContent>).map(
              (part, i) => {
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
              }
            )}
          </div>
        )}
      <p className="bg-primary text-primary-foreground max-w-[60%] rounded-2xl rounded-br-sm px-4 py-2.5 text-base leading-relaxed wrap-break-word whitespace-pre-wrap shadow-sm">
        {typeof message.content === 'string'
          ? message.content
          : (message.content as Array<TextContent | ImageContent>)
              .filter((c) => c.type === 'text')
              .map((c) => (c as TextContent).text)
              .join('')}
      </p>
    </div>
  )
})

const AssistantTurnSegment = memo(function AssistantTurnSegment({
  chatId,
  turn,
  isStreaming,
  assistantAvatar,
  regenerate
}: {
  chatId: string
  turn: AssistantTurn
  isStreaming: boolean
  assistantAvatar?: string
  regenerate: () => void
}) {
  const webSearchResults =
    turn.webSearchResults.length > 0 ? turn.webSearchResults : undefined

  return (
    <div className="mb-8 flex flex-col items-start last:mb-4">
      <div className="flex w-full gap-4">
        {!!assistantAvatar && (
          <Avatar>
            <AvatarImage src={assistantAvatar} className="object-cover" />
          </Avatar>
        )}
        <div className="w-full">
          {(turn.steps.length > 0 || isStreaming) && (
            <ThinkingTimeline
              steps={turn.steps}
              durationMs={turn.durationMs}
              isStreaming={isStreaming && turn.finalTextBlocks.length === 0}
            />
          )}

          {isStreaming &&
            turn.pendingToolCalls.map((tc) => (
              <ShimmeringText
                key={tc.id}
                className="mb-4"
                text={`Calling tool: ${tc.name}`}
              />
            ))}

          {turn.toolCards.map((toolResult) => (
            <MessageCallingTools
              key={toolResult.id}
              chatId={chatId}
              toolResult={toolResult}
            />
          ))}

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
                webSearchResults={webSearchResults}
              />
              <MessageAction
                regenerate={regenerate}
                content={block.text}
                webSearchResults={webSearchResults}
              />
            </section>
          ))}
        </div>
      </div>
    </div>
  )
})

/**
 * Build a timeline preview for a tool call. Most tools get an inline
 * summary ("webSearch: <query>"); terminal commands get pulled out into a
 * separate monospace block so heredocs, pipes, and multi-line scripts stay
 * legible instead of collapsing into a single messy line.
 */
function getToolCallPreview(
  name: string,
  args: Record<string, unknown> | undefined
): { text: string; codeArgument?: string } {
  if (!args) return { text: name }
  const pick = (key: string): string =>
    typeof args[key] === 'string' ? (args[key] as string) : ''

  switch (name) {
    case 'terminal': {
      const cmd = pick('command')
      return cmd ? { text: name, codeArgument: cmd } : { text: name }
    }
    case 'webSearch':
      return withInline(name, pick('query'))
    case 'webFetch':
      return withInline(name, pick('url'))
    case 'readFile':
    case 'writeFile':
    case 'editFile':
      return withInline(name, pick('path') || pick('filePath'))
    case 'weather':
      return withInline(name, pick('location'))
    case 'googleMapsPlaces':
      return withInline(name, pick('query'))
    default:
      return { text: name }
  }
}

function withInline(name: string, value: string): { text: string } {
  return { text: value ? `${name}: ${value}` : name }
}

/**
 * A "turn" groups all assistant/toolResult messages between two user messages.
 * This lets us render thinking+tools as a timeline above the final text.
 */
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
          const preview = getToolCallPreview(block.name, block.arguments)
          steps.push({
            type: 'toolCall',
            text: preview.text,
            toolName: block.name,
            codeArgument: preview.codeArgument
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

function Messages({ chatId, status, messages, regenerate }: MessagesProps) {
  const isLoading = status === 'streaming' || status === 'submitted'
  const { data: settings } = useSettings()
  const chatBoxRef = useRef<HTMLDivElement>(null)
  const isAtBottom = useRef(true)
  const [showScrollButton, setShowScrollButton] = useState(false)

  const segments = useMemo(() => groupIntoSegments(messages), [messages])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'instant') => {
    const $el = chatBoxRef.current
    if (!$el) return
    $el.scrollTo({ top: $el.scrollHeight, behavior })
    isAtBottom.current = true
    setShowScrollButton(false)
  }, [])

  // Mount / route change: instant scroll to bottom
  useEffect(() => {
    scrollToBottom('instant')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Submit: force-scroll to bottom so user sees their message + spinner
  useEffect(() => {
    if (status === 'submitted') {
      scrollToBottom('instant')
    }
  }, [status, scrollToBottom])

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
              return (
                <UserSegment
                  key={segment.message.id}
                  message={segment.message}
                />
              )
            }

            const isLastSegment = segIdx === segments.length - 1
            const turnIsStreaming = isLoading && isLastSegment

            return (
              <AssistantTurnSegment
                key={`turn-${segIdx}`}
                chatId={chatId}
                turn={segment.turn}
                isStreaming={turnIsStreaming}
                assistantAvatar={settings?.assistantAvatar ?? undefined}
                regenerate={regenerate}
              />
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
          onClick={() => scrollToBottom('smooth')}
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
