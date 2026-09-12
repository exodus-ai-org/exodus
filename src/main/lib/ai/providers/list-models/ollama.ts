import type { ListModelsFn, NormalizedModel } from './types'

export const listOllamaModels: ListModelsFn = async ({ baseUrl }) => {
  const base = baseUrl ?? 'http://localhost:11434'
  const response = await fetch(`${base}/api/tags`)

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Ollama list-models failed (${response.status}): ${body}`)
  }

  const { models } = (await response.json()) as { models: { name: string }[] }

  return models.map((m): NormalizedModel => ({
    id: m.name,
    displayName: m.name,
    snapshot: {
      contextWindow: null,
      maxOutputTokens: null,
      reasoningLevels: [],
      cost: null
    }
  }))
}
