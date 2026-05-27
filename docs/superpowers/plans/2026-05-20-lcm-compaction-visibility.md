# LCM Compaction Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface the existing post-turn LCM compaction process as an ephemeral status card inside the active chat so users understand the turn-boundary latency they already feel.

**Architecture:** A singleton `LcmStatusBus` in the main process emits `start`/`complete`/`error` events from inside `LcmManager.runCompactionIfNeeded`. A new Hono SSE route `/api/chat/:id/lcm-status` subscribes per-chat and pushes events to the renderer. A `useLcmStatus(chatId)` hook drives an `<LcmStatusCard />` between the messages list and the composer. Nothing persists — refresh, chat switch, or app restart loses the card.

**Tech Stack:** TypeScript, Vitest, Hono (SSE), React 19, `EventSource`, existing `src/main/lib/ai/context-management/` module.

**Spec reference:** `docs/superpowers/specs/2026-05-20-lcm-compaction-visibility-design.md`

---

## File Manifest

**Create:**

- `src/main/lib/ai/context-management/lcm-status-bus.ts`
- `src/main/lib/ai/context-management/lcm-status-bus.test.ts`
- `src/main/lib/server/routes/lcm-status.ts`
- `src/renderer/hooks/use-lcm-status.ts`
- `src/renderer/components/chat/lcm-status-card.tsx`

**Modify:**

- `src/main/lib/ai/context-management/index.ts` — emit start/complete/error inside `runCompactionIfNeeded`, capture before/after counts and tokens.
- `src/main/lib/ai/context-management/index.test.ts` — new file in same directory for the integration test (no pre-existing file to modify).
- `src/main/lib/server/app.ts` — register the new route.
- `src/renderer/components/chat.tsx` — mount `<LcmStatusCard chatId={id} />` between `<Messages>` and `<MultimodalInput>`.

No DB schema changes.

---

### Task 1: Create `LcmStatusBus` (TDD)

**Files:**

- Create: `src/main/lib/ai/context-management/lcm-status-bus.ts`
- Test: `src/main/lib/ai/context-management/lcm-status-bus.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/main/lib/ai/context-management/lcm-status-bus.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'

import { LcmStatusBus } from './lcm-status-bus'

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test src/main/lib/ai/context-management/lcm-status-bus.test.ts`
Expected: All tests fail with module not found.

- [ ] **Step 3: Implement the bus**

Create `src/main/lib/ai/context-management/lcm-status-bus.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/main/lib/ai/context-management/lcm-status-bus.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/context-management/lcm-status-bus.ts src/main/lib/ai/context-management/lcm-status-bus.test.ts
git commit -m "feat(lcm): add LcmStatusBus for compaction visibility events"
```

---

### Task 2: Emit start/complete/error from `LcmManager.runCompactionIfNeeded`

**Files:**

- Modify: `src/main/lib/ai/context-management/index.ts`
- Test: `src/main/lib/ai/context-management/index.test.ts` (new)

The current `runCompactionIfNeeded` reads `getContextItems`, compares tokens against a threshold, then loops `runFullCompaction` up to 10 times. We wrap the active code path with bus emits and capture before/after stats.

- [ ] **Step 1: Write the failing test**

Create `src/main/lib/ai/context-management/index.test.ts`:

