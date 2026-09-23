import type { Model } from '@earendil-works/pi-ai'

import { completeSimple } from './complete'

const SYSTEM = `You expand a web-search query into alternate phrasings that a search index would match against DIFFERENT pages, to widen recall.

Return 2 variants that together cover the same information need from other angles — a synonym swap, a broader framing, a more specific framing, or the natural-language question form. Keep each under 12 words, keyword-style. Do NOT just reorder words or add filler. If the query is already optimal and no useful variant exists, return fewer (or an empty array).

Respond ONLY with a JSON array of strings, e.g. ["...", "..."].`

function parseArray(text: string): string[] {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return []
  try {
    const parsed = JSON.parse(match[0])
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Best-effort query fan-out: one cheap LLM call turning a query into up to 2
 * complementary reformulations. Never throws — on any failure the caller
 * falls back to searching the original query alone.
 */
export async function expandQuery(
  query: string,
  model: Model<string>,
  apiKey: string,
  signal?: AbortSignal
): Promise<string[]> {
  try {
    const result = await completeSimple(
      model,
      {
        systemPrompt: SYSTEM,
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', text: query }],
            timestamp: Date.now()
          }
        ]
      },
      { apiKey, signal }
    )
    const text = result.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('')

    const normalized = query.trim().toLowerCase()
    const seen = new Set([normalized])
    const out: string[] = []
    for (const v of parseArray(text)) {
      const key = v.toLowerCase()
      if (v.length > 120 || seen.has(key)) continue
      seen.add(key)
      out.push(v)
      if (out.length === 2) break
    }
    return out
  } catch {
    return []
  }
}
