# Background Chat Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow chat streams to continue running in the background when users navigate away, and show a toast with a "View" button when the stream completes.

**Architecture:** Extract the fetch/SSE logic from the `useChat` hook into a singleton `StreamManager` module that lives outside of React's lifecycle. The `useChat` hook subscribes to the manager on mount and unsubscribes on unmount—streams keep running either way. When a stream finishes while no subscriber is listening, the manager fires a sileo toast.

**Tech Stack:** React 19, Jotai, sileo (toast), React Router v7

---

## File Structure

| File                                      | Action     | Responsibility                                                              |
| ----------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| `src/renderer/lib/stream-manager.ts`      | **Create** | Singleton that owns fetch lifecycle, SSE parsing, subscriber notifications  |
| `src/renderer/hooks/use-chat.ts`          | **Modify** | Delegate streaming to StreamManager, subscribe/unsubscribe on mount/unmount |
| `src/renderer/components/chat.tsx`        | **Modify** | Pass chat title for toast; minor wiring                                     |
| `src/renderer/containers/chat-detail.tsx` | **Modify** | Pass chat title to `<Chat>`                                                 |

---

### Task 1: Create StreamManager singleton

**Files:**

- Create: `src/renderer/lib/stream-manager.ts`

This is a plain TypeScript module (not React). It manages active streams keyed by chat ID.

- [ ] **Step 1: Create `src/renderer/lib/stream-manager.ts`**

```typescript
import type { ChatMessage, ChatSseEvent, ChatStatus } from '@shared/types/chat'

// ── Types ────────────────────────────────────────────────────────────────────

export interface StreamSubscriber {
  onMessages: (messages: ChatMessage[]) => void
  onStatus: (status: ChatStatus) => void
  onTitle: (title: string) => void
  onError: (error: Error) => void
  onFinish: (messages: ChatMessage[]) => void
}

interface ActiveStream {
  chatId: string
  chatTitle: string
  abortController: AbortController
  status: ChatStatus
  messages: ChatMessage[]
  subscriber: StreamSubscriber | null
}

// ── Singleton state ──────────────────────────────────────────────────────────

const streams = new Map<string, ActiveStream>()

// ── Toast (lazy import avoids module-level side effects) ─────────────────────

function notifyCompletion(chatId: string, title: string) {
  import('sileo').then(({ sileo }) => {
    sileo.success({
      title: 'Response ready',
      description: title || 'Chat',
      button: {
        title: 'View',
        onClick: () => {
          window.location.hash = `#/chat/${chatId}`
        }
      }
    })
  })
}

function notifyError(chatId: string, title: string, error: Error) {
  import('sileo').then(({ sileo }) => {
    sileo.error({
      title: 'Chat failed',
      description: error.message || title || 'An error occurred',
      button: {
        title: 'View',
        onClick: () => {
          window.location.hash = `#/chat/${chatId}`
        }
      }
    })
  })
}

// ── SSE parsing ──────────────────────────────────────────────────────────────

