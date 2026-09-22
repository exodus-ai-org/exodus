import type { Message } from '@earendil-works/pi-ai'

/**
 * The one shape a provider accepts: the list starts with a user message, and
 * every tool result follows its tool call. Context assembly builds lists in
 * whole runs so this holds by construction; this is the last line of defence
 * before a request goes out (`convertToLlm`) — a violation drops the whole
 * offending run rather than sending a request that comes back as a 400
 * (`messages.0.content.5: unexpected tool_use_id`, 2026-09-21).
 *
 * A run here is a user message and everything up to the next one. Rows before
 * the first user message are not a run at all.
 */
export function dropBrokenRuns(messages: Message[]): {
  messages: Message[]
  dropped: number
} {
  const kept: Message[] = []
  let dropped = 0
  let run: Message[] = []
  let calls = new Set<string>()
  let broken = false

  const flush = () => {
    if (run.length === 0) return
    if (broken) dropped++
    else kept.push(...run)
    run = []
    calls = new Set()
    broken = false
  }

  for (const m of messages) {
    if (m.role === 'user') {
      flush()
      run.push(m)
      continue
    }
    if (run.length === 0) broken = true
    if (m.role === 'assistant') {
      for (const block of m.content) {
        if (block.type === 'toolCall') calls.add(block.id)
      }
    } else if (m.role === 'toolResult' && !calls.has(m.toolCallId)) {
      broken = true
    }
    run.push(m)
  }
  flush()
  return { messages: kept, dropped }
}
