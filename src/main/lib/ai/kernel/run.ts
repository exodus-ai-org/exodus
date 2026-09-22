import {
  Agent,
  type AgentEvent,
  type AgentMessage,
  type AgentTool
} from '@earendil-works/pi-agent-core'
import type {
  AssistantMessage,
  Message,
  Model,
  ThinkingLevel
} from '@earendil-works/pi-ai'
import type {
  ChatAssistantMessage,
  ChatMessage,
  ChatToolResultMessage,
  ChatUserMessage
} from '@exodus/shared/types/chat'
import { v4 as uuidV4 } from 'uuid'

import { logger } from '../../logger'
import {
  EMPTY_TURN_MESSAGE,
  extractToolErrorMessage,
  isEmptyAssistantTurn
} from '../../server/routes/chat-errors'
import { calculateCost } from '../utils/cost'
import type { KernelEvent } from './events'
import { dropBrokenRuns } from './invariant'
import { streamFn } from './models'

export interface RunInput {
  chatId: string
  /** The prompt; its id is the run's id (`runId === id`). */
  userMessage: ChatUserMessage
  systemPrompt: string
  /** The conversation so far, from context assembly — without the prompt. */
  contextMessages: Message[]
  tools: AgentTool[]
  model: Model<string>
  apiKey: string
  reasoning?: ThinkingLevel
  signal?: AbortSignal
  /** Tools disabled in settings — a call to one is blocked before it runs. */
  disabledTools?: ReadonlySet<string>
}

const LLM_ROLES = new Set(['user', 'assistant', 'toolResult'])

/**
 * One run: the prompt through the final answer, with every model step and
 * tool result in between, as the kernel's own events. pi's `Agent` owns the
 * loop, parallel tool execution, cancellation and the cross-provider message
 * handling; this wraps it so the route can `for await` and the recorder can
 * persist whatever completed, however the run ends.
 *
 * Provider failures never throw out of here: pi resolves a failed request to
 * an assistant message with `stopReason: 'error'`, which becomes the `error`
 * event after `run_end`. Stop (`signal`) aborts the agent; a partial answer is
 * kept, marked `aborted`.
 */
export async function* runAgent(input: RunInput): AsyncIterable<KernelEvent> {
  const runId = input.userMessage.id
  const startedAt = Date.now()

  // Events from the agent's listener are queued for the generator to yield;
  // `wake` lets the generator wait for the next one without polling.
  const queue: KernelEvent[] = []
  let wake: (() => void) | null = null
  const push = (event: KernelEvent) => {
    queue.push(event)
    wake?.()
    wake = null
  }

  /** The run's completed messages, in order. */
  const done: ChatMessage[] = []
  let assistantId = uuidV4()
  const toolMsgIds = new Map<string, string>()
  let failure: string | null = null

  const agent = new Agent({
    initialState: {
      systemPrompt: input.systemPrompt,
      model: input.model,
      thinkingLevel: input.reasoning,
      tools: input.tools,
      messages: input.contextMessages as AgentMessage[]
    },
    streamFn,
    getApiKey: () => input.apiKey,
    convertToLlm: (messages) => {
      const llm = messages.filter((m): m is Message =>
        LLM_ROLES.has((m as Message).role)
      )
      // Context is assembled in whole runs, so this never fires; it is the
      // last line of defence against a 400 from the provider (a tool result
      // without its tool call).
      const { messages: safe, dropped } = dropBrokenRuns(llm)
      if (dropped > 0) {
        logger.error(
          'kernel',
          'Dropped runs that would have broken the provider request',
          { chatId: input.chatId, runId, dropped }
        )
      }
      return safe
    },
    beforeToolCall: async ({ toolCall }) =>
      input.disabledTools?.has(toolCall.name)
        ? {
            block: true,
            reason: `The ${toolCall.name} tool is disabled in settings.`
          }
        : undefined
  })

  const unsubscribe = agent.subscribe((event: AgentEvent) => {
    switch (event.type) {
      case 'message_update': {
        const m = event.message as Message
        if (m.role !== 'assistant') return
        push({
          type: 'message_update',
          runId,
          message: toAssistant(m, assistantId, runId, input.model)
        })
        return
      }
      case 'message_end': {
        const m = event.message as Message
        if (m.role !== 'assistant') return
        if (m.stopReason === 'error') {
          // An abort that lands while pi-ai is still setting the request up
          // (resolving auth) surfaces as an error, not as 'aborted'. Once
          // Stop was pressed, whatever follows is its consequence.
          if (input.signal?.aborted) return
          failure =
            m.errorMessage || 'The model returned an error without details.'
          return
        }
        if (m.stopReason === 'aborted' && !hasContent(m)) {
          // Stop before the first token: nothing to keep, not a failure.
          return
        }
        if (isEmptyAssistantTurn(m)) {
          // A dead turn: no output and no tokens (see isEmptyAssistantTurn).
          failure = EMPTY_TURN_MESSAGE
          return
        }
        const final = toAssistant(m, assistantId, runId, input.model)
        done.push(final)
        push({ type: 'message_end', runId, message: final })
        assistantId = uuidV4()
        return
      }
      case 'tool_execution_start': {
        const messageId = uuidV4()
        toolMsgIds.set(event.toolCallId, messageId)
        push({
          type: 'tool_start',
          runId,
          toolCallId: event.toolCallId,
          toolName: event.toolName,
          messageId
        })
        return
      }
      case 'tool_execution_update': {
        // A tool's mid-execution progress (`onUpdate`): only computer_use
        // streams these today. Not persisted — the row is written at the end.
        const partial = event.partialResult as {
          content?: ChatToolResultMessage['content']
          details?: unknown
        } | null
        push({
          type: 'tool_update',
          runId,
          message: {
            id: toolMsgIds.get(event.toolCallId) ?? uuidV4(),
            runId,
            role: 'toolResult',
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            content: Array.isArray(partial?.content) ? partial.content : [],
            details: partial?.details ?? null,
            isError: false,
            timestamp: Date.now()
          }
        })
        return
      }
      case 'tool_execution_end': {
        const message = toToolResult(
          event,
          toolMsgIds.get(event.toolCallId) ?? uuidV4(),
          runId
        )
        toolMsgIds.delete(event.toolCallId)
        done.push(message)
        push({ type: 'tool_end', runId, message })
        return
      }
      default:
        return
    }
  })

  let finished = false
  const onAbort = () => agent.abort()
  if (input.signal?.aborted) onAbort()
  else input.signal?.addEventListener('abort', onAbort, { once: true })
  const running = agent
    .prompt(stripForAgent(input.userMessage))
    .catch((error: unknown) => {
      failure = error instanceof Error ? error.message : String(error)
    })
    .finally(() => {
      finished = true
      wake?.()
      wake = null
    })

  try {
    for (;;) {
      while (queue.length > 0) yield queue.shift()!
      if (finished) break
      await new Promise<void>((resolve) => {
        wake = resolve
      })
    }
    yield {
      type: 'run_end',
      runId,
      messages: done,
      durationMs: Date.now() - startedAt
    }
    if (failure) yield { type: 'error', runId, error: failure }
  } finally {
    input.signal?.removeEventListener('abort', onAbort)
    unsubscribe()
    await running
  }
}

