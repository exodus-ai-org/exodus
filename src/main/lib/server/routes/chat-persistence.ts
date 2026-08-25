import type { Message } from '@mariozechner/pi-ai'
import type { ChatMessage } from '@shared/types/chat'

export function stripId(msg: ChatMessage): Message {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = msg
  return rest as Message
}

export function toDbRow(msg: ChatMessage, chatId: string) {
  const ts = msg.timestamp ? new Date(msg.timestamp) : new Date()
  const base = {
    id: msg.id,
    chatId,
    role: msg.role,
    content: msg.content,
    createdAt: isNaN(ts.getTime()) ? new Date() : ts
  }

  if (msg.role === 'assistant') {
    return {
      ...base,
      usage: msg.usage ?? null,
      api: msg.api ?? null,
      provider: msg.provider ?? null,
      model: msg.model ?? null,
      stopReason: msg.stopReason ?? null,
      errorMessage: msg.errorMessage ?? null,
      toolCallId: null,
      toolName: null,
      details: null,
      isError: null,
      durationMs: msg.durationMs ?? null
    }
  }

  if (msg.role === 'toolResult') {
    return {
      ...base,
      usage: null,
      api: null,
      provider: null,
      model: null,
      stopReason: null,
      errorMessage: null,
      toolCallId: msg.toolCallId,
      toolName: msg.toolName,
      details: msg.details ?? null,
      isError: msg.isError,
      durationMs: null
    }
  }

  // user
  return {
    ...base,
    usage: null,
    api: null,
    provider: null,
    model: null,
    stopReason: null,
    errorMessage: null,
    toolCallId: null,
    toolName: null,
    details: null,
    isError: null,
    durationMs: null
  }
}
