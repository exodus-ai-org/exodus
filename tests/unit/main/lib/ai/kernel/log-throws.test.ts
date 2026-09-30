import { beforeEach, describe, expect, it, vi } from 'vitest'

const error = vi.fn()
vi.mock('@main/lib/logger', () => ({
  logger: { error, warn: vi.fn(), info: vi.fn(), debug: vi.fn() }
}))

const { loggingThrows } = await import('@main/lib/ai/kernel/log-throws')

/** The logger is imported when there is something to log: wait for it. */
async function logged(): Promise<typeof error> {
  await vi.dynamicImportSettled()
  await Promise.resolve()
  return error
}

beforeEach(() => error.mockClear())

describe('loggingThrows', () => {
  it('passes arguments and the result through when nothing throws', async () => {
    const add = loggingThrows('add', (a: number, b: number) => a + b)
    expect(add(2, 3)).toBe(5)
    const later = loggingThrows('later', async (a: number) => a * 2)
    await expect(later(4)).resolves.toBe(8)
    expect(await logged()).not.toHaveBeenCalled()
  })

  it('logs what a function throws — the Error itself — and throws it on', async () => {
    const thrown = new TypeError(
      "Cannot read properties of undefined (reading 'totalTokens')"
    )
    const listener = loggingThrows(
      'listener',
      (_event: { type: string }) => {
        throw thrown
      },
      (event) => ({ chatId: 'c1', runId: 'r1', event: event.type })
    )
    expect(() => listener({ type: 'message_end' })).toThrow(thrown)
    expect(await logged()).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith('kernel', 'listener threw', {
      chatId: 'c1',
      runId: 'r1',
      event: 'message_end',
      error: thrown
    })
    expect(error.mock.calls[0][2].error).toBe(thrown)
  })

  it('logs what an async function rejects with, and rejects with it', async () => {
    const thrown = new Error('boom')
    const before = loggingThrows('beforeToolCall', async () => {
      await Promise.resolve()
      throw thrown
    })
    await expect(before()).rejects.toBe(thrown)
    expect(await logged()).toHaveBeenCalledTimes(1)
    expect(error).toHaveBeenCalledWith('kernel', 'beforeToolCall threw', {
      error: thrown
    })
  })

  it('logs an error once, however many wrapped calls it passes through', async () => {
    const thrown = new Error('boom')
    const inner = loggingThrows('inner', () => {
      throw thrown
    })
    const outer = loggingThrows('outer', () => inner())
    expect(() => outer()).toThrow(thrown)
    expect(await logged()).toHaveBeenCalledTimes(1)
    expect(error.mock.calls[0][1]).toBe('inner threw')
  })

  it('logs a thrown value that is not an Error', async () => {
    const fn = loggingThrows('streamFn', () => {
      throw 'a string'
    })
    expect(() => fn()).toThrow('a string')
    expect(await logged()).toHaveBeenCalledWith('kernel', 'streamFn threw', {
      error: 'a string'
    })
  })

  it('says nothing of Stop: an abort is not a failure', async () => {
    const aborted = new DOMException('This operation was aborted', 'AbortError')
    const fn = loggingThrows('beforeToolCall', async () => {
      throw aborted
    })
    await expect(fn()).rejects.toBe(aborted)
    expect(await logged()).not.toHaveBeenCalled()
  })

  it('still throws the error on when building the context for the log fails', async () => {
    const thrown = new Error('boom')
    const fn = loggingThrows(
      'listener',
      () => {
        throw thrown
      },
      () => {
        throw new Error('context failed')
      }
    )
    expect(() => fn()).toThrow(thrown)
    expect(await logged()).toHaveBeenCalledWith('kernel', 'listener threw', {
      error: thrown
    })
  })
})
