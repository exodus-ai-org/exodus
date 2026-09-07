import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getVersion: () => '1.2.3', getPath: () => '/tmp' }
}))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const appendMock = vi.fn().mockResolvedValue(undefined)
vi.mock('fs/promises', () => ({
  appendFile: (...a: unknown[]) => appendMock(...a)
}))

const { logger } = await import('@main/lib/logger')
const { withTrace } = await import('@main/lib/logger/trace-context')

function lastRecord() {
  const call = appendMock.mock.calls.at(-1)!
  return JSON.parse((call[1] as string).trim())
}

describe('logger.write', () => {
  beforeEach(() => appendMock.mockClear())

  it('emits an OTel-shaped record', () => {
    logger.info('chat', 'hello', { chatId: 'c1' })
    const r = lastRecord()
    expect(r.severityNumber).toBe(9)
    expect(r.severityText).toBe('INFO')
    expect(r.body).toBe('hello')
    expect(r.scope).toEqual({ name: 'chat' })
    expect(r.attributes).toEqual({ chatId: 'c1' })
    expect(r.resource['service.name']).toBe('exodus')
    expect(r.timestamp).toMatch(/^\d{4}-\d\d-\d\dT/)
    expect(r.traceId).toBeUndefined()
  })

  it('expands errors and stamps the trace id when inside withTrace', () => {
    withTrace(() => logger.error('jobs', 'kaboom', { error: new Error('x') }))
    const r = lastRecord()
    expect(r.traceId).toMatch(/^[0-9a-f]{32}$/)
    expect(r.attributes['exception.type']).toBe('Error')
    expect(r.attributes['exception.message']).toBe('x')
  })

  it('merges ambient trace attributes under the call detail', () => {
    withTrace(
      () => {
        logger.info('chat', 'a', { chatId: 'call-wins' })
      },
      { attributes: { chatId: 'ambient', region: 'eu' } }
    )
    const r = lastRecord()
    expect(r.attributes.chatId).toBe('call-wins')
    expect(r.attributes.region).toBe('eu')
  })

  it('carries originTraceId when the trace has one', () => {
    withTrace(() => logger.info('jobs', 'processing'), { originTraceId: 'o1' })
    expect(lastRecord().originTraceId).toBe('o1')
  })

  it('keeps debug in dev (is.dev mocked true)', () => {
    logger.debug('app', 'dev debug')
    expect(appendMock).toHaveBeenCalledTimes(1)
  })

  it('accepts an unregistered surface string', () => {
    logger.info('brand-new-surface', 'ok')
    expect(lastRecord().scope.name).toBe('brand-new-surface')
  })
})
