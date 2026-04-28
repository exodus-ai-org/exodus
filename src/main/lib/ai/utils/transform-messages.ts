import type { Message } from '@mariozechner/pi-ai'

/**
 * Normalize tool call IDs to be compatible across providers.
 * OpenAI can generate IDs 450+ chars; Anthropic requires [a-zA-Z0-9_-]{1,64}.
 * We compress long IDs using a simple hash-based shortening.
 */
function normalizeToolCallId(id: string): string {
  if (!id || id.length <= 64) return id
  // Simple hash: take first 8 chars + hash of full string
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0
  }
  const hashStr = Math.abs(hash).toString(36)
  return `${id.slice(0, 8)}_${hashStr}`
}

/**
 * Filter thinking blocks from assistant messages.
 * - Redacted thinking (empty content) is always removed
 * - Non-empty thinking blocks are converted to text content to preserve context
 *   when switching between providers that may not support thinking
 */
function filterThinkingBlocks(
  content: Array<{ type: string; [k: string]: unknown }>
): Array<{ type: string; [k: string]: unknown }> {
  return content
    .filter((block) => {
      if (block.type !== 'thinking') return true
      // Remove redacted/empty thinking blocks
      const text = (block as { text?: string }).text
      return text != null && text.length > 0
    })
    .map((block) => {
      if (block.type !== 'thinking') return block
      // Convert non-empty thinking to text to avoid provider-specific format issues
      return { type: 'text', text: (block as unknown as { text: string }).text }
    })
}

/**
 * Collect all tool call IDs from assistant messages and all tool result
 * references to detect orphaned tool calls (calls with no matching result).
 */
function findOrphanedToolCalls(messages: Message[]): Set<string> {
  const callIds = new Set<string>()
  const resultIds = new Set<string>()

  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const content = (msg as { content: Array<{ type: string; id?: string }> })
        .content
      for (const block of content) {
        if (block.type === 'toolCall' && block.id) {
          callIds.add(block.id)
        }
      }
    } else if (msg.role === 'toolResult') {
      const toolResult = msg as { toolCallId?: string }
      if (toolResult.toolCallId) {
        resultIds.add(toolResult.toolCallId)
      }
    }
  }

  // Orphaned = called but no result
  const orphaned = new Set<string>()
  for (const id of callIds) {
    if (!resultIds.has(id)) orphaned.add(id)
  }
  return orphaned
}

/**
 * Transform messages for cross-provider compatibility.
 * - Normalizes tool call IDs
 * - Filters thinking blocks
 * - Resolves orphaned tool calls with synthetic error results
 * - Removes messages with error/aborted stop reasons
 */
export function transformMessages(messages: Message[]): Message[] {
  const idMap = new Map<string, string>()

  // First pass: build ID normalization map
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      const content = (msg as { content: Array<{ type: string; id?: string }> })
        .content
      for (const block of content) {
        if (block.type === 'toolCall' && block.id) {
          const normalized = normalizeToolCallId(block.id)
          if (normalized !== block.id) {
            idMap.set(block.id, normalized)
          }
        }
      }
    }
  }

  // Find orphaned tool calls before transformation
  const orphaned = findOrphanedToolCalls(messages)

  // Second pass: transform messages
  const result: Message[] = []

  for (const msg of messages) {
    // Skip messages with error/aborted stop reasons
    if (msg.role === 'assistant') {
      const assistantMsg = msg as unknown as {
        stopReason?: string
        content: Array<{ type: string; [k: string]: unknown }>
      }
      if (
        assistantMsg.stopReason === 'error' ||
        assistantMsg.stopReason === 'aborted'
      ) {
        continue
      }

      // Transform assistant message
      let content = filterThinkingBlocks(assistantMsg.content)

      // Normalize tool call IDs
      content = content.map((block) => {
        if (block.type === 'toolCall' && (block as { id?: string }).id) {
          const oldId = (block as unknown as { id: string }).id
          const newId = idMap.get(oldId) ?? oldId
          return { ...block, id: newId }
        }
        return block
      })

      result.push({ ...msg, content } as unknown as Message)

      // Add synthetic error results for orphaned tool calls
      for (const block of content) {
        if (block.type === 'toolCall') {
          const toolCall = block as unknown as { id: string; name?: string }
          if (
            orphaned.has(toolCall.id) ||
            orphaned.has(idMap.get(toolCall.id) ?? '')
          ) {
            const resolvedId = idMap.get(toolCall.id) ?? toolCall.id
            result.push({
              role: 'toolResult',
              toolCallId: resolvedId,
              content: [
                {
                  type: 'text',
                  text: 'Tool execution was interrupted or did not complete.'
                }
              ],
              error: true
            } as unknown as Message)
          }
        }
      }
    } else if (msg.role === 'toolResult') {
      // Normalize tool result's toolCallId
      const toolResult = msg as Message & { toolCallId?: string }
      const oldId = toolResult.toolCallId
      if (oldId && idMap.has(oldId)) {
        result.push({
          ...msg,
          toolCallId: idMap.get(oldId)
        } as Message)
      } else {
        result.push(msg)
      }
    } else {
      result.push(msg)
    }
  }

  return result
}
