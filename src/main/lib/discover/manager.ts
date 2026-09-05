import { completeSimple } from '@mariozechner/pi-ai'
import type { DiscoverGroup } from '@shared/types/discover'
import { z } from 'zod'

import { LOCAL_USER_ID } from '../ai/memory/manager'
import {
  extractTextFromCompletion,
  parseJsonFromLlmResponse
} from '../ai/utils/llm-response-util'
import { getModelFromProvider } from '../ai/utils/model-util'
import { getDiscoverFeed, setDiscoverFeed } from '../db/discover-queries'
import { getActiveMemories, type MemoryRow } from '../db/memory-queries'
import { getSettings } from '../db/queries'
import { logger } from '../logger'
import { searchBraveNews } from './brave-news-client'

const STALE_AFTER_MS = 20 * 60 * 60 * 1000 // ~20h

const DISCOVER_QUERY_SYSTEM = `You turn a user's personal memory entries into news-search queries.

For each memory given, decide:
- If it could plausibly have relevant, genuinely newsworthy developments (a company/stock, a sports team, a public figure, an ongoing situation, a product category) — write ONE concise, high-signal news search query for it, and a short topic label (2-4 words) for display.
- If it's a personal habit, preference, skill practice, or private/local detail with no news angle (e.g. language-study progress, home-network configuration, a personal preference) — set "query" to null.

Return ONLY JSON matching this shape, one entry per memory given, in the same order:
{"items":[{"memoryId":"<id>","topic":"<short label>","query":"<search query>"},{"memoryId":"<id>","topic":"<short label>","query":null}]}`

const discoverQuerySchema = z.object({
  items: z.array(
    z.object({
      memoryId: z.string(),
      topic: z.string().min(1),
      query: z.string().min(1).nullable().optional()
    })
  )
})

function formatMemoryForPrompt(m: MemoryRow): string {
  return `- id: ${m.id}\n  key: ${m.key}\n  summary: ${m.summary}`
}

function recencyMs(m: MemoryRow): number {
  return (m.lastUsedAt ?? m.updatedAt ?? new Date(0)).getTime()
}

export async function runDiscoverRefresh(
  opts: { force?: boolean } = {}
): Promise<void> {
  const settings = await getSettings()
  if (!settings.discover?.enabled) return
  const braveApiKey = settings.webSearch?.braveApiKey
  if (!braveApiKey) return

  const current = await getDiscoverFeed()
  if (!opts.force && current.generatedAt) {
    if (Date.now() - current.generatedAt.getTime() < STALE_AFTER_MS) return
  }

  await setDiscoverFeed({ status: 'refreshing' })

  try {
    const topicCount = settings.discover.topicCount ?? 4
    const articlesPerTopic = settings.discover.articlesPerTopic ?? 3

    const active = await getActiveMemories(LOCAL_USER_ID)
    const candidates = [...active]
      .sort((a, b) => recencyMs(b) - recencyMs(a))
      .slice(0, Math.min(active.length, topicCount + 4))

    if (candidates.length === 0) {
      await setDiscoverFeed({
        groups: [],
        generatedAt: new Date(),
        status: 'idle',
        error: null
      })
      return
    }

    const { chatModel, apiKey } = getModelFromProvider(settings)
    const prompt = `Memories:\n${candidates.map(formatMemoryForPrompt).join('\n')}`
    const result = await completeSimple(
      chatModel,
      {
        systemPrompt: DISCOVER_QUERY_SYSTEM,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: prompt }],
            timestamp: Date.now()
          }
        ]
      },
      { apiKey }
    )
    const text = extractTextFromCompletion(result.content)
    const parsed = parseJsonFromLlmResponse(text, discoverQuerySchema, {
      items: []
    })

    const kept = parsed.items
      .filter(
        (i): i is { memoryId: string; topic: string; query: string } =>
          typeof i.query === 'string' && i.query.trim().length > 0
      )
      .slice(0, topicCount)

    const settled = await Promise.allSettled(
      kept.map((item) =>
        searchBraveNews(braveApiKey, item.query, {
          count: articlesPerTopic,
          country: settings.webSearch?.country,
          language: settings.webSearch?.languages?.[0]
        })
      )
    )

    const groups: DiscoverGroup[] = []
    kept.forEach((item, idx) => {
      const outcome = settled[idx]
      if (outcome.status !== 'fulfilled') {
        logger.warn('discover', 'Brave News query failed', {
          query: item.query,
          error: String(outcome.reason)
        })
        return
      }
      if (outcome.value.length === 0) return
      groups.push({
        memoryId: item.memoryId,
        topic: item.topic,
        query: item.query,
        articles: outcome.value
      })
    })

    await setDiscoverFeed({
      groups,
      generatedAt: new Date(),
      status: 'idle',
      error: null
    })
  } catch (error) {
    await setDiscoverFeed({ status: 'failed', error: String(error) })
    throw error
  }
}
