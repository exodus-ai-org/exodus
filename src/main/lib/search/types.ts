import type { Message } from '../db/schema'

export type SearchHit = Message & { title: string }

export interface SearchProvider {
  indexMessage(message: Message): Promise<void>
  deleteByChatId(chatId: string): Promise<void>
  /** Clears the whole index — mirrors a full `resetAllData()` on the DB side. */
  deleteAll(): Promise<void>
  search(query: string): Promise<SearchHit[]>
}
