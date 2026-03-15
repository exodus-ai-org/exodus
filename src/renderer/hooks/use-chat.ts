import type {
  Attachment,
  ChatAssistantMessage,
  ChatMessage,
  ChatSseEvent,
  Usage
} from '@shared/types/chat'
import { useCallback, useRef, useState } from 'react'
import { v4 as uuidV4 } from 'uuid'

export type ChatStatus = 'idle' | 'submitted' | 'streaming' | 'error'

export interface SendMessageOptions {
  text?: string
  attachments?: Attachment[]
}

export interface UseChatOptions {
  id: string
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
    api,
    messages: initialMessages = [],
    generateId = uuidV4,
    onFinish,
    onError,
    onTitle,
    prepareBody
  } = options

  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [status, setStatus] = useState<ChatStatus>('idle')
  const [lastUsage, setLastUsage] = useState<Usage | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  // Store the last user message for regeneration
  const lastUserMsgRef = useRef<SendMessageOptions | null>(null)
  const extraBodyRef = useRef<Record<string, unknown>>({})

  const stop = useCallback(() => {
    abortControllerRef.current?.abort()
    setStatus('idle')
  }, [])

  const sendMessage = useCallback(
    async (opts: SendMessageOptions) => {
      const { text = '', attachments = [] } = opts
      lastUserMsgRef.current = opts

      // Build pi-ai user message content
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
      setStatus('submitted')

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        const body = prepareBody
          ? prepareBody({
              id,
              messages: newMessages,
              body: extraBodyRef.current
            })
          : { id, messages: newMessages, ...extraBodyRef.current }

        const response = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abortController.signal
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        setStatus('streaming')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        let streamMessages = [...newMessages]

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
                const existingIdx = streamMessages.findIndex(
                  (m) => m.id === updatedMsg.id
                )
                if (existingIdx >= 0) {
                  streamMessages = [
                    ...streamMessages.slice(0, existingIdx),
                    updatedMsg,
                    ...streamMessages.slice(existingIdx + 1)
                  ]
                } else {
                  streamMessages = [...streamMessages, updatedMsg]
                }
                setMessages([...streamMessages])
              } else if (event.type === 'done') {
                streamMessages = event.messages
                setMessages([...streamMessages])
                const lastAssistant = [...streamMessages]
                  .reverse()
                  .find(
                    (m): m is ChatAssistantMessage => m.role === 'assistant'
                  )
                if (lastAssistant?.usage) setLastUsage(lastAssistant.usage)
              } else if (event.type === 'title') {
                onTitle?.(event.title)
              } else if (event.type === 'error') {
                throw new Error(event.error)
              }
            } catch {
              // Skip malformed events
            }
          }
        }

        setStatus('idle')
        onFinish?.(streamMessages)
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatus('idle')
          return
        }
        setStatus('error')
        onError?.(err instanceof Error ? err : new Error(String(err)))
      }
    },
    [messages, id, api, generateId, prepareBody, onFinish, onError, onTitle]
  )

  const regenerate = useCallback(() => {
    if (lastUserMsgRef.current) {
      // Remove the last assistant message then resend
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
