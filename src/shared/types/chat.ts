export type TextPart = { type: 'text'; text: string }
export type ThinkingPart = { type: 'thinking'; text: string }
export type ToolCallPart = {
  type: 'tool-call'
  toolCallId: string
  toolName: string
  args: Record<string, unknown>
  state: 'pending' | 'running' | 'done' | 'error'
  result?: unknown
}
export type FilePart = {
  type: 'file'
  url: string
  mediaType?: string
  filename?: string
}
export type MessagePart = TextPart | ThinkingPart | ToolCallPart | FilePart

export type MessageUsage = {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  parts: MessagePart[]
  usage?: MessageUsage
  createdAt?: string
}

export type Attachment = {
  name: string
  url: string
  contentType: string
}

// SSE event types for streaming protocol
export type ChatSseEvent =
  | { type: 'message_update'; message: ChatMessage }
  | { type: 'tool_start'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool_end'; toolCallId: string; result: unknown; isError: boolean }
  | { type: 'done'; messages: ChatMessage[] }
  | { type: 'title'; title: string }
  | { type: 'error'; error: string }
