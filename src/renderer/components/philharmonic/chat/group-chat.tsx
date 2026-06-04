// src/renderer/components/philharmonic/chat/group-chat.tsx
import { isSameDay, isToday, isYesterday, format } from 'date-fns'
import {
  AlertTriangleIcon,
  HelpCircleIcon,
  MessageSquareIcon,
  UsersIcon
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConversationStream } from '@/hooks/use-conversation-stream'
import {
  getConversationMessages,
  respondToConversation,
  sendConversationMessage
} from '@/services/philharmonic-chat'
import type {
  AgentData,
  ConversationData,
  ConversationMessageData,
  TeamData
} from '@/stores/philharmonic'

import { Composer } from './composer'
import { GroupMessageBubble, type BubbleModel } from './group-message-bubble'

type BubbleWithDate = BubbleModel & { createdAt?: string }

function formatDayLabel(d: Date): string {
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'PPP')
}

export function GroupChat({
  conversation,
  agentsById,
  teamsById,
  onRename
}: {
  conversation: ConversationData
  agentsById: Record<string, AgentData>
  teamsById: Record<string, TeamData>
  onRename: (id: string, title: string) => void | Promise<void>
}) {
  const conversationId = conversation.id
  const [history, setHistory] = useState<ConversationMessageData[]>([])
  const { bubbles, askUser, error, revision } =
    useConversationStream(conversationId)
  const [answer, setAnswer] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(conversation.title)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDraftTitle(conversation.title)
    setEditingTitle(false)
  }, [conversation.id, conversation.title])

  const commitTitle = () => {
    const next = draftTitle.trim()
    setEditingTitle(false)
    if (!next || next === conversation.title) {
      setDraftTitle(conversation.title)
      return
    }
    onRename(conversation.id, next)
  }

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
  const merged: BubbleWithDate[] = useMemo(() => {
    const fromHistory: BubbleWithDate[] = history.map((h) => ({
      messageId: h.id,
      role: h.role,
      agentId: h.agentId,
      text: h.content,
      createdAt: h.createdAt
    }))
    const live: BubbleWithDate[] = bubbles
      .filter((b) => !persistedIds.has(b.messageId))
      .map((b) => ({
        messageId: b.messageId,
        role: b.role,
        agentId: b.agentId,
        text: b.text,
        toolCards: b.toolCards
        // live bubbles have no persisted createdAt — they're "now"
      }))
    return [...fromHistory, ...live]
  }, [history, bubbles, persistedIds])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [merged.length, bubbles])

  const memberCount = conversation.memberAgentIds?.length ?? 0

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-base">{conversation.icon ?? '💬'}</span>
          <div className="min-w-0">
            {editingTitle ? (
              <Input
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    commitTitle()
                  } else if (e.key === 'Escape') {
                    setDraftTitle(conversation.title)
                    setEditingTitle(false)
                  }
                }}
                autoFocus
                className="h-7 text-sm font-semibold"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                title="Click to rename"
                className="hover:text-foreground/80 truncate text-left text-sm font-semibold tracking-tight transition-colors"
              >
                {conversation.title}
              </button>
            )}
            <div className="text-muted-foreground flex items-center gap-1 text-[11px]">
              <UsersIcon className="h-3 w-3" />
              <span>
                {memberCount} {memberCount === 1 ? 'member' : 'members'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
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
            {merged.map((b, i) => {
              const prev = i > 0 ? merged[i - 1] : null
              const curDate = b.createdAt ? new Date(b.createdAt) : new Date()
              const prevDate = prev?.createdAt
                ? new Date(prev.createdAt)
                : prev
                  ? new Date()
                  : null
              const showDay = !prevDate || !isSameDay(curDate, prevDate)
              return (
                <div key={b.messageId}>
                  {showDay && (
                    <div className="my-3 flex items-center gap-3">
                      <div className="border-border/60 flex-1 border-t" />
                      <span className="text-muted-foreground text-[10px] tracking-wider uppercase">
                        {formatDayLabel(curDate)}
                      </span>
                      <div className="border-border/60 flex-1 border-t" />
                    </div>
                  )}
                  <GroupMessageBubble
                    bubble={b}
                    agentsById={agentsById}
                    teamsById={teamsById}
                  />
                </div>
              )
            })}
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
