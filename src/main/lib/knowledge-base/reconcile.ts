// src/main/lib/knowledge-base/reconcile.ts
import { createHash } from 'crypto'

import { getProcessingDocs, setIndexStatus } from '../db/knowledge-queries'
import { getSettings } from '../db/queries'
import { logger } from '../logger'
import { resolveKnowledgeBase } from './resolve-knowledge-base'

/** The exact text a document is indexed as — title folded into the body. */
export function contentHash(title: string, content: string): string {
  return createHash('sha256').update(`# ${title}\n\n${content}`).digest('hex')
}

const STALE_AFTER_MS = 10 * 60 * 1000

/**
 * Settles knowledge_doc rows stuck in `processing` by polling LightRAG's
 * track_status. The only status-settlement path — covers the normal case
 * (badge flips within one cron tick), a process restart mid-ingest, and a
 * LightRAG that silently drops the job (→ `stale` after 10 min).
 */
export async function reconcileKnowledgeIndexStatus(): Promise<void> {
  const settings = await getSettings()
  const kb = resolveKnowledgeBase(settings)
  if (!kb) return

  const rows = await getProcessingDocs()
  for (const row of rows) {
    if (!row.lightragTrackId) continue
    try {
      const st = await kb.trackStatus(row.lightragTrackId)
      if (st.status === 'processed') {
        await setIndexStatus(row.id, {
          indexStatus: 'processed',
          indexError: null,
          lightragDocId: st.docId ?? row.lightragDocId ?? null
        })
      } else if (st.status === 'failed') {
        await setIndexStatus(row.id, {
          indexStatus: 'failed',
          indexError: st.error ?? 'LightRAG reported a processing failure'
        })
      } else if (Date.now() - row.updatedAt.getTime() > STALE_AFTER_MS) {
        await setIndexStatus(row.id, { indexStatus: 'stale' })
      }
    } catch (error) {
      logger.warn('knowledge-base', 'reconcile: track_status failed', {
        docId: row.id,
        error: String(error)
      })
    }
  }
}
