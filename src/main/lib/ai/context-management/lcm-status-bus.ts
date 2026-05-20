import { logger } from '../../logger'

export type LcmStatusEvent =
  | { type: 'start'; chatId: string; startedAt: number }
  | {
      type: 'complete'
      chatId: string
      durationMs: number
      messagesBefore: number
      messagesAfter: number
      tokensSaved: number
    }
  | { type: 'error'; chatId: string; error: string }

export type LcmStatusListener = (event: LcmStatusEvent) => void

export class LcmStatusBus {
  private listeners = new Map<string, Set<LcmStatusListener>>()
  private running = new Set<string>()

  emit(event: LcmStatusEvent): void {
    if (event.type === 'start') {
      this.running.add(event.chatId)
    } else {
      this.running.delete(event.chatId)
    }

    const subscribers = this.listeners.get(event.chatId)
    if (!subscribers || subscribers.size === 0) return

    for (const listener of subscribers) {
      try {
        listener(event)
      } catch (err) {
        logger.warn('lcm', 'LcmStatusBus listener threw', {
          chatId: event.chatId,
          error: String(err)
        })
      }
    }
  }

  subscribe(chatId: string, listener: LcmStatusListener): () => void {
    let set = this.listeners.get(chatId)
    if (!set) {
      set = new Set()
      this.listeners.set(chatId, set)
    }
    set.add(listener)

    return () => {
      const current = this.listeners.get(chatId)
      if (!current) return
      current.delete(listener)
      if (current.size === 0) this.listeners.delete(chatId)
    }
  }

  getCurrentState(chatId: string): 'idle' | 'running' {
    return this.running.has(chatId) ? 'running' : 'idle'
  }
}

export const lcmStatusBus = new LcmStatusBus()
