export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive'
} as const

export class SseManager<Topic extends string = string> {
  private topicClients = new Map<Topic, Set<ReadableStreamDefaultController>>()
  private globalClients = new Set<ReadableStreamDefaultController>()
  private encoder = new TextEncoder()

  register(
    topic: Topic,
    controller: ReadableStreamDefaultController,
    signal?: AbortSignal
  ): void {
    if (!this.topicClients.has(topic)) {
      this.topicClients.set(topic, new Set())
    }
    this.topicClients.get(topic)!.add(controller)
    signal?.addEventListener(
      'abort',
      () => this.unregister(topic, controller),
      { once: true }
    )
  }

  unregister(topic: Topic, controller: ReadableStreamDefaultController): void {
    this.topicClients.get(topic)?.delete(controller)
    if (this.topicClients.get(topic)?.size === 0) {
      this.topicClients.delete(topic)
    }
  }

  registerGlobal(
    controller: ReadableStreamDefaultController,
    signal?: AbortSignal
  ): void {
    this.globalClients.add(controller)
    signal?.addEventListener('abort', () => this.unregisterGlobal(controller), {
      once: true
    })
  }

  unregisterGlobal(controller: ReadableStreamDefaultController): void {
    this.globalClients.delete(controller)
  }

  hasClients(topic: Topic): boolean {
    return (this.topicClients.get(topic)?.size ?? 0) > 0
  }

  encodeEvent(event: Record<string, unknown>): Uint8Array {
    return this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
  }

  emit(topic: Topic, event: Record<string, unknown>): void {
    const clients = this.topicClients.get(topic)
    if (!clients) return
    const payload = this.encodeEvent(event)
    this._enqueueAll(clients, payload)
  }

  emitGlobal(event: Record<string, unknown>): void {
    const payload = this.encodeEvent(event)
    this._enqueueAll(this.globalClients, payload)
  }

  emitRaw(topic: Topic, payload: Uint8Array): void {
    const clients = this.topicClients.get(topic)
    if (!clients) return
    this._enqueueAll(clients, payload)
  }

  emitGlobalRaw(payload: Uint8Array): void {
    this._enqueueAll(this.globalClients, payload)
  }

  private _enqueueAll(
    clients: Set<ReadableStreamDefaultController>,
    payload: Uint8Array
  ): void {
    for (const controller of clients) {
      try {
        controller.enqueue(payload)
      } catch {
        clients.delete(controller)
      }
    }
  }
}
