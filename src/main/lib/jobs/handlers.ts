import type { Model } from '@mariozechner/pi-ai'

import { LcmManager } from '../ai/context-management'
import { runMemoryConsolidation } from '../ai/memory/manager'
import { getKnowledgeDocById, setIndexStatus } from '../db/knowledge-queries'
import { getSettings } from '../db/queries'
import type { Message } from '../db/schema'
import { runDiscoverRefresh } from '../discover/manager'
import { contentHash } from '../knowledge-base/reconcile'
import { resolveKnowledgeBase } from '../knowledge-base/resolve-knowledge-base'
import { extractSearchableText } from '../search/extract-searchable-text'
import { resolveSearchProvider } from '../search/resolve-search-provider'
import type { KbSyncPayload, QueueName } from './types'

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
    },

    'kb-sync': async (payload) => {
      const p = payload as KbSyncPayload
      const kb = resolveKnowledgeBase(await getSettings())
      if (!kb) return

      if (p.op === 'delete') {
        try {
          await kb.deleteDoc(p.lightragDocId)
        } catch {
          // The doc is already gone from Exodus; an orphan in LightRAG is
          // harmless and Reindex all never recreates it. Nothing to retry.
        }
        return
      }

      const doc = await getKnowledgeDocById(p.docId)
      if (!doc) return
      const hash = contentHash(doc.title, doc.content)
      if (hash === doc.syncedHash && doc.indexStatus === 'processed') return

      try {
        if (doc.lightragDocId) await kb.deleteDoc(doc.lightragDocId)
        const { trackId } = await kb.insertText(
          `# ${doc.title}\n\n${doc.content}`,
          doc.id
        )
        await setIndexStatus(doc.id, {
          lightragTrackId: trackId,
          syncedHash: hash,
          indexStatus: 'processing',
          indexError: null,
          lightragDocId: null
        })
      } catch (error) {
        await setIndexStatus(doc.id, {
          indexStatus: 'failed',
          indexError: String(error)
        })
        throw error // let pgmq retry the transient case
      }
    },

    'discover-refresh': async (payload) => {
      const p = payload as { force?: boolean }
      await runDiscoverRefresh({ force: p?.force })
    }
  }
