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

  // Helper to build a subscriber object (used both on mount and when sending)
  const makeSubscriber = useCallback(() => {
    return {
      onMessages: (msgs: ChatMessage[]) => {
        setMessages(msgs)
        const last = [...msgs]
          .reverse()
          .find((m): m is ChatAssistantMessage => m.role === 'assistant')
        if (last?.usage) setLastUsage(last.usage)
      },
      onStatus: setStatus,
      onTitle: (t: string) => onTitleRef.current?.(t),
      onError: (e: Error) => onErrorRef.current?.(e),
      onFinish: (msgs: ChatMessage[]) => onFinishRef.current?.(msgs)
    }
  }, [])

  // Subscribe to an existing background stream on mount
  useEffect(() => {
    if (isStreamActive(id)) {
      subscribe(id, makeSubscriber())
    }
    return () => {
      unsubscribe(id)
    }
  }, [id, makeSubscriber])

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
        subscriber: makeSubscriber()
      })
    },
    [messages, id, chatTitle, api, generateId, prepareBody, makeSubscriber]
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
