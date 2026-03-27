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

export type ChatUserMessage = UserMessage & { id: string }
export type ChatAssistantMessage = AssistantMessage & { id: string }
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
