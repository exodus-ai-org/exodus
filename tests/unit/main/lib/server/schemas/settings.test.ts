import { listModelsRequestSchema } from '@main/lib/server/schemas/settings'
import { describe, expect, it } from 'vitest'

describe('listModelsRequestSchema', () => {
  it('accepts null apiKey/baseUrl/apiVersion — the shape react-hook-form actually sends for an unset ProvidersSchema field', () => {
    const result = listModelsRequestSchema.safeParse({
      provider: 'OpenAI GPT',
      apiKey: 'sk-test',
      baseUrl: null,
      apiVersion: null
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.baseUrl).toBeNull()
      expect(result.data.apiVersion).toBeNull()
    }
  })

  it('still accepts the fields being omitted entirely', () => {
    const result = listModelsRequestSchema.safeParse({ provider: 'Ollama' })
    expect(result.success).toBe(true)
  })

  it('rejects an unknown provider', () => {
    const result = listModelsRequestSchema.safeParse({
      provider: 'not-a-real-provider'
    })
    expect(result.success).toBe(false)
  })
})
