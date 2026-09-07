// Computer Runtime — the askHuman registry.
//
// Identical shape to `src/main/lib/ai/philharmonic/ask-user-registry.ts`
// (`wait` / `has` / `resolve`), keyed by the computer-use session id instead
// of a conversation id. The session loop awaits `wait(sessionId)` when the
// inner agent emits an `askHuman` action; `POST /api/computer-use/answer`
// calls `resolve(sessionId, answer)` to unblock it. Spec §3.5 / §4.1.

type Resolver = (answer: string) => void

class ComputerAskRegistry {
  private pending = new Map<string, Resolver>()

  /** Returns a promise that resolves when a human answers for this session. */
  wait(sessionId: string): Promise<string> {
    return new Promise<string>((resolve) => {
      this.pending.set(sessionId, resolve)
    })
  }

  has(sessionId: string): boolean {
    return this.pending.has(sessionId)
  }

  resolve(sessionId: string, answer: string): void {
    const resolver = this.pending.get(sessionId)
    if (!resolver) return
    this.pending.delete(sessionId)
    resolver(answer)
  }
}

export const computerAskRegistry = new ComputerAskRegistry()
