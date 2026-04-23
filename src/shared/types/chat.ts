import type {
  AssistantMessage,
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
  ToolResultMessage,
  Usage,
  UserMessage
} from '@mariozechner/pi-ai'

export type {
  AssistantMessage,
  ImageContent,
  TextContent,
  ThinkingContent,
  ToolCall,
  ToolResultMessage,
  Usage,
  UserMessage
}

export interface CostBreakdown {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  total: number
}

export type ChatUserMessage = UserMessage & { id: string }
export type ChatAssistantMessage = AssistantMessage & {
  id: string
  cost?: CostBreakdown
}
export type ChatToolResultMessage = ToolResultMessage & { id: string }
export type ChatMessage =
  | ChatUserMessage
  | ChatAssistantMessage
  | ChatToolResultMessage

export type Attachment = {
  name: string
  url: string
  contentType: string
}

// SSE event types for streaming protocol
export type ChatSseEvent =
  | { type: 'message_update'; message: ChatMessage }
  | { type: 'tool_call_start'; toolCallId: string; toolName: string }
  | {
      type: 'tool_call_end'
      toolCallId: string
      toolName: string
      isError: boolean
    }
  | { type: 'done'; messages: ChatMessage[] }
  | { type: 'title'; title: string }
  | { type: 'error'; error: string }

// ─── Chat UI Types ─────────────────────────────────────────────────────────

import type { Chat } from './db'
import type { WebSearchResult } from './web-search'

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error'

export type ChatTab = { id: string; title: string }

export interface SendMessageOptions {
  text?: string
  attachments?: Attachment[]
}

export interface TimelineStep {
  type: 'thinking' | 'toolCall' | 'toolResult'
  text: string
  isError?: boolean
  toolName?: string
  webSearchResults?: WebSearchResult[]
  // Longer, code-shaped argument (e.g. a shell command) rendered as a
  // monospace block below `text` instead of inline — keeps the timeline row
  // compact while still showing the full command.
  codeArgument?: string
}

export interface AssistantTurn {
  messages: ChatMessage[]
  steps: TimelineStep[]
  finalTextBlocks: Array<{ text: string; messageId: string; blockIdx: number }>
  pendingToolCalls: Array<{ name: string; id: string }>
  toolCards: ChatToolResultMessage[]
  durationMs: number
  hasContent: boolean
  webSearchResults: WebSearchResult[]
}

export type Segment =
  | { type: 'user'; message: ChatMessage }
  | { type: 'assistantTurn'; turn: AssistantTurn }

export interface GroupedChats {
  favorite: Chat[]
  today: Chat[]
  yesterday: Chat[]
  lastWeek: Chat[]
  lastMonth: Chat[]
  older: Chat[]
}
