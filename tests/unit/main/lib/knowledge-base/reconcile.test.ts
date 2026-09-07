import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))
vi.mock('@main/lib/db/db', () => ({ db: {}, pglite: {} }))

const mockGetSettings = vi.fn()
vi.mock('@main/lib/db/queries', () => ({ getSettings: mockGetSettings }))

const mockGetProcessingDocs = vi.fn()
const mockSetIndexStatus = vi.fn()
vi.mock('@main/lib/db/knowledge-queries', () => ({
  getProcessingDocs: mockGetProcessingDocs,
  setIndexStatus: mockSetIndexStatus
}))

const mockTrackStatus = vi.fn()
vi.mock('@main/lib/knowledge-base/resolve-knowledge-base', () => ({
  resolveKnowledgeBase: () => ({ trackStatus: mockTrackStatus })
}))

const { reconcileKnowledgeIndexStatus } =
  await import('@main/lib/knowledge-base/reconcile')

const row = (over: Record<string, unknown> = {}) => ({
  id: 'd1',
  lightragTrackId: 'txt_1',
  lightragDocId: null,
  updatedAt: new Date(),
  ...over
})

describe('reconcileKnowledgeIndexStatus', () => {
  it('marks processed rows processed and stores the doc id', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockGetProcessingDocs.mockResolvedValue([row()])
    mockTrackStatus.mockResolvedValue({ status: 'processed', docId: 'ldoc-9' })

    await reconcileKnowledgeIndexStatus()

    expect(mockSetIndexStatus).toHaveBeenCalledWith('d1', {
      indexStatus: 'processed',
      indexError: null,
      lightragDocId: 'ldoc-9'
    })
  })

  it('marks failed rows failed', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockGetProcessingDocs.mockResolvedValue([row()])
    mockTrackStatus.mockResolvedValue({ status: 'failed', error: 'bad pdf' })

    await reconcileKnowledgeIndexStatus()

    expect(mockSetIndexStatus).toHaveBeenCalledWith('d1', {
      indexStatus: 'failed',
      indexError: 'bad pdf'
    })
  })

  it('marks long-stuck rows stale', async () => {
    mockGetSettings.mockResolvedValue({ id: 'global' })
    mockGetProcessingDocs.mockResolvedValue([
      row({ updatedAt: new Date(Date.now() - 20 * 60 * 1000) })
    ])
    mockTrackStatus.mockResolvedValue({ status: 'processing' })

    await reconcileKnowledgeIndexStatus()

    expect(mockSetIndexStatus).toHaveBeenCalledWith('d1', {
      indexStatus: 'stale'
    })
  })
})
