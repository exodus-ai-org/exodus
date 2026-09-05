/**
 * API integration tests: Discover Feed.
 */
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('Discover API', () => {
  test('GET /api/discover returns the empty-state shape before any refresh', async ({
    api
  }) => {
    const { status, data } = await api.get<{
      groups: unknown[]
      generatedAt: string | null
      status: string
    }>('/api/discover')
    expect(status).toBe(200)
    expect(Array.isArray(data.groups)).toBe(true)
    expect(['idle', 'refreshing', 'failed']).toContain(data.status)
  })

  test('POST /api/discover/refresh no-ops while Discover is disabled', async ({
    api
  }) => {
    await api.updateSettings({ discover: { enabled: false } })
    const res = await api.post<{ status: string }>('/api/discover/refresh')
    expect(res.status).toBe(200)
    // Disabled is a deterministic short-circuit — the route never touches the
    // row, so status can never become 'refreshing' here.
    expect(res.data.status).not.toBe('refreshing')
  })

  test('POST /api/discover/refresh no-ops when no Brave key is configured', async ({
    api
  }) => {
    await api.updateSettings({
      discover: { enabled: true },
      webSearch: { braveApiKey: '' }
    })
    const res = await api.post<{ status: string }>('/api/discover/refresh')
    expect(res.status).toBe(200)
    expect(res.data.status).not.toBe('refreshing')
    await api.updateSettings({ discover: { enabled: false } })
  })
})
