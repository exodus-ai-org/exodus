import type { Message } from '../db/schema'

export type SearchHit = Message & { title: string }

export interface SearchProvider {
  indexMessage(message: Message): Promise<void>
  /** Batched form of `indexMessage`, for reindexing existing history. */
  bulkIndexMessages(messages: Message[]): Promise<void>
  deleteByChatId(chatId: string): Promise<void>
  /** Clears the whole index — mirrors a full `resetAllData()` on the DB side. */
  deleteAll(): Promise<void>
  search(query: string): Promise<SearchHit[]>
  /**
   * Pure connectivity/health check — must not depend on the index existing
   * (so it works against a freshly-configured cluster before anything has
   * been indexed) or on any data being present.
   */
  ping(): Promise<void>
}
