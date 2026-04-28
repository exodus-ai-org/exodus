/**
 * Helpers for waiting on SSE streams and extracting results.
 */

export type SseEvent = {
  type: string
  message?: Record<string, unknown>
  messages?: Array<Record<string, unknown>>
  title?: string
  error?: string
}

/** Find the 'done' event and return all final messages */
export function getDoneMessages(events: SseEvent[]) {
  const done = events.find((e) => e.type === 'done')
  return done?.messages ?? []
}

/** Find the last assistant message from streaming updates or done event */
export function getLastAssistantUpdate(events: SseEvent[]) {
  // First try message_update events (streaming)
  const updates = events.filter(
    (e) => e.type === 'message_update' && e.message?.role === 'assistant'
  )
  if (updates.length > 0) return updates.at(-1)!.message!

  // Fallback: extract from done event (reasoning models may skip message_update)
  const doneMessages = getDoneMessages(events)
  const assistants = doneMessages.filter((m) => m.role === 'assistant')
  return assistants.at(-1) ?? null
}

/** Find the auto-generated title */
export function getTitle(events: SseEvent[]) {
  const titleEvent = events.find((e) => e.type === 'title')
  return titleEvent?.title ?? null
}

/** Check if the stream ended with an error */
export function getError(events: SseEvent[]) {
  const errorEvent = events.find((e) => e.type === 'error')
  return errorEvent?.error ?? null
}

/** Extract plain text from assistant message content blocks */
export function extractAssistantText(
  message: Record<string, unknown> | null
): string {
  if (!message) return ''
  const content = message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((b: { type: string }) => b.type === 'text')
      .map((b: { text: string }) => b.text)
      .join('')
  }
  return ''
}

/** Extract tool result messages from events */
export function getToolResults(events: SseEvent[]) {
  return events.filter(
    (e) => e.type === 'message_update' && e.message?.role === 'toolResult'
  )
}
