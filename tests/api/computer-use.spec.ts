/**
 * API integration tests: Computer Use control endpoints.
 *
 * Both endpoints are thin glue over the in-process `liveness` /
 * `computerAskRegistry` singletons. With no session running they are safe
 * no-ops that still answer `{ ok: true }` — that is what these cover.
 */
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('Computer Use API', () => {
  test('POST /api/computer-use/abort is a no-op { ok: true } when nothing is running', async ({
    api
  }) => {
    const { status, data } = await api.post<{ ok: boolean }>(
      '/api/computer-use/abort'
    )
    expect(status).toBe(200)
    expect(data.ok).toBe(true)
  })

  test('POST /api/computer-use/answer no-ops for an unknown session id', async ({
    api
  }) => {
    const { status, data } = await api.post<{ ok: boolean }>(
      '/api/computer-use/answer',
      { sessionId: 'never-registered', answer: 'hello' }
    )
    expect(status).toBe(200)
    expect(data.ok).toBe(true)
  })

  test('POST /api/computer-use/answer tolerates a missing body', async ({
    api
  }) => {
    const { status, data } = await api.post<{ ok: boolean }>(
      '/api/computer-use/answer'
    )
    expect(status).toBe(200)
    expect(data.ok).toBe(true)
  })
})
