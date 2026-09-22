import type { Model } from '@earendil-works/pi-ai'
import type {
  ChatAssistantMessage,
  ChatMessage
} from '@exodus/shared/types/chat'

import { saveMessages } from '../../db/queries'
import { enqueueAndProcess, logEnqueueFailure } from '../../jobs/worker'
import { toDbRow } from '../../server/routes/chat-persistence'
import type { KernelEvent } from './events'

export interface RecorderDeps {
  chatId: string
  model: Model<string>
  apiKey: string
  /** LCM's post-run compaction job, or null when LCM is off. */
  lcm: { freshTailRuns: number; contextWindowPercent: number } | null
  /** Whether the memory-consolidation job runs after the run. */
  memoryCapture: boolean
  /** Search indexing for one saved row (a no-op unless Elasticsearch is on). */
  indexMessage: (row: ReturnType<typeof toDbRow>) => void
  /** The conversation before this run, for the memory job's payload. */
  priorMessages: ChatMessage[]
}

/**
 * Persists a run however it ended. The route feeds it every `KernelEvent`
 * and calls `persist()` from its `finally`: the messages that completed
 * (done, provider error midway, Stop) are saved with the run's duration
 * stamped on the last assistant message, then the post-run jobs — LCM
 * compaction, memory consolidation, search indexing — go on the queue
 * rather than running inline.
 */
export class RunRecorder {
  private done: ChatMessage[] = []
  private durationMs = 0
  private persisted = false

  constructor(private readonly deps: RecorderDeps) {}

  observe(event: KernelEvent): void {
    if (event.type === 'run_end') {
      this.done = event.messages
      this.durationMs = event.durationMs
    }
  }

  /** The run's completed messages (empty until `run_end`). */
  get messages(): ChatMessage[] {
    return this.done
  }

  async persist(): Promise<void> {
    if (this.persisted || this.done.length === 0) return
    this.persisted = true
    const {
      chatId,
      model,
      apiKey,
      lcm,
      memoryCapture,
      indexMessage,
      priorMessages
    } = this.deps

    // "Worked for X seconds" reads the last assistant message of the run.
    for (let i = this.done.length - 1; i >= 0; i--) {
      const m = this.done[i]
      if (m.role === 'assistant') {
        ;(m as ChatAssistantMessage).durationMs ??= this.durationMs
        break
      }
    }

    const rows = this.done.map((m) => toDbRow(m, chatId))
    await saveMessages({ messages: rows })
    for (const row of rows) indexMessage(row)

    if (lcm) {
      enqueueAndProcess('lcm-post-turn', {
        chatId,
        model,
        apiKey,
        freshTailRuns: lcm.freshTailRuns,
        contextWindowPercent: lcm.contextWindowPercent,
        newMessages: this.done.map((m) => ({ id: m.id, content: m.content }))
      }).catch((error) => logEnqueueFailure('lcm-post-turn', error))
    }

    if (memoryCapture) {
      enqueueAndProcess('memory-consolidate', {
        messages: [...priorMessages, ...this.done].map((m) => ({
          role: m.role,
          content: m.content
        })),
        model,
        apiKey
      }).catch((error) => logEnqueueFailure('memory-consolidate', error))
    }
  }
}
