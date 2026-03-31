import type { ChatMessage, ChatSseEvent, ChatStatus } from '@shared/types/chat'
import { sileo } from 'sileo'

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

// ── Toast notifications ──────────────────────────────────────────────────────

function notifyCompletion(chatId: string, title: string) {
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
}

function notifyError(chatId: string, title: string, error: Error) {
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

export function isStreaming(chatId: string): boolean {
  const s = streams.get(chatId)
  return s != null && (s.status === 'submitted' || s.status === 'streaming')
}
