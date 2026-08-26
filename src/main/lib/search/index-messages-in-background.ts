import type { Message, Settings } from '../db/schema'
import { logger } from '../logger'
import { extractSearchableText } from './extract-searchable-text'
import { resolveSearchProvider } from './resolve-search-provider'

/**
 * Fire-and-forget: indexes messages into Elasticsearch when configured.
 * Never awaited by callers — a failure here must never affect the chat
 * response, since PGlite's `searchText` column (populated in
 * `saveMessages()`) is already the durable, always-on search baseline.
 *
 * Callers pass the same pre-save row shape they pass to `saveMessages()`
 * (i.e. without `searchText` — it isn't computed yet at that point), so
 * `searchText` is derived here with the same `extractSearchableText()` used
 * by `saveMessages()` in `db/queries.ts`.
 */
export function indexMessagesInBackground(
  messages: Array<Omit<Message, 'searchText'>>,
  settings: Settings
): void {
  const { elasticsearch } = resolveSearchProvider(settings)
  if (!elasticsearch) return

  for (const msg of messages) {
    const message: Message = { ...msg, searchText: extractSearchableText(msg) }
    elasticsearch.indexMessage(message).catch((error) => {
      logger.error('search', 'Failed to index message in Elasticsearch', {
        error: String(error)
      })
    })
  }
}
