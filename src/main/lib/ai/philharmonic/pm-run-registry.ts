// src/main/lib/ai/philharmonic/pm-run-registry.ts
//
// Per-conversation registry of AbortControllers for in-flight PM runs.
// The send-message route registers a controller before calling
// runPmCoordinator and clears it in a finally block. The interrupt route
// looks the controller up and calls abort(). One controller per
// conversation — if a second turn somehow starts before the first ends,
// the newer controller replaces the older one (the older PM is already
// committed and will run to completion or its own error).

const controllers = new Map<string, AbortController>()

export const pmRunRegistry = {
  set(conversationId: string, controller: AbortController): void {
    controllers.set(conversationId, controller)
  },

  /** Remove the controller for this conversation, if any. Safe to call twice. */
  clear(conversationId: string): void {
    controllers.delete(conversationId)
  },

  has(conversationId: string): boolean {
    return controllers.has(conversationId)
  },

  /** Returns true if a controller was found and aborted, false otherwise. */
  abort(conversationId: string): boolean {
    const c = controllers.get(conversationId)
    if (!c) return false
    c.abort()
    return true
  }
}
