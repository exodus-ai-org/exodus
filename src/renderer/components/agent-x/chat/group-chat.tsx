// src/renderer/components/agent-x/chat/group-chat.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConversationStream } from '@/hooks/use-conversation-stream'
import {
  getConversationMessages,
  respondToConversation,
  sendConversationMessage
} from '@/services/agent-x-chat'
import type { AgentData, ConversationMessageData } from '@/stores/agent-x'

import { Composer } from './composer'
import { GroupMessageBubble, type BubbleModel } from './group-message-bubble'

export function GroupChat({
  conversationId,
  agentsById
}: {
  conversationId: string
  agentsById: Record<string, AgentData>
}) {
  const [history, setHistory] = useState<ConversationMessageData[]>([])
  const { bubbles, askUser, error, revision } =
    useConversationStream(conversationId)
  const [answer, setAnswer] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => {
    getConversationMessages(conversationId).then(setHistory)
  }, [conversationId])

  useEffect(() => load(), [load])
  useEffect(() => load(), [revision, load]) // refetch on each message_end

  // Persisted history is source of truth; live bubbles only for not-yet-saved.
  const persistedIds = useMemo(
    () => new Set(history.map((h) => h.id)),
    [history]
  )
  const merged: BubbleModel[] = useMemo(() => {
    const fromHistory: BubbleModel[] = history.map((h) => ({
      messageId: h.id,
      role: h.role,
      agentId: h.agentId,
      text: h.content
    }))
    const live = bubbles
      .filter((b) => !persistedIds.has(b.messageId))
      .map((b) => ({
        messageId: b.messageId,
        role: b.role,
        agentId: b.agentId,
        text: b.text,
        toolCards: b.toolCards
      }))
    return [...fromHistory, ...live]
  }, [history, bubbles, persistedIds])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [merged.length, bubbles])

  return (
    <div className="flex h-full flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4">
        {merged.map((b) => (
          <GroupMessageBubble
            key={b.messageId}
            bubble={b}
            agentsById={agentsById}
          />
        ))}
        {error && (
          <div className="text-destructive py-2 text-center text-xs">
            {error}
          </div>
        )}
        {askUser && (
          <div className="bg-muted my-2 rounded-lg p-3">
            <div className="mb-2 text-sm">{askUser.question}</div>
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Reply to PM…"
              />
              <Button
                onClick={async () => {
                  await respondToConversation(conversationId, answer)
                  setAnswer('')
                }}
              >
                Send
              </Button>
            </div>
          </div>
        )}
      </div>
      <Composer
        onSend={(text) => sendConversationMessage(conversationId, text)}
      />
    </div>
  )
}
