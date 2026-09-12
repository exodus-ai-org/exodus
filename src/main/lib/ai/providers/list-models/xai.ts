import { MODEL_METADATA_FALLBACK } from '../resolve-model'
import type { ListModelsFn, NormalizedModel } from './types'

// Confirmed against a live response during Task 8, Step 1 — adjust here if
// xAI's field turns out to be scaled differently than dollars-per-token.
const PER_TOKEN_TO_PER_MILLION = 1_000_000

interface XaiModel {
  id: string
  context_length: number | null
  prompt_text_token_price?: number
  completion_text_token_price?: number
}

export const listXaiModels: ListModelsFn = async ({ apiKey, baseUrl }) => {
  const response = await fetch(`${baseUrl ?? 'https://api.x.ai/v1'}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` }
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`xAI list-models failed (${response.status}): ${body}`)
  }

  const { data } = (await response.json()) as { data: XaiModel[] }

  return data.map((m): NormalizedModel => {
    const fallback = MODEL_METADATA_FALLBACK[m.id]
    const cost =
      m.prompt_text_token_price !== undefined &&
      m.completion_text_token_price !== undefined
        ? {
            input: m.prompt_text_token_price * PER_TOKEN_TO_PER_MILLION,
            output: m.completion_text_token_price * PER_TOKEN_TO_PER_MILLION
          }
        : null
    return {
      id: m.id,
      displayName: m.id,
      snapshot: {
        contextWindow: m.context_length,
        maxOutputTokens: null, // xAI's list API doesn't report this
        reasoningLevels: fallback?.reasoningLevels ?? [],
        cost
      }
    }
  })
}
