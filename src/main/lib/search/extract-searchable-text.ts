interface SearchableMessage {
  role: string
  content: unknown
}

function isNonEmptyTextBlock(
  block: unknown
): block is { type: 'text'; text: string } {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as { type?: unknown }).type === 'text' &&
    typeof (block as { text?: unknown }).text === 'string' &&
    (block as { text: string }).text !== ''
  )
}

/**
 * Extracts the text actually shown in the chat bubble for a message — the
 * same content `search-dialog.tsx` displays. Excludes `thinking` blocks and
 * all `toolResult` messages (web search payloads, tool output, etc.) so
 * search only matches what a user would recognize seeing in the transcript.
 *
 * The backfill migration (`resources/drizzle/0009_dry_thor_girl.sql`)
 * reimplements this same logic in raw SQL to populate `searchText` for
 * pre-existing rows. The two are equivalent only because `content` array
 * elements' `text` field is always a real string and `role` is always one
 * of `'user' | 'assistant' | 'toolResult'` (per `ChatMessage`'s closed union
 * in `@shared/types/chat.ts`) — if either invariant ever changes, re-check
 * the migration SQL stays in sync with this function.
 */
export function extractSearchableText(
  message: SearchableMessage
): string | null {
  if (message.role === 'toolResult') return null

  const { content } = message
  if (typeof content === 'string') {
    return content === '' ? null : content
  }

  if (!Array.isArray(content)) return null

  const text = content
    .filter(isNonEmptyTextBlock)
    .map((block) => block.text)
    .join('\n')

  return text === '' ? null : text
}