```ts
import type { Model } from '@mariozechner/pi-ai'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { LcmStatusEvent } from './lcm-status-bus'
import { lcmStatusBus } from './lcm-status-bus'

// Mock queries + compaction so we never hit the DB or LLM.
vi.mock('./queries', () => ({
  getContextItems: vi.fn(),
  appendContextItem: vi.fn()
}))
vi.mock('./compaction', () => ({
  runFullCompaction: vi.fn()
}))

import { LcmManager } from './index'
import { runFullCompaction } from './compaction'
import { getContextItems } from './queries'

const fakeModel = { id: 'gpt-4.1-mini' } as unknown as Model<string>

function makeItems(count: number, perItemTokens: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `it-${i}`,
    chatId: 'chat-test',
    ordinal: i,
    kind: 'message' as const,
    refId: `msg-${i}`,
    tokenCount: perItemTokens
  }))
}

describe('LcmManager.compactAfterTurn emits status events', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not emit when under threshold', async () => {
    // 10 items × 100 tokens = 1000 — well under threshold
    vi.mocked(getContextItems).mockResolvedValue(makeItems(10, 100))

    const events: LcmStatusEvent[] = []
    const off = lcmStatusBus.subscribe('chat-test', (e) => events.push(e))

    const lcm = new LcmManager('chat-test', fakeModel, 'k', {
      contextWindow: 10_000,
      contextWindowPercent: 75,
      freshTailSize: 16
    })
    await lcm.compactAfterTurn()
    off()

    expect(events).toEqual([])
    expect(runFullCompaction).not.toHaveBeenCalled()
  })

  it('emits start then complete when over threshold', async () => {
    // First call (before): 100 items × 100 = 10000 tokens, ABOVE 75% of 10_000.
    // Subsequent calls (loop guard + after): same items but shrink each round.
    vi.mocked(getContextItems)
      .mockResolvedValueOnce(makeItems(100, 100)) // initial threshold check
      .mockResolvedValueOnce(makeItems(100, 100)) // round 0 guard
      .mockResolvedValueOnce(makeItems(20, 100)) // round 1 guard — below target
      .mockResolvedValueOnce(makeItems(20, 100)) // final "after" snapshot
    vi.mocked(runFullCompaction).mockResolvedValue(undefined)

    const events: LcmStatusEvent[] = []
    const off = lcmStatusBus.subscribe('chat-test', (e) => events.push(e))

    const lcm = new LcmManager('chat-test', fakeModel, 'k', {
      contextWindow: 10_000,
      contextWindowPercent: 75,
      freshTailSize: 16
    })
    await lcm.compactAfterTurn()
    off()

    expect(events).toHaveLength(2)
    expect(events[0]).toMatchObject({ type: 'start', chatId: 'chat-test' })
    expect(events[1]).toMatchObject({
      type: 'complete',
      chatId: 'chat-test',
      messagesBefore: 100,
      messagesAfter: 20
    })
    if (events[1].type === 'complete') {
      expect(events[1].tokensSaved).toBe(10000 - 2000)
      expect(events[1].durationMs).toBeGreaterThanOrEqual(0)
    }
  })

  it('emits start then error when compaction throws', async () => {
    vi.mocked(getContextItems)
      .mockResolvedValueOnce(makeItems(100, 100)) // threshold check — over
      .mockResolvedValue(makeItems(100, 100))
    vi.mocked(runFullCompaction).mockRejectedValue(new Error('boom'))

    const events: LcmStatusEvent[] = []
    const off = lcmStatusBus.subscribe('chat-test', (e) => events.push(e))

    const lcm = new LcmManager('chat-test', fakeModel, 'k', {
      contextWindow: 10_000,
      contextWindowPercent: 75,
      freshTailSize: 16
    })
    // compactAfterTurn catches errors internally — we don't expect a throw.
    await lcm.compactAfterTurn()
    off()

    expect(events[0]).toMatchObject({ type: 'start' })
    expect(events.at(-1)).toMatchObject({
      type: 'error',
      chatId: 'chat-test',
      error: expect.stringContaining('boom')
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/main/lib/ai/context-management/index.test.ts`
Expected: 3 tests fail — the `runCompactionIfNeeded` method does not currently emit any events.

- [ ] **Step 3: Modify `runCompactionIfNeeded` to emit events**

Edit `src/main/lib/ai/context-management/index.ts`. Replace the existing `runCompactionIfNeeded` method body and add an import:

Add at top (next to existing imports):

```ts
import { lcmStatusBus } from './lcm-status-bus'
```

Replace the entire `runCompactionIfNeeded` private method with:

