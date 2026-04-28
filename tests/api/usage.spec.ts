/**
 * API integration tests: Usage tracking.
 */
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('Usage API', () => {
  test('GET /api/usage returns usage stats structure', async ({ api }) => {
    const { status, data } =
      await api.get<Record<string, unknown>>('/api/usage')
    expect(status).toBe(200)
    expect(data).toBeTruthy()
    // Should have the expected shape (even if zeros for fresh DB)
    expect(data).toHaveProperty('totalCost')
    expect(data).toHaveProperty('totalTokens')
    expect(data).toHaveProperty('totalRequests')
  })
})
