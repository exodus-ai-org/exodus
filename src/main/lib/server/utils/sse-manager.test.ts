import { describe, it, expect, vi } from 'vitest'

import { SseManager } from './sse-manager'

function makeController(): ReadableStreamDefaultController {
  return {
    enqueue: vi.fn(),
    close: vi.fn()
  } as unknown as ReadableStreamDefaultController
}

describe('SseManager', () => {
  it('registers and unregisters clients', () => {
    const manager = new SseManager<string>()
    const controller = makeController()
    manager.register('task-1', controller)
    expect(manager.hasClients('task-1')).toBe(true)
    manager.unregister('task-1', controller)
    expect(manager.hasClients('task-1')).toBe(false)
  })

  it('emits to specific topic clients', () => {
    const manager = new SseManager<string>()
    const controller = makeController()
    manager.register('task-1', controller)
    manager.emit('task-1', { type: 'update', data: 'hello' })
    expect(controller.enqueue).toHaveBeenCalled()
  })

  it('emits to global clients', () => {
    const manager = new SseManager<string>()
    const controller = makeController()
    manager.registerGlobal(controller)
    manager.emitGlobal({ type: 'update', data: 'hello' })
    expect(controller.enqueue).toHaveBeenCalled()
  })

  it('cleans up on abort signal', () => {
    const manager = new SseManager<string>()
    const controller = makeController()
    const abortController = new AbortController()
    manager.register('task-1', controller, abortController.signal)
    abortController.abort()
    expect(manager.hasClients('task-1')).toBe(false)
  })

  it('removes client on enqueue error', () => {
    const manager = new SseManager<string>()
    const controller = {
      enqueue: vi.fn().mockImplementation(() => {
        throw new Error('closed')
      }),
      close: vi.fn()
    } as unknown as ReadableStreamDefaultController
    manager.register('task-1', controller)
    manager.emit('task-1', { type: 'update', data: 'hello' })
    expect(manager.hasClients('task-1')).toBe(false)
  })

  it('encodes event and emits raw payload', () => {
    const manager = new SseManager<string>()
    const controller = makeController()
    manager.register('task-1', controller)
    const payload = manager.encodeEvent({ type: 'test', value: 42 })
    manager.emitRaw('task-1', payload)
    expect(controller.enqueue).toHaveBeenCalledWith(payload)
  })

  it('emits global raw payload', () => {
    const manager = new SseManager<string>()
    const controller = makeController()
    manager.registerGlobal(controller)
    const payload = manager.encodeEvent({ type: 'test' })
    manager.emitGlobalRaw(payload)
    expect(controller.enqueue).toHaveBeenCalledWith(payload)
  })
})
