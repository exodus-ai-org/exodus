import type { Settings } from '../db/schema'
import { logger } from '../logger'
import { createElasticsearchProvider } from './providers/elasticsearch-search'
import { pgliteSearchProvider } from './providers/pglite-search'
import type { SearchProvider } from './types'

export interface ResolvedSearchProvider {
  /** null when Elasticsearch isn't configured. */
  elasticsearch: SearchProvider | null
  /** Always available — the unconditional baseline. */
  pglite: SearchProvider
}

/**
 * Never throws. The Elasticsearch `Client` constructor rejects malformed node
 * URLs synchronously (e.g. `localhost:9200` → "Invalid protocol"), and this
 * function is called from hot, unguarded paths — including
 * `indexMessagesInBackground()` inside `POST /api/chat`, where a throw would
 * take down chat entirely rather than just search. A bad configuration is
 * therefore treated exactly like "not configured": log it and fall back to the
 * always-available PGlite provider.
 */
export function resolveSearchProvider(
  settings: Settings
): ResolvedSearchProvider {
  const config = settings.search?.elasticsearch
  let elasticsearch: SearchProvider | null = null

  if (config?.url && config.url !== '') {
    try {
      elasticsearch = createElasticsearchProvider({
        ...config,
        url: config.url
      })
    } catch (error) {
      logger.error(
        'search',
        'Invalid Elasticsearch configuration, falling back to PGlite',
        { error: String(error) }
      )
      elasticsearch = null
    }
  }

  return { elasticsearch, pglite: pgliteSearchProvider }
}
