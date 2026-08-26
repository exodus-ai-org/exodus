import { describe, expect, it, vi } from 'vitest'

const mockReadBatch = vi.fn()
const mockArchiveMessage = vi.fn()
const mockEnqueueJob = vi.fn()
vi.mock('@main/lib/jobs/queries', () => ({
  readBatch: mockReadBatch,
  archiveMessage: mockArchiveMessage,
  enqueueJob: mockEnqueueJob
}))

const mockIndexMessageHandler = vi.fn()
vi.mock('@main/lib/jobs/handlers', () => ({
  handlers: {
    'index-message': mockIndexMessageHandler,
    'lcm-post-turn': vi.fn(),
    'memory-write-judge': vi.fn(),
    'session-summary': vi.fn()
  }
}))

vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn() }
}))

const { processQueue, enqueueAndProcess } =
  await import('@main/lib/jobs/worker')

describe('processQueue', () => {
  it('archives a message after its handler succeeds', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 1, readCt: 0, message: { id: 'msg-1' } }
    ])
    mockIndexMessageHandler.mockResolvedValue(undefined)

    await processQueue('index-message')

    expect(mockIndexMessageHandler).toHaveBeenCalledWith({ id: 'msg-1' })
    expect(mockArchiveMessage).toHaveBeenCalledWith('index-message', 1)
  })

  it('leaves a failed message alone for retry when under the attempt cap', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 2, readCt: 1, message: { id: 'msg-2' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))
    mockArchiveMessage.mockClear()

    await processQueue('index-message')

    expect(mockArchiveMessage).not.toHaveBeenCalled()
  })

  it('archives a failed message once it exceeds the attempt cap', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 3, readCt: 5, message: { id: 'msg-3' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))
    mockArchiveMessage.mockClear()

    await processQueue('index-message')

    expect(mockArchiveMessage).toHaveBeenCalledWith('index-message', 3)
  })

  it('processes an empty batch without error', async () => {
    mockReadBatch.mockResolvedValueOnce([])
    await expect(processQueue('index-message')).resolves.toBeUndefined()
  })
})

describe('enqueueAndProcess', () => {
  it('enqueues the job and resolves without waiting for processing', async () => {
    mockEnqueueJob.mockResolvedValue(undefined)
    mockReadBatch.mockResolvedValueOnce([])

    await expect(
      enqueueAndProcess('index-message', { id: 'msg-1' })
    ).resolves.toBeUndefined()

    expect(mockEnqueueJob).toHaveBeenCalledWith('index-message', {
      id: 'msg-1'
    })
  })
})
