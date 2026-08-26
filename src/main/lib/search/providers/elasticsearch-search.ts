import { Client } from '@elastic/elasticsearch'

import { getMessagesWithTitleByIds } from '../../db/queries'
import type { Message } from '../../db/schema'
import type { SearchProvider } from '../types'

export interface ElasticsearchProviderConfig {
  url: string
  username?: string | null
  password?: string | null
  indexName?: string | null
}

const DEFAULT_INDEX_NAME = 'exodus-messages'

export function createElasticsearchProvider(
  config: ElasticsearchProviderConfig
): SearchProvider {
  const client = new Client({
    node: config.url,
    auth:
      config.username && config.password
        ? { username: config.username, password: config.password }
        : undefined,
    // The transport defaults to no request timeout and 3 retries, so a
    // routable-but-unreachable host (firewalled, wrong port, VPN-only cluster)
    // hangs forever instead of rejecting — which means the PGlite fallback in
    // `GET /api/chat/search` never fires and the fire-and-forget indexing calls
    // pile up as hung promises. Fail fast and let the fallback do its job.
    requestTimeout: 5000,
    maxRetries: 1
  })
  const indexName = config.indexName || DEFAULT_INDEX_NAME

  return {
    async indexMessage(message: Message) {
      if (!message.searchText) return
      await client.index({
        index: indexName,
        id: message.id,
        document: {
          chatId: message.chatId,
          searchText: message.searchText,
          createdAt: message.createdAt
        }
      })
    },

    async deleteByChatId(chatId: string) {
      // `chatId.keyword`, not `chatId`: no explicit mapping is created for this
      // index, so dynamic mapping types `chatId` as analyzed `text` — whose
      // tokens are the UUID split on hyphens, which an (unanalyzed) `term`
      // query can never match. The `.keyword` multi-field that dynamic mapping
      // adds alongside every `text` field holds the whole value verbatim.
      await client.deleteByQuery({
        index: indexName,
        query: { term: { 'chatId.keyword': chatId } }
      })
    },

    async deleteAll() {
      await client.deleteByQuery({
        index: indexName,
        query: { match_all: {} }
      })
    },

    async search(query: string) {
      const result = await client.search({
        index: indexName,
        query: { match: { searchText: query } }
      })
      const ids = result.hits.hits
        .map((hit) => hit._id)
        .filter((id): id is string => typeof id === 'string')
      if (ids.length === 0) return []
      return getMessagesWithTitleByIds(ids)
    }
  }
}
