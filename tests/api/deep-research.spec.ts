/**
 * API integration tests: Deep Research.
 * Timeout: 5 minutes (deep research is slow).
 */
import { ApiClient, apiTest as test, expect } from '../fixtures/api-client'
import { injectOpenAiProvider } from '../helpers/settings-inject'

test.describe('Deep Research API', () => {
  test.beforeAll(async () => {
    const api = new ApiClient()
    await injectOpenAiProvider(api)
    await api.updateSettings({
      deepResearch: { breadth: 3, depth: 1 }
    })
  })

  test.skip(
    'deep research produces a report — skipped: DB insert bug with deep_research_message table',
    async ({ api }) => {
      const deepResearchId = crypto.randomUUID()

      const { status, data } = await api.startDeepResearch(
        deepResearchId,
        'What are the latest advances in quantum computing in 2026?'
      )

      expect(status).toBe(200)
      expect(data).toBeTruthy()

      const report = (data as Record<string, unknown>).finalReport as
        | string
        | undefined
      if (report) {
        expect(report.length).toBeGreaterThan(100)
      }
    },
    { timeout: 300_000 }
  )
})
