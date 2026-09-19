/**
 * API integration tests for /api/v1/settings/models
 */
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('POST /api/v1/settings/models', () => {
  test('rejects an unknown provider', async ({ api }) => {
    const { status } = await api.post('/api/v1/settings/models', {
      provider: 'not-a-real-provider'
    })
    expect(status).toBe(400)
  })

  test('rejects a missing API key for a non-Ollama provider', async ({
    api
  }) => {
    const { status } = await api.post('/api/v1/settings/models', {
      provider: 'OpenAI GPT'
    })
    expect(status).toBe(400)
  })
})
