import type { Message, Model } from '@mariozechner/pi-ai'

import { assembleContext } from './assembler'
import { runFullCompaction } from './compaction'
import { appendContextItem, getContextItems } from './queries'
import { estimateMessageTokens } from './token-counter'

export type { AssembledContext } from './assembler'

// Default context window sizes by provider pattern (tokens)
// Used when the setting doesn't specify an explicit limit
const DEFAULT_CONTEXT_WINDOW = 128_000

/**
 * LcmManager: per-instance manager for a single chat session.
 *
 * Usage:
 *   const lcm = new LcmManager(chatId, model, apiKey, { ... })
 *   const ctx = await lcm.assembleContext(tokenBudget)
 *   // after chat completes:
 *   await lcm.trackNewMessages(newMessages)
 *   await lcm.compactAfterTurn()  // non-blocking: call without await
 */
export class LcmManager {
  private chatId: string
  private model: Model<string>
  private apiKey: string
  private freshTailSize: number
  private contextWindowPercent: number
  private contextWindow: number

  // Per-chat serialization queue to prevent concurrent compaction
  private static compactionQueues = new Map<string, Promise<void>>()

  constructor(
    chatId: string,
    model: Model<string>,
    apiKey: string,
    options: {
      freshTailSize?: number
      contextWindowPercent?: number
      contextWindow?: number
    } = {}
  ) {
    this.chatId = chatId
    this.model = model
    this.apiKey = apiKey
    this.freshTailSize = options.freshTailSize ?? 16
    this.contextWindowPercent = options.contextWindowPercent ?? 75
    this.contextWindow = options.contextWindow ?? DEFAULT_CONTEXT_WINDOW
  }

  get tokenBudget(): number {
    return Math.floor((this.contextWindow * this.contextWindowPercent) / 100)
  }

  /**
   * Assembles the LLM message array for this chat session.
   * Bootstraps context tracking on first call.
   */
  async assembleContext(): Promise<{
    messages: Message[]
    totalTokens: number
    trackedMessageIds: Set<string>
  }> {
    return assembleContext(this.chatId, this.tokenBudget, this.freshTailSize)
  }

  /**
   * Appends newly produced messages to the context item tracking table.
   * Call this after receiving new messages from the agent loop.
   */
  async trackNewMessages(
    messages: Array<{ id: string; content: unknown }>
  ): Promise<void> {
    for (const msg of messages) {
      const tokens = estimateMessageTokens(msg.content)
      await appendContextItem(this.chatId, 'message', msg.id, tokens)
    }
  }

  /**
   * Runs compaction after a turn if context exceeds the threshold.
   * Uses a per-chatId promise queue to prevent concurrent runs.
   *
   * Call this WITHOUT await to run in the background:
   *   lcm.compactAfterTurn().catch(console.error)
   */
  async compactAfterTurn(): Promise<void> {
    const chatId = this.chatId
    const existing =
      LcmManager.compactionQueues.get(chatId) ?? Promise.resolve()

    const next = existing.then(async () => {
      try {
        await this.runCompactionIfNeeded()
      } catch (err) {
        console.error(`[LCM] Compaction failed for chat ${chatId}:`, err)
      }
    })

    LcmManager.compactionQueues.set(chatId, next)
    // Clean up queue reference after completion
    next.finally(() => {
      if (LcmManager.compactionQueues.get(chatId) === next) {
        LcmManager.compactionQueues.delete(chatId)
      }
    })

    return next
  }

  private async runCompactionIfNeeded(): Promise<void> {
    const items = await getContextItems(this.chatId)
    const currentTokens = items.reduce((sum, i) => sum + (i.tokenCount ?? 0), 0)
    const threshold = this.contextWindow * (this.contextWindowPercent / 100)

    if (currentTokens <= threshold) return

    // Budget-targeted compaction: up to 10 rounds
    const targetTokens = Math.floor(this.contextWindow * 0.6)
    for (let round = 0; round < 10; round++) {
      const updated = await getContextItems(this.chatId)
      const total = updated.reduce((sum, i) => sum + (i.tokenCount ?? 0), 0)
      if (total <= targetTokens) break

      await runFullCompaction(
        this.chatId,
        this.model,
        this.apiKey,
        this.freshTailSize
      )
    }
  }
}
