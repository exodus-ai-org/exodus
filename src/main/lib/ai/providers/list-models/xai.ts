import { MODEL_METADATA_FALLBACK } from '../resolve-model'
import type { ListModelsFn, NormalizedModel } from './types'

// UNVERIFIED — assumed dollars-per-token per the Task 8 brief's fallback; no
// live XAI_API_KEY was available to confirm (see task-8-report.md). Adjust
// here if xAI's field turns out to be scaled differently.
const PER_TOKEN_TO_PER_MILLION = 1_000_000

interface XaiModel {
  id: string
  context_length: number | null
  created?: number
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

  // Newest-first by `created`; an entry missing it (shouldn't happen, but the
  // field isn't documented as required) sorts after everything that has one
  // rather than floating to the top via `undefined` comparing as NaN.
  const sorted = [...data].sort((a, b) => (b.created ?? -1) - (a.created ?? -1))

  return sorted.map((m): NormalizedModel => {
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
