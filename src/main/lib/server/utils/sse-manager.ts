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

  getClients(topic: Topic): Set<ReadableStreamDefaultController> {
    return this.topicClients.get(topic) ?? new Set()
  }

  emit(topic: Topic, event: { type: string; data: unknown }): void {
    const payload = this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
    const clients = this.topicClients.get(topic)
    if (!clients) return
    for (const controller of clients) {
      try {
        controller.enqueue(payload)
      } catch {
        clients.delete(controller)
      }
    }
  }

  emitGlobal(event: { type: string; data: unknown }): void {
    const payload = this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
    for (const controller of this.globalClients) {
      try {
        controller.enqueue(payload)
      } catch {
        this.globalClients.delete(controller)
      }
    }
  }
}
