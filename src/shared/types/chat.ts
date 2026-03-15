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