async function consumeStream(stream: ActiveStream, response: Response) {
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const jsonStr = line.slice(6).trim()
      if (!jsonStr) continue

      try {
        const event = JSON.parse(jsonStr) as ChatSseEvent

        if (event.type === 'message_update') {
          const updatedMsg = event.message
          const idx = stream.messages.findIndex((m) => m.id === updatedMsg.id)
          if (idx >= 0) {
            stream.messages = [
              ...stream.messages.slice(0, idx),
              updatedMsg,
              ...stream.messages.slice(idx + 1)
            ]
          } else {
            stream.messages = [...stream.messages, updatedMsg]
          }
          stream.subscriber?.onMessages([...stream.messages])
        } else if (event.type === 'done') {
          stream.messages = event.messages
          stream.subscriber?.onMessages([...stream.messages])
        } else if (event.type === 'title') {
          stream.chatTitle = event.title
          stream.subscriber?.onTitle(event.title)
        } else if (event.type === 'error') {
          throw new Error(event.error)
        }
      } catch {
        // Skip malformed SSE frames
      }
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export function startStream(opts: {
  chatId: string
  chatTitle: string
  api: string
  body: Record<string, unknown>
  subscriber: StreamSubscriber
  initialMessages: ChatMessage[]
}): void {
  // Abort any existing stream for this chat
  stopStream(opts.chatId)

  const abortController = new AbortController()
  const stream: ActiveStream = {
    chatId: opts.chatId,
    chatTitle: opts.chatTitle,
    abortController,
    status: 'submitted',
    messages: opts.initialMessages,
    subscriber: opts.subscriber
  }
  streams.set(opts.chatId, stream)
  opts.subscriber.onStatus('submitted')

  // Fire-and-forget — lifecycle managed via subscriber + toast
  ;(async () => {
    try {
      const response = await fetch(opts.api, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.body),
        signal: abortController.signal
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const ct = response.headers.get('content-type') || ''
          if (ct.includes('application/json')) {
            const errorData = await response.json()
            if (errorData?.error?.message)
              errorMessage = errorData.error.message
            else if (errorData?.message) errorMessage = errorData.message
          }
        } catch {
          /* ignore parse errors */
        }
        throw new Error(errorMessage)
      }

      if (!response.body) throw new Error('No response body')

      stream.status = 'streaming'
      stream.subscriber?.onStatus('streaming')

      await consumeStream(stream, response)

      // ── Success ──
      stream.status = 'idle'
      if (stream.subscriber) {
        stream.subscriber.onStatus('idle')
        stream.subscriber.onFinish(stream.messages)
      } else {
        // User navigated away — show toast
        notifyCompletion(stream.chatId, stream.chatTitle)
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        stream.status = 'idle'
        stream.subscriber?.onStatus('idle')
      } else {
        stream.status = 'error'
        const error = err instanceof Error ? err : new Error(String(err))
        if (stream.subscriber) {
          stream.subscriber.onStatus('error')
          stream.subscriber.onError(error)
        } else {
          notifyError(stream.chatId, stream.chatTitle, error)
        }
      }
    } finally {
      streams.delete(stream.chatId)
    }
  })()
}

export function stopStream(chatId: string): void {
  const stream = streams.get(chatId)
  if (stream) {
    stream.abortController.abort()
    streams.delete(chatId)
  }
}

export function subscribe(chatId: string, subscriber: StreamSubscriber): void {
  const stream = streams.get(chatId)
  if (stream) {
    stream.subscriber = subscriber
    // Immediately replay current state
    subscriber.onMessages([...stream.messages])
    subscriber.onStatus(stream.status)
  }
}

export function unsubscribe(chatId: string): void {
  const stream = streams.get(chatId)
  if (stream) {
    stream.subscriber = null
  }
}

export function getStreamStatus(chatId: string): ChatStatus | null {
  return streams.get(chatId)?.status ?? null
}

export function isStreaming(chatId: string): boolean {
  const s = streams.get(chatId)
  return s != null && (s.status === 'submitted' || s.status === 'streaming')
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `pnpm typecheck:web`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/renderer/lib/stream-manager.ts
git commit -m "feat: add StreamManager singleton for background chat streaming"
```

---

### Task 2: Refactor `useChat` to use StreamManager

**Files:**

- Modify: `src/renderer/hooks/use-chat.ts`

The hook no longer owns the fetch. It delegates to `StreamManager.startStream()`, subscribes on mount, and unsubscribes on unmount. If a stream is already running for this chat ID (user navigated back), it re-subscribes and picks up where it left off.

- [ ] **Step 1: Rewrite `src/renderer/hooks/use-chat.ts`**

```typescript
import type {
  ChatAssistantMessage,
  ChatMessage,
  ChatStatus,
  SendMessageOptions,
  Usage
} from '@shared/types/chat'
import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidV4 } from 'uuid'

import {
  isStreaming as isStreamActive,
  startStream,
  stopStream,
  subscribe,
  unsubscribe
} from '@/lib/stream-manager'

export type { ChatStatus }
export type { SendMessageOptions }

export interface UseChatOptions {
  id: string
  chatTitle: string
  api: string
  messages?: ChatMessage[]
  generateId?: () => string
  onFinish?: (messages: ChatMessage[]) => void
  onError?: (error: Error) => void
  onTitle?: (title: string) => void
  prepareBody?: (opts: {
    id: string
    messages: ChatMessage[]
    body?: Record<string, unknown>
  }) => Record<string, unknown>
}

