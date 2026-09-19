/**
 * API integration tests for /api/v1/knowledge-base
 */
import { apiTest as test, expect } from '../fixtures/api-client'

test.describe('Knowledge Base API', () => {
  test('documents CRUD sets index status to pending', async ({ api }) => {
    const created = await api.post<{ id: string; indexStatus: string }>(
      '/api/v1/knowledge-base/documents',
      { title: 'Handbook', content: 'The office opens at 9.' }
    )
    expect(created.status).toBe(201)
    expect(created.data.indexStatus).toBe('pending')
    const id = created.data.id

    const updated = await api.put(`/api/v1/knowledge-base/documents/${id}`, {
      content: 'The office opens at 8.'
    })
    expect(updated.status).toBe(200)

    const list = await api.get<Array<{ id: string }>>(
      '/api/v1/knowledge-base/documents'
    )
    expect(list.data.some((d) => d.id === id)).toBe(true)

    const del = await api.delete(`/api/v1/knowledge-base/documents/${id}`)
    expect(del.status).toBe(200)
  })

  test('test-connection 400s when unconfigured', async ({ api }) => {
    await api.updateSettings({ knowledgeBase: { url: '' } })
    const res = await api.post('/api/v1/knowledge-base/test-connection')
    expect(res.status).toBe(400)
  })
})