```ts
  private async runCompactionIfNeeded(): Promise<void> {
    const initialItems = await getContextItems(this.chatId)
    const initialTokens = initialItems.reduce(
      (sum, i) => sum + (i.tokenCount ?? 0),
      0
    )
    const threshold = this.contextWindow * (this.contextWindowPercent / 100)

    if (initialTokens <= threshold) return

    const messagesBefore = initialItems.filter(
      (i) => i.kind === 'message'
    ).length

    const startedAt = Date.now()
    lcmStatusBus.emit({ type: 'start', chatId: this.chatId, startedAt })

    try {
      // Budget-targeted compaction: up to 10 rounds (unchanged behavior)
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

      const finalItems = await getContextItems(this.chatId)
      const finalTokens = finalItems.reduce(
        (sum, i) => sum + (i.tokenCount ?? 0),
        0
      )
      const messagesAfter = finalItems.filter(
        (i) => i.kind === 'message'
      ).length

      lcmStatusBus.emit({
        type: 'complete',
        chatId: this.chatId,
        durationMs: Date.now() - startedAt,
        messagesBefore,
        messagesAfter,
        tokensSaved: Math.max(0, initialTokens - finalTokens)
      })
    } catch (err) {
      lcmStatusBus.emit({
        type: 'error',
        chatId: this.chatId,
        error: String(err instanceof Error ? err.message : err)
      })
      throw err
    }
  }
```

Two notes for the engineer:

- The outer `compactAfterTurn` already catches errors (`.catch(logger.error)`). The rethrow above keeps that logging intact while still emitting the `error` event first.
- We deliberately measure `initialTokens` and `messagesBefore` from the same snapshot we used to decide whether to compact, so the user-visible "before" reflects the state at the moment compaction began.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test src/main/lib/ai/context-management/`
Expected: All tests (including the new file and existing `token-counter.test.ts`) pass.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/ai/context-management/index.ts src/main/lib/ai/context-management/index.test.ts
git commit -m "feat(lcm): emit start/complete/error events from runCompactionIfNeeded"
```

---

### Task 3: SSE route `/api/chat/:id/lcm-status`

**Files:**

- Create: `src/main/lib/server/routes/lcm-status.ts`
- Modify: `src/main/lib/server/app.ts` — register the route under `/api/chat`.

The route lives outside the main `chat.ts` router so it doesn't tangle with the chat POST stream. We mount it on a distinct prefix (`/api/lcm`) to keep router boundaries clean, while the renderer still calls `/api/lcm/:chatId/status`.

- [ ] **Step 1: Create the route**

Create `src/main/lib/server/routes/lcm-status.ts`:

```ts
import type { Variables } from '@shared/types/server'
import { Hono } from 'hono'

import { lcmStatusBus } from '../../ai/context-management/lcm-status-bus'
import { logger } from '../../logger'
import { SSE_HEADERS } from '../utils/sse-manager'

const lcmStatus = new Hono<{ Variables: Variables }>()

lcmStatus.get('/:chatId/status', (c) => {
  const chatId = c.req.param('chatId')
  if (!chatId) return c.text('chatId required', 400)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
          )
        } catch (err) {
          logger.warn('lcm', 'Failed to enqueue SSE frame', {
            chatId,
            error: String(err)
          })
        }
      }

      // Sync initial state for late subscribers / reconnects.
      send({ type: 'init', state: lcmStatusBus.getCurrentState(chatId) })

      const unsubscribe = lcmStatusBus.subscribe(chatId, send)

      const signal = c.req.raw.signal
      const onAbort = () => {
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed
        }
      }
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener('abort', onAbort, { once: true })
    }
  })

  return new Response(stream, { headers: SSE_HEADERS })
})

export default lcmStatus
```

- [ ] **Step 2: Register the route in `app.ts`**

Edit `src/main/lib/server/app.ts`. Add an import next to the other route imports:

```ts
import lcmStatusRouter from './routes/lcm-status'
```

Add the mount line in the `// Routes` block (place it next to `chatRouter` for proximity):

```ts
app.route('/api/lcm', lcmStatusRouter)
```

- [ ] **Step 3: Run the type check**

Run: `pnpm typecheck`
Expected: passes.

- [ ] **Step 4: Manual smoke test**

In one terminal: `pnpm dev`.
In another: `curl -N http://localhost:3000/api/lcm/00000000-0000-0000-0000-000000000000/status`
Expected: immediately receive `data: {"type":"init","state":"idle"}` and the connection stays open. Ctrl-C closes it. Server logs should not show errors.

- [ ] **Step 5: Commit**

```bash
git add src/main/lib/server/routes/lcm-status.ts src/main/lib/server/app.ts
git commit -m "feat(lcm): add /api/lcm/:chatId/status SSE endpoint"
```

