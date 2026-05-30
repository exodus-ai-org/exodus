import { BASE_URL } from '@shared/constants/systems'
import type { AgentXSseEvent } from '@shared/types/agent-x'
import { useEffect, useState } from 'react'

export interface LiveBubble {
  messageId: string
  role: string
  agentId?: string
  text: string
  done: boolean
  toolCards: Array<{
    toolName: string
    phase: 'start' | 'end'
    result?: unknown
  }>
}

export interface ConversationStream {
  bubbles: LiveBubble[]
  askUser: { question: string; options: string[] } | null
  error: string | null
  /** bumps whenever a message_end / member_joined arrives so the page can refetch */
  revision: number
}

export function useConversationStream(
  conversationId: string | null
): ConversationStream {
  const [bubbles, setBubbles] = useState<LiveBubble[]>([])
  const [askUser, setAskUser] = useState<ConversationStream['askUser']>(null)
  const [error, setError] = useState<string | null>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!conversationId) return
    setBubbles([])
    setAskUser(null)
    setError(null)

    const source = new EventSource(
      `${BASE_URL}/api/agent-x/conversations/${conversationId}/sse`
    )
    source.onmessage = (e) => {
      let evt: AgentXSseEvent
      try {
        evt = JSON.parse(e.data) as AgentXSseEvent
      } catch {
        return
      }
      if (!('conversationId' in evt) || evt.conversationId !== conversationId)
        return

      switch (evt.type) {
        case 'message_start':
          setBubbles((prev) => [
            ...prev,
            {
              messageId: evt.messageId,
              role: evt.role,
              agentId: evt.agentId,
              text: '',
              done: false,
              toolCards: []
            }
          ])
          // PM resuming after an askUser response → clear the panel.
          setAskUser(null)
          break
        case 'message_delta':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId ? { ...b, text: evt.delta } : b
            )
          )
          break
        case 'message_end':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId ? { ...b, done: true } : b
            )
          )
          setRevision((r) => r + 1)
          break
        case 'tool_card':
          setBubbles((prev) =>
            prev.map((b) =>
              b.messageId === evt.messageId
                ? {
                    ...b,
                    toolCards: [
                      ...b.toolCards,
                      {
                        toolName: evt.toolName,
                        phase: evt.phase,
                        result: evt.result
                      }
                    ]
                  }
                : b
            )
          )
          break
        case 'member_joined':
          setRevision((r) => r + 1)
          break
        case 'ask_user':
          setAskUser({ question: evt.question, options: evt.options })
          break
        case 'conversation_error':
          setError(evt.error)
          break
      }
    }
    return () => source.close()
  }, [conversationId])

  return { bubbles, askUser, error, revision }
}
