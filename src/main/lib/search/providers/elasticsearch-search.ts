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
        : undefined
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
      await client.deleteByQuery({
        index: indexName,
        query: { term: { chatId } }
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
