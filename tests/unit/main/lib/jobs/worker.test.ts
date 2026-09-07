import { beforeEach, describe, expect, it, vi } from 'vitest'

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
    'memory-consolidate': vi.fn(),
    'kb-sync': vi.fn(),
    'discover-refresh': vi.fn()
  }
}))

vi.mock('@main/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const { logger } = await import('@main/lib/logger')
const { processQueue, enqueueAndProcess, logEnqueueFailure } =
  await import('@main/lib/jobs/worker')

beforeEach(() => {
  vi.clearAllMocks()
  // Faithful to the real signature: `archiveMessage` returns a promise, and
  // `processQueue` attaches a `.catch` to it on the give-up path.
  mockArchiveMessage.mockResolvedValue(undefined)
})

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

    await processQueue('index-message')

    expect(mockArchiveMessage).not.toHaveBeenCalled()
  })

  it('leaves a failed message alone on the last attempt below the cap', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 4, readCt: 4, message: { id: 'msg-4' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))

    await processQueue('index-message')

    expect(mockArchiveMessage).not.toHaveBeenCalled()
  })

  it('archives a failed message once it exceeds the attempt cap', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 3, readCt: 5, message: { id: 'msg-3' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))

    await processQueue('index-message')

    expect(mockArchiveMessage).toHaveBeenCalledWith('index-message', 3)
  })

  it('keeps processing the batch when the give-up archive itself fails', async () => {
    mockReadBatch.mockResolvedValueOnce([
      { msgId: 10, readCt: 5, message: { id: 'msg-10' } },
      { msgId: 11, readCt: 0, message: { id: 'msg-11' } }
    ])
    mockIndexMessageHandler.mockRejectedValueOnce(new Error('boom'))
    mockIndexMessageHandler.mockResolvedValue(undefined)
    mockArchiveMessage.mockRejectedValueOnce(new Error('archive exploded'))

    await expect(processQueue('index-message')).resolves.toBeUndefined()

    // The second message still got handled and archived.
    expect(mockIndexMessageHandler).toHaveBeenCalledWith({ id: 'msg-11' })
    expect(mockArchiveMessage).toHaveBeenCalledWith('index-message', 11)
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

describe('logEnqueueFailure', () => {
  it('logs the queue name and error name but never the message or payload', () => {
    // A DrizzleQueryError's message embeds the query text *and* its bound
    // parameters, which for these queues include API keys and message content.
    const error = new Error(
      'Failed query: SELECT * FROM pgmq.send($1, $2::jsonb) params: memory-consolidate,{"apiKey":"sk-super-secret"}'
    )
    error.name = 'DrizzleQueryError'

    logEnqueueFailure('memory-consolidate', error)

    expect(logger.error).toHaveBeenCalledWith(
      'jobs',
      'Failed to enqueue memory-consolidate job',
      { queueName: 'memory-consolidate', errorName: 'DrizzleQueryError' }
    )
    expect(JSON.stringify(vi.mocked(logger.error).mock.calls)).not.toContain(
      'sk-super-secret'
    )
  })

  it('falls back to typeof for non-Error rejections', () => {
    logEnqueueFailure('index-message', 'plain string rejection')

    expect(logger.error).toHaveBeenCalledWith(
      'jobs',
      'Failed to enqueue index-message job',
      { queueName: 'index-message', errorName: 'string' }
    )
  })
})
