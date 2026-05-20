import { describe, expect, it, vi } from 'vitest'

// Mock modules that transitively import Electron
vi.mock('electron', () => ({ app: { getPath: () => '/tmp' } }))
vi.mock('@electron-toolkit/utils', () => ({ is: { dev: true } }))

const { LcmStatusBus } = await import('./lcm-status-bus')

describe('LcmStatusBus', () => {
  it('reports idle by default', () => {
    const bus = new LcmStatusBus()
    expect(bus.getCurrentState('chat-1')).toBe('idle')
  })

  it('flips to running on start and back to idle on complete', () => {
    const bus = new LcmStatusBus()
    bus.emit({ type: 'start', chatId: 'chat-1', startedAt: 1 })
    expect(bus.getCurrentState('chat-1')).toBe('running')

    bus.emit({
      type: 'complete',
      chatId: 'chat-1',
      durationMs: 100,
      messagesBefore: 30,
      messagesAfter: 18,
      tokensSaved: 12000
    })
    expect(bus.getCurrentState('chat-1')).toBe('idle')
  })

  it('flips to idle on error', () => {
    const bus = new LcmStatusBus()
    bus.emit({ type: 'start', chatId: 'chat-1', startedAt: 1 })
    bus.emit({ type: 'error', chatId: 'chat-1', error: 'boom' })
    expect(bus.getCurrentState('chat-1')).toBe('idle')
  })

  it('delivers events to all subscribers of the same chatId', () => {
    const bus = new LcmStatusBus()
    const a = vi.fn()
    const b = vi.fn()
    bus.subscribe('chat-1', a)
    bus.subscribe('chat-1', b)

    bus.emit({ type: 'start', chatId: 'chat-1', startedAt: 1 })

    expect(a).toHaveBeenCalledTimes(1)
    expect(b).toHaveBeenCalledTimes(1)
  })

  it('does not leak events across chatIds', () => {
    const bus = new LcmStatusBus()
    const a = vi.fn()
    bus.subscribe('chat-1', a)

    bus.emit({ type: 'start', chatId: 'chat-2', startedAt: 1 })

    expect(a).not.toHaveBeenCalled()
    expect(bus.getCurrentState('chat-1')).toBe('idle')
    expect(bus.getCurrentState('chat-2')).toBe('running')
  })

  it('unsubscribe stops further deliveries', () => {
    const bus = new LcmStatusBus()
    const listener = vi.fn()
    const off = bus.subscribe('chat-1', listener)

    off()
    bus.emit({ type: 'start', chatId: 'chat-1', startedAt: 1 })

    expect(listener).not.toHaveBeenCalled()
  })

  it('swallows listener errors so other subscribers still receive', () => {
    const bus = new LcmStatusBus()
    const bad = vi.fn(() => {
      throw new Error('boom')
    })
    const good = vi.fn()
    bus.subscribe('chat-1', bad)
    bus.subscribe('chat-1', good)

    expect(() =>
      bus.emit({ type: 'start', chatId: 'chat-1', startedAt: 1 })
    ).not.toThrow()
    expect(good).toHaveBeenCalledTimes(1)
  })
})