---

### Task 4: Frontend hook `useLcmStatus`

**Files:**

- Create: `src/renderer/hooks/use-lcm-status.ts`

The hook owns one `EventSource` per `chatId`. State transitions:

- `init {state:'idle'}` or no events yet → `idle`
- `init {state:'running'}` or `start` → `running`
- `complete` → `just_completed`, then `idle` after 6s
- `error` → `error`, then `idle` after 6s
- `chatId` change / unmount → close source, clear timers

- [ ] **Step 1: Create the hook**

Create `src/renderer/hooks/use-lcm-status.ts`:

```ts
import { BASE_URL } from '@shared/constants/systems'
import { useEffect, useState } from 'react'

type CompletePayload = {
  durationMs: number
  messagesBefore: number
  messagesAfter: number
  tokensSaved: number
}

export type LcmStatusState =
  | { kind: 'idle' }
  | { kind: 'running'; startedAt: number }
  | { kind: 'just_completed'; payload: CompletePayload }
  | { kind: 'error'; message: string }

type ServerEvent =
  | { type: 'init'; state: 'idle' | 'running' }
  | { type: 'start'; chatId: string; startedAt: number }
  | ({ type: 'complete'; chatId: string } & CompletePayload)
  | { type: 'error'; chatId: string; error: string }

const AUTO_DISMISS_MS = 6000

export function useLcmStatus(chatId: string): LcmStatusState {
  const [state, setState] = useState<LcmStatusState>({ kind: 'idle' })

  useEffect(() => {
    if (!chatId) return

    const source = new EventSource(`${BASE_URL}/api/lcm/${chatId}/status`)
    let dismissTimer: ReturnType<typeof setTimeout> | null = null

    const scheduleDismiss = () => {
      if (dismissTimer) clearTimeout(dismissTimer)
      dismissTimer = setTimeout(() => {
        setState({ kind: 'idle' })
        dismissTimer = null
      }, AUTO_DISMISS_MS)
    }

    source.onmessage = (e) => {
      let event: ServerEvent
      try {
        event = JSON.parse(e.data) as ServerEvent
      } catch {
        return
      }

      switch (event.type) {
        case 'init':
          setState(
            event.state === 'running'
              ? { kind: 'running', startedAt: Date.now() }
              : { kind: 'idle' }
          )
          break
        case 'start':
          if (dismissTimer) {
            clearTimeout(dismissTimer)
            dismissTimer = null
          }
          setState({ kind: 'running', startedAt: event.startedAt })
          break
        case 'complete':
          setState({
            kind: 'just_completed',
            payload: {
              durationMs: event.durationMs,
              messagesBefore: event.messagesBefore,
              messagesAfter: event.messagesAfter,
              tokensSaved: event.tokensSaved
            }
          })
          scheduleDismiss()
          break
        case 'error':
          setState({ kind: 'error', message: event.error })
          scheduleDismiss()
          break
      }
    }

    source.onerror = () => {
      // EventSource auto-reconnects. We don't surface the gap; the next
      // `init` after reconnect re-syncs state.
    }

    return () => {
      if (dismissTimer) clearTimeout(dismissTimer)
      source.close()
    }
  }, [chatId])

  return state
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck:web`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/use-lcm-status.ts
git commit -m "feat(lcm): add useLcmStatus hook for SSE subscription"
```

---

### Task 5: `<LcmStatusCard />` component

**Files:**

- Create: `src/renderer/components/chat/lcm-status-card.tsx`

- [ ] **Step 1: Create the component**

Create `src/renderer/components/chat/lcm-status-card.tsx`:

```tsx
import { CheckIcon, TriangleAlertIcon } from 'lucide-react'

