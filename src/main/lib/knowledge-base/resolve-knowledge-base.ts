// src/main/lib/knowledge-base/resolve-knowledge-base.ts
import type { Settings } from '../db/schema'
import { logger } from '../logger'
import { LightRagClient } from './lightrag-client'

let cachedKey: string | null = null
let cachedClient: LightRagClient | null = null

/**
 * Never throws — runs on the hot chat path (bindCallingTools, Philharmonic
 * loops). Empty or malformed URL is treated exactly as "not configured".
 *
 * The client is cached by url+apiKey; a config change produces a different key
 * so the stale client is simply never reused.
 */
export function resolveKnowledgeBase(
  settings: Settings
): LightRagClient | null {
  const cfg = settings.knowledgeBase
  const url = cfg?.url?.trim()
  if (!url) return null
  if (!/^https?:\/\//.test(url)) {
    logger.warn('knowledge-base', 'Ignoring malformed knowledge base URL', {
      url
    })
    return null
  }
  const key = JSON.stringify([url, cfg?.apiKey ?? ''])
  if (cachedClient && cachedKey === key) return cachedClient
  try {
    cachedClient = new LightRagClient(url, cfg?.apiKey ?? undefined)
    cachedKey = key
    return cachedClient
  } catch (error) {
    logger.warn('knowledge-base', 'Failed to build LightRAG client', {
      error: String(error)
    })
    return null
  }
}
