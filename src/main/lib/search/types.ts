import type { Message } from '../db/schema'

export type SearchHit = Message & { title: string }

export interface SearchProvider {
  indexMessage(message: Message): Promise<void>
  deleteByChatId(chatId: string): Promise<void>
  search(query: string): Promise<SearchHit[]>
}