function hasContent(m: AssistantMessage): boolean {
  return m.content.some(
    (b) =>
      (b.type === 'text' && b.text.trim() !== '') ||
      (b.type === 'thinking' && b.thinking.trim() !== '') ||
      b.type === 'toolCall'
  )
}

/** Every message on the wire and in the database carries its run. */
function toAssistant(
  m: AssistantMessage,
  id: string,
  runId: string,
  model: Model<string>
): ChatAssistantMessage {
  return {
    id,
    runId,
    role: 'assistant',
    content: m.content,
    usage: m.usage,
    cost: calculateCost(m.usage, model),
    api: m.api,
    provider: m.provider,
    model: m.model,
    stopReason: m.stopReason,
    errorMessage: m.errorMessage,
    timestamp: m.timestamp ?? Date.now()
  }
}

/**
 * A tool's result as the message the renderer and the database see. The
 * text the model reads is the tool's own `content` when it gave one (so a
 * tool controls exactly what the model sees, e.g. a citations prompt), else
 * the error, else `details` serialised.
 */
function toToolResult(
  event: Extract<AgentEvent, { type: 'tool_execution_end' }>,
  id: string,
  runId: string
): ChatToolResultMessage {
  const errorMessage = event.isError
    ? extractToolErrorMessage(event.result)
    : null

  const details =
    !event.isError &&
    event.result &&
    typeof event.result === 'object' &&
    'details' in event.result
      ? (event.result as { details: unknown }).details
      : event.isError
        ? null
        : event.result

  const resultObj = event.result as {
    content?: Array<{ type: string; text?: string }>
  } | null
  const hasContentArray =
    resultObj &&
    typeof resultObj === 'object' &&
    'content' in resultObj &&
    Array.isArray(resultObj.content)

  const content: ChatToolResultMessage['content'] = hasContentArray
    ? (resultObj.content as ChatToolResultMessage['content'])
    : errorMessage
      ? [{ type: 'text', text: errorMessage }]
      : details
        ? [
            {
              type: 'text',
              text:
                typeof details === 'string' ? details : JSON.stringify(details)
            }
          ]
        : []

  return {
    id,
    runId,
    role: 'toolResult',
    toolCallId: event.toolCallId,
    toolName: event.toolName,
    content,
    details,
    isError: event.isError,
    timestamp: Date.now()
  }
}

function stripForAgent(msg: ChatUserMessage): AgentMessage {
  const { id: _id, runId: _runId, ...rest } = msg
  return rest as AgentMessage
}