import { Spinner } from '@/components/ui/spinner'
import { useLcmStatus } from '@/hooks/use-lcm-status'
import { cn } from '@/lib/utils'

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function LcmStatusCard({ chatId }: { chatId: string }) {
  const state = useLcmStatus(chatId)

  if (state.kind === 'idle') return null

  const baseClass =
    'mx-4 my-2 flex items-center gap-2 rounded-md px-3 py-2 text-xs'

  if (state.kind === 'running') {
    return (
      <div className={cn(baseClass, 'bg-muted/60 text-muted-foreground')}>
        <Spinner className="size-3.5" />
        <span>Compacting conversation history…</span>
      </div>
    )
  }

  if (state.kind === 'just_completed') {
    const { messagesBefore, messagesAfter, tokensSaved } = state.payload
    const compacted = Math.max(0, messagesBefore - messagesAfter)
    return (
      <div className={cn(baseClass, 'bg-muted/60 text-muted-foreground')}>
        <CheckIcon className="size-3.5" />
        <span>
          Compacted {compacted} message{compacted === 1 ? '' : 's'} · saved ~
          {formatTokens(tokensSaved)} tokens
        </span>
      </div>
    )
  }

  // error
  return (
    <div
      className={cn(
        baseClass,
        'border-destructive/40 text-destructive border bg-transparent'
      )}
    >
      <TriangleAlertIcon className="size-3.5" />
      <span>Compaction failed (will retry next turn)</span>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck:web`
Expected: passes.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/components/chat/lcm-status-card.tsx
git commit -m "feat(lcm): add LcmStatusCard component"
```

---

### Task 6: Mount the card in `Chat`

**Files:**

- Modify: `src/renderer/components/chat.tsx`

- [ ] **Step 1: Add the import**

Edit `src/renderer/components/chat.tsx`. Add next to the other component imports (after the `Messages`/`MultimodalInput` imports):

```ts
import { LcmStatusCard } from './chat/lcm-status-card'
```

- [ ] **Step 2: Render the card between `Messages` and `MultimodalInput`**

Replace the return block of the `Chat` component with:

```tsx
return (
  <>
    {projectId && <ProjectBreadcrumb projectId={projectId} />}
    <Messages
      chatId={id}
      status={status}
      messages={messages}
      regenerate={regenerate}
    />
    <LcmStatusCard chatId={id} />
    <MultimodalInput
      chatId={id}
      attachments={attachments}
      setAttachments={setAttachments}
      messages={messages}
      setMessages={setMessages}
      sendMessage={sendMessage}
      lastUsage={lastUsage}
    />
  </>
)
```

- [ ] **Step 3: Type-check + lint**

Run: `pnpm typecheck:web && pnpm lint`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/renderer/components/chat.tsx
git commit -m "feat(lcm): mount LcmStatusCard between messages and composer"
```

---

### Task 7: End-to-end manual verification

This is the only step that can catch the integration actually working in the running app. Do not skip.

**Setup**

- [ ] **Step 1: Start dev**

Run: `pnpm dev`

- [ ] **Step 2: Force a quick threshold**

Open the app, go to Settings → Memory Layer. Temporarily set `contextWindowPercent` low (e.g. 5) so the next chat trips compaction quickly. Keep LCM **enabled**.

- [ ] **Step 3: Drive over the threshold**

Open or create a chat. Send 2–3 sizable user messages (paste a few paragraphs each), wait for assistant replies between them. After one of the assistant replies finishes streaming:

- The `Compacting conversation history…` card appears above the composer.
- Within a few seconds it becomes `Compacted N messages · saved ~Xk tokens`.
- About 6 seconds later it disappears on its own.

- [ ] **Step 4: Refresh persistence check**

Refresh the renderer (Cmd-R in the dev window). The card should NOT reappear — its state was in-memory only.

- [ ] **Step 5: Disabled-LCM check**

Settings → Memory Layer → turn LCM off. Drive over the threshold again. The card must NOT appear at all.

- [ ] **Step 6: Error path (optional)**

Temporarily break compaction (e.g. set an invalid provider key so `runFullCompaction` throws) and confirm the red error pill appears and auto-dismisses. Restore the key afterward.

- [ ] **Step 7: Restore settings**

Restore `contextWindowPercent` to its original value (75) and re-enable LCM if you turned it off.

- [ ] **Step 8: Final unit pass**

Run: `pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 9: No commit needed** — this task is verification only.

---

## Out of Scope (deferred)

- Persisting compaction history in the DB.
- Showing compaction progress in the sidebar chat list.
- Per-round progress (leaf pass, condensed pass).
- A "view summary" affordance on the card.
- Settings UI to tweak `contextWindowPercent` for the express purpose of compaction visibility (already exists as a general LCM control).