export interface UseChatHelpers {
  messages: ChatMessage[]
  setMessages: (
    messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => void
  status: ChatStatus
  lastUsage: Usage | null
  sendMessage: (opts: SendMessageOptions) => Promise<void>
  stop: () => void
  regenerate: () => void
}

export function useChat(options: UseChatOptions): UseChatHelpers {
  const {
    id,
    chatTitle,
    api,
    messages: initialMessages = [],
    generateId = uuidV4,
    onFinish,
    onError,
    onTitle,
    prepareBody
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [status, setStatus] = useState<ChatStatus>(() =>
    isStreamActive(id) ? 'streaming' : 'idle'
  )
  const [lastUsage, setLastUsage] = useState<Usage | null>(() => {
    const lastAssistant = [...initialMessages]
      .reverse()
      .find((m): m is ChatAssistantMessage => m.role === 'assistant')
    return lastAssistant?.usage ?? null
  })

  const lastUserMsgRef = useRef<SendMessageOptions | null>(null)
  const extraBodyRef = useRef<Record<string, unknown>>({})

  // Keep callbacks in refs so the subscriber closure always sees the latest
  const onFinishRef = useRef(onFinish)
  onFinishRef.current = onFinish
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError
  const onTitleRef = useRef(onTitle)
  onTitleRef.current = onTitle

  // Subscribe to an existing background stream on mount
  useEffect(() => {
    if (isStreamActive(id)) {
      subscribe(id, {
        onMessages: (msgs) => {
          setMessages(msgs)
          const last = [...msgs]
            .reverse()
            .find((m): m is ChatAssistantMessage => m.role === 'assistant')
          if (last?.usage) setLastUsage(last.usage)
        },
        onStatus: setStatus,
        onTitle: (t) => onTitleRef.current?.(t),
        onError: (e) => onErrorRef.current?.(e),
        onFinish: (msgs) => onFinishRef.current?.(msgs)
      })
    }

    return () => {
      unsubscribe(id)
    }
  }, [id])

  const stop = useCallback(() => {
    stopStream(id)
    setStatus('idle')
  }, [id])

  const sendMessage = useCallback(
    async (opts: SendMessageOptions) => {
      const { text = '', attachments = [] } = opts
      lastUserMsgRef.current = opts

      const content: Array<
        | { type: 'text'; text: string }
        | { type: 'image'; data: string; mimeType: string }
      > = []

      if (text.trim()) {
        content.push({ type: 'text', text: text.trim() })
      }
      for (const att of attachments) {
        content.push({
          type: 'image',
          data: att.url,
          mimeType: att.contentType
        })
      }

      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content:
          content.length === 1 && content[0].type === 'text'
            ? content[0].text
            : content,
        timestamp: Date.now()
      }

      const newMessages = [...messages, userMsg]
      setMessages(newMessages)

      const body = prepareBody
        ? prepareBody({
            id,
            messages: newMessages,
            body: extraBodyRef.current
          })
        : { id, messages: newMessages, ...extraBodyRef.current }

      startStream({
        chatId: id,
        chatTitle,
        api,
        body,
        initialMessages: newMessages,
        subscriber: {
          onMessages: (msgs) => {
            setMessages(msgs)
            const last = [...msgs]
              .reverse()
              .find((m): m is ChatAssistantMessage => m.role === 'assistant')
            if (last?.usage) setLastUsage(last.usage)
          },
          onStatus: setStatus,
          onTitle: (t) => onTitleRef.current?.(t),
          onError: (e) => onErrorRef.current?.(e),
          onFinish: (msgs) => onFinishRef.current?.(msgs)
        }
      })
    },
    [messages, id, chatTitle, api, generateId, prepareBody]
  )

  const regenerate = useCallback(() => {
    if (lastUserMsgRef.current) {
      setMessages((prev) => {
        const lastAssistantIdx = [...prev]
          .reverse()
          .findIndex((m) => m.role === 'assistant')
        if (lastAssistantIdx < 0) return prev
        const idx = prev.length - 1 - lastAssistantIdx
        return prev.slice(0, idx)
      })
      sendMessage(lastUserMsgRef.current)
    }
  }, [sendMessage])

  return {
    messages,
    setMessages,
    status,
    lastUsage,
    sendMessage,
    stop,
    regenerate
  }
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `pnpm typecheck:web`
Expected: PASS (may show errors from chat.tsx — fixed in next task)

- [ ] **Step 3: Commit**

```bash
git add src/renderer/hooks/use-chat.ts
git commit -m "refactor: useChat delegates streaming to StreamManager"
```

---

### Task 3: Update Chat component and ChatDetail to pass `chatTitle`

**Files:**

- Modify: `src/renderer/components/chat.tsx`
- Modify: `src/renderer/containers/chat-detail.tsx`

The `useChat` hook now requires `chatTitle` so the toast can display it. We thread it from `ChatDetail` → `Chat` → `useChat`.

- [ ] **Step 1: Update `chat-detail.tsx` to pass `chatTitle`**

In `src/renderer/containers/chat-detail.tsx`, add `chatTitle` to the `<Chat>` props:

```typescript
  return (
    <Chat
      key={id}
      id={id}
      initialMessages={initialMessages}
      projectId={chatRecord?.projectId ?? undefined}
      chatTitle={chatRecord?.title ?? 'New chat'}
    />
  )
```

- [ ] **Step 2: Update `chat.tsx` to accept and forward `chatTitle`**

In `src/renderer/components/chat.tsx`:

1. Add `chatTitle` to the Props interface:

```typescript
interface Props {
  id: string
  initialMessages: ChatMessage[]
  projectId?: string
  chatTitle: string
}
```

2. Update the component signature and `useChat` call:

```typescript
export function Chat({ id, initialMessages, projectId, chatTitle }: Props) {
```

3. Add `chatTitle` to the `useChat` options and wire up `onTitle` to update sidebar:

```typescript
const [title, setTitle] = useState(chatTitle)

const {
  messages,
  setMessages,
  sendMessage,
  status,
  stop,
  regenerate,
  lastUsage
} = useChat({
  id,
  chatTitle: title,
  api: `${BASE_URL}/api/chat`,
  messages: initialMessages,
  generateId: uuidV4,
  prepareBody: ({ id, messages, body }) => ({
    ...body,
    id,
    messages,
    advancedTools: advancedToolsRef.current,
    projectId: projectIdRef.current
  }),
  onFinish: () => {
    mutate('/api/history')
    if (!routeId) {
      navigate(`/chat/${id}`, { replace: true })
    }
  },
  onError: (e) => {
    sileo.error({
      title: 'Something went wrong',
      description:
        e instanceof Error ? e.message : 'An error occurred, please try again!'
    })
  },
  onTitle: (newTitle) => {
    setTitle(newTitle)
    mutate('/api/history')
  }
})
```

- [ ] **Step 3: Verify everything compiles**

Run: `pnpm typecheck:web`
Expected: PASS

- [ ] **Step 4: Run lint**

Run: `pnpm lint`
Expected: 0 warnings, 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/renderer/components/chat.tsx src/renderer/containers/chat-detail.tsx
git commit -m "feat: wire chatTitle through to StreamManager for background toast"
```

---

### Task 4: Smoke test and edge case review

- [ ] **Step 1: Manual smoke test**

1. Start the app: `pnpm dev`
2. Send a message in a chat — verify streaming works normally
3. While streaming, click a different chat in the sidebar — verify:
   - Navigation works immediately (no blocking)
   - After a few seconds, a toast appears: "Response ready" with a "View" button
4. Click the "View" button on the toast — verify it navigates back to the original chat with the full response
5. Navigate to Settings while streaming — same toast behavior
6. Click Stop while streaming — verify stream aborts, no toast

- [ ] **Step 2: Verify re-subscribe on navigate back**

1. Send a message, immediately switch to another chat
2. Before the toast appears, switch **back** to the original chat
3. Verify the streaming resumes live in the UI (messages updating in real time)
4. Verify no toast fires (since subscriber is re-attached)

- [ ] **Step 3: Final commit with any adjustments**

```bash
git add -A
git commit -m "feat: background chat streaming with completion toast"
```
