// src/renderer/components/philharmonic/chat/group-chat.tsx
import { isSameDay, isToday, isYesterday, format } from 'date-fns'
import { AlertTriangleIcon, HelpCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConversationStream } from '@/hooks/use-conversation-stream'
import { cn } from '@/lib/utils'
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

import { EmployeeAvatar } from '../employees/employee-avatar'
import { PhilharmonicEmptyState } from '../empty-state'
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
  members,
  onRename
}: {
  conversation: ConversationData
  agentsById: Record<string, AgentData>
  teamsById: Record<string, TeamData>
  members: AgentData[]
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

  const memberCount = conversation.memberAgentIds?.length ?? members.length
  const visibleMembers = members.slice(0, 3)
  const overflow = Math.max(0, memberCount - 3)
  const primaryTeam = visibleMembers[0]?.teamId
    ? (teamsById[visibleMembers[0].teamId]?.name ?? null)
    : null

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--ph-border)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          {visibleMembers.length > 0 ? (
            <div className="flex">
              {visibleMembers.map((m, i) => (
                <EmployeeAvatar
                  key={m.id}
                  seed={m.avatarSeed}
                  style={m.avatarStyle}
                  size={30}
                  className={cn(
                    i > 0 && '-ml-2 ring-2 ring-[var(--ph-surface)]'
                  )}
                />
              ))}
              {overflow > 0 && (
                <span
                  className="-ml-2 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[10px] font-semibold ring-2 ring-[var(--ph-surface)]"
                  style={{
                    background: 'var(--ph-canvas)',
                    color: 'var(--ph-text-muted)'
                  }}
                >
                  +{overflow}
                </span>
              )}
            </div>
          ) : (
            <span className="text-base">{conversation.icon ?? '💬'}</span>
          )}
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
                className="h-7 rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface-sunken)] text-sm font-semibold"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                title="Click to rename"
                className="truncate text-left text-sm font-semibold tracking-tight text-[var(--ph-text)] transition-colors hover:underline"
              >
                {conversation.title}
              </button>
            )}
            <div className="text-[11px] text-[var(--ph-text-muted)]">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
              {primaryTeam ? ` · ${primaryTeam}` : ''}
            </div>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {merged.length === 0 ? (
          <PhilharmonicEmptyState
            avatars={[{ hue: 'lilac' }, { hue: 'mint' }, { hue: 'peach' }]}
            title="Hand something to your team"
            description="Describe what you need. The PM will analyze, recruit and delegate to virtual employees, then report back here."
          />
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
          <div
            className="mx-auto mt-2 flex max-w-2xl items-center gap-2 rounded-[var(--ph-radius-md)] px-3 py-2 text-xs"
            style={{
              background: 'oklch(0.95 0.06 27 / 0.6)',
              color: 'var(--ph-danger)'
            }}
          >
            <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {askUser && (
          <div
            className="mx-auto my-3 max-w-2xl rounded-[var(--ph-radius-lg)] border border-[var(--ph-border)] p-3"
            style={{ background: 'var(--ph-surface-sunken)' }}
          >
            <div className="mb-2 flex items-start gap-2 text-sm text-[var(--ph-text)]">
              <HelpCircleIcon
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: 'var(--ph-primary)' }}
              />
              <span>{askUser.question}</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Reply to PM…"
                autoFocus
                className="rounded-[var(--ph-radius-md)] border-[var(--ph-border)] bg-[var(--ph-surface)]"
              />
              <Button
                onClick={async () => {
                  if (!answer.trim()) return
                  await respondToConversation(conversationId, answer)
                  setAnswer('')
                }}
                style={{ background: 'var(--ph-primary)' }}
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
