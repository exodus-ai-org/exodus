import type { Model } from '@mariozechner/pi-ai'

import { LcmManager } from '../ai/context-management'
import { runMemoryConsolidation } from '../ai/memory/manager'
import { getSettings } from '../db/queries'
import type { Message } from '../db/schema'
import { extractSearchableText } from '../search/extract-searchable-text'
import { resolveSearchProvider } from '../search/resolve-search-provider'
import type { QueueName } from './types'

interface IndexMessagePayload {
  id: string
  chatId: string
  role: string
  content: unknown
  createdAt: Date
}

interface LcmPostTurnPayload {
  chatId: string
  chatModel: Model<string>
  apiKey: string
  freshTailSize: number
  contextWindowPercent: number
  newMessages: Array<{ id: string; content: unknown }>
}

interface MemoryConsolidatePayload {
  messages: Array<{ role: string; content: unknown }>
  chatModel: Model<string>
  apiKey: string
}

export const handlers: Record<QueueName, (payload: unknown) => Promise<void>> =
  {
    'index-message': async (payload) => {
      const row = payload as IndexMessagePayload
      const settings = await getSettings()
      const { elasticsearch } = resolveSearchProvider(settings)
      if (!elasticsearch) return
      const message = {
        ...row,
        searchText: extractSearchableText(row)
      } as Message & { id: string; chatId: string; createdAt: Date }
      await elasticsearch.indexMessage(message)
    },

    'lcm-post-turn': async (payload) => {
      const p = payload as LcmPostTurnPayload
      const lcm = new LcmManager(p.chatId, p.chatModel, p.apiKey, {
        freshTailSize: p.freshTailSize,
        contextWindowPercent: p.contextWindowPercent
      })
      await lcm.trackNewMessages(p.newMessages)
      await lcm.compactAfterTurn()
    },

    'memory-consolidate': async (payload) => {
      const p = payload as MemoryConsolidatePayload
      await runMemoryConsolidation(p.messages, p.chatModel, p.apiKey)
    }
  }
