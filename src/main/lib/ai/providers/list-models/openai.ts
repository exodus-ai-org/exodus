import { MODEL_METADATA_FALLBACK } from '../resolve-model'
import type { ListModelsFn, NormalizedModel } from './types'

export const listOpenAiModels: ListModelsFn = async ({ apiKey, baseUrl }) => {
  const url = `${baseUrl ?? 'https://api.openai.com/v1'}/models`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`OpenAI list-models failed (${response.status}): ${body}`)
  }

  const { data } = (await response.json()) as {
    data: { id: string }[]
  }

  return data.map((m): NormalizedModel => {
    const fallback = MODEL_METADATA_FALLBACK[m.id]
    return {
      id: m.id,
      displayName: m.id,
      snapshot: {
        contextWindow: fallback?.contextWindow ?? null,
        maxOutputTokens: fallback?.maxOutputTokens ?? null,
        reasoningLevels: fallback?.reasoningLevels ?? [],
        cost: fallback?.cost ?? null
      }
    }
  })
}
