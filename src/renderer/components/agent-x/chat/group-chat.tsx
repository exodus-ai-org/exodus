// src/renderer/components/agent-x/chat/group-chat.tsx
import {
  AlertTriangleIcon,
  HelpCircleIcon,
  MessageSquareIcon
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConversationStream } from '@/hooks/use-conversation-stream'
import {
  getConversationMessages,
  respondToConversation,
  sendConversationMessage
} from '@/services/agent-x-chat'
import type {
  AgentData,
  ConversationMessageData,
  TeamData
} from '@/stores/agent-x'

import { Composer } from './composer'
import { GroupMessageBubble, type BubbleModel } from './group-message-bubble'

export function GroupChat({
  conversationId,
  agentsById,
  teamsById
}: {
  conversationId: string
  agentsById: Record<string, AgentData>
  teamsById: Record<string, TeamData>
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-2">
        {merged.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MessageSquareIcon className="h-10 w-10 opacity-30" />
            <div className="text-foreground text-sm font-medium">
              Hand something to your team
            </div>
            <div className="max-w-xs text-xs">
              Describe what you need. The PM will analyze, recruit and delegate
              to virtual employees, then report back here.
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-1">
            {merged.map((b) => (
              <GroupMessageBubble
                key={b.messageId}
                bubble={b}
                agentsById={agentsById}
                teamsById={teamsById}
              />
            ))}
          </div>
        )}
        {error && (
          <div className="bg-destructive/10 text-destructive mx-auto mt-2 flex max-w-2xl items-center gap-2 rounded-lg px-3 py-2 text-xs">
            <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {askUser && (
          <div className="bg-card mx-auto my-3 max-w-2xl rounded-xl border p-3">
            <div className="text-foreground mb-2 flex items-start gap-2 text-sm">
              <HelpCircleIcon className="text-primary mt-0.5 h-4 w-4 shrink-0" />
              <span>{askUser.question}</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Reply to PM…"
                autoFocus
              />
              <Button
                onClick={async () => {
                  if (!answer.trim()) return
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
