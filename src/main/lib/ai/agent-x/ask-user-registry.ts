// src/main/lib/ai/agent-x/ask-user-registry.ts
type Resolver = (answer: string) => void

class AskUserRegistry {
  private pending = new Map<string, Resolver>()

  /** Returns a promise that resolves when the user answers for this conversation. */
  wait(conversationId: string): Promise<string> {
    return new Promise<string>((resolve) => {
      this.pending.set(conversationId, resolve)
    })
  }

  has(conversationId: string): boolean {
    return this.pending.has(conversationId)
  }

  resolve(conversationId: string, answer: string): void {
    const resolver = this.pending.get(conversationId)
    if (!resolver) return
    this.pending.delete(conversationId)
    resolver(answer)
  }
}

export const askUserRegistry = new AskUserRegistry()
