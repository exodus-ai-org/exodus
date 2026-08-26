import type { Settings } from '../db/schema'
import { createElasticsearchProvider } from './providers/elasticsearch-search'
import { pgliteSearchProvider } from './providers/pglite-search'
import type { SearchProvider } from './types'

export interface ResolvedSearchProvider {
  /** null when Elasticsearch isn't configured. */
  elasticsearch: SearchProvider | null
  /** Always available — the unconditional baseline. */
  pglite: SearchProvider
}

export function resolveSearchProvider(
  settings: Settings
): ResolvedSearchProvider {
  const config = settings.search?.elasticsearch
  const elasticsearch =
    config?.url && config.url !== ''
      ? createElasticsearchProvider({ ...config, url: config.url })
      : null

  return { elasticsearch, pglite: pgliteSearchProvider }
}
