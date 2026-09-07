// src/renderer/components/philharmonic/chat/group-chat.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import { isSameDay, isToday, isYesterday, format } from 'date-fns'
import { AlertTriangleIcon, HelpCircleIcon, UsersIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import {
  getConversationMessages,
  interruptConversation,
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
import { PlanCard } from './plan-card'

type BubbleWithDate = BubbleModel & { createdAt?: string }

function formatDayLabel(d: Date): string {
  if (isToday(d)) return 'Today'
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'PPP')
}

import type { ConversationStream } from '@/hooks/use-conversation-stream'

export function GroupChat({
  conversation,
  agentsById,
  teamsById,
  members,
  stream,
  onRename,
  membersOpen,
  onToggleMembers
}: {
  conversation: ConversationData
  agentsById: Record<string, AgentData>
  teamsById: Record<string, TeamData>
  members: AgentData[]
  /** Aggregated SSE stream, hoisted from the container so the Members panel
   * sees the same busy state. */
  stream: ConversationStream
  onRename: (id: string, title: string) => void | Promise<void>
  membersOpen: boolean
  onToggleMembers: () => void
}) {
  const conversationId = conversation.id
  const { open: sidebarOpen } = useSidebar()
  const isFullscreen = useIsFullscreen()
  const [history, setHistory] = useState<ConversationMessageData[]>([])
  const { bubbles, askUser, error, revision, plan, pmRunning } = stream
  const [answer, setAnswer] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [draftTitle, setDraftTitle] = useState(conversation.title)
  // Track the conversation id + title we last synced from so we can reset
  // draftTitle/editingTitle during render when they change — the React-blessed
  // "store previous prop" approach (avoids stale state on the first render that
  // a useEffect-based reset would cause).
  const [prevConversationId, setPrevConversationId] = useState(conversationId)
  const [prevConversationTitle, setPrevConversationTitle] = useState(
    conversation.title
  )
  const scrollRef = useRef<HTMLDivElement>(null)

  if (
    conversationId !== prevConversationId ||
    conversation.title !== prevConversationTitle
  ) {
    setPrevConversationId(conversationId)
    setPrevConversationTitle(conversation.title)
    setDraftTitle(conversation.title)
    setEditingTitle(false)
  }

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
    const fromHistory: BubbleWithDate[] = history.map((h) => {
      // Pull typed parts out of the JSONB column so the bubble doesn't need
      // to know about storage layout. Two kinds today: 'attachment' (images
      // from the user) and 'artifact' (PM final report from P1-7).
      const parts = h.parts ?? []
      const attachments = parts
        .filter(
          (
            p
          ): p is {
            kind: 'attachment'
            name: string
            url: string
            contentType: string
          } =>
            typeof p === 'object' &&
            p !== null &&
            (p as { kind?: unknown }).kind === 'attachment'
        )
        .map((p) => ({
          name: p.name,
          url: p.url,
          contentType: p.contentType
        }))
      const artifacts = parts
        .filter(
          (
            p
          ): p is {
            kind: 'artifact'
            artifactId: string
            title: string
            code: string
          } =>
            typeof p === 'object' &&
            p !== null &&
            (p as { kind?: unknown }).kind === 'artifact'
        )
        .map((p) => ({
          artifactId: p.artifactId,
          title: p.title,
          code: p.code
        }))
      return {
        conversationId,
        messageId: h.id,
        role: h.role,
        agentId: h.agentId,
        text: h.content,
        createdAt: h.createdAt,
        attachments: attachments.length > 0 ? attachments : undefined,
        artifacts: artifacts.length > 0 ? artifacts : undefined
      }
    })
    const live: BubbleWithDate[] = bubbles.flatMap((b) => {
      if (persistedIds.has(b.messageId)) return []
      // Lift any artifact tool-card results into a live `artifacts` array
      // so the ArtifactCard renders the moment createReport's tool_end
      // arrives — no need to wait for the row to persist.
      const liveArtifacts = (b.toolCards ?? []).flatMap(
        (
          c
        ): {
          artifactId: string
          title: string
          code: string
        }[] => {
          if (c.phase !== 'end') return []
          const r = c.result as { type?: unknown } | null
          if (r == null || r.type !== 'artifact') return []
          const result = c.result as {
            artifactId: string
            title: string
            code: string
          }
          return [
            {
              artifactId: result.artifactId,
              title: result.title,
              code: result.code
            }
          ]
        }
      )
      return [
        {
          conversationId,
          messageId: b.messageId,
          role: b.role,
          agentId: b.agentId,
          text: b.text,
          toolCards: b.toolCards,
          artifacts: liveArtifacts.length > 0 ? liveArtifacts : undefined
          // live bubbles have no persisted createdAt — they're "now"
        }
      ]
    })
    return [...fromHistory, ...live]
  }, [history, bubbles, persistedIds, conversationId])

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
      <header
        className={cn(
          'draggable border-border bg-card/80 flex h-12 shrink-0 items-center gap-2 border-b pr-3 backdrop-blur-sm transition-[padding] duration-200 ease-linear',
          sidebarOpen ? 'pl-2' : isFullscreen ? 'pl-4' : 'pl-21'
        )}
      >
        <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground shrink-0" />
        <div className="no-drag flex min-w-0 flex-1 items-center gap-3">
          {visibleMembers.length > 0 ? (
            <div className="flex">
              {visibleMembers.map((m, i) => (
                <EmployeeAvatar
                  key={m.id}
                  seed={m.avatarSeed}
                  style={m.avatarStyle}
                  size={30}
                  className={cn(i > 0 && '-ml-2 ring-2 ring-card')}
                />
              ))}
              {overflow > 0 && (
                <span className="bg-muted text-muted-foreground ring-card -ml-2 flex h-[30px] w-[30px] items-center justify-center rounded-full text-[10px] font-semibold ring-2">
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
                className="border-border bg-muted h-7 rounded-lg text-sm font-semibold"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                title="Click to rename"
                className="text-foreground truncate text-left text-sm font-semibold tracking-tight transition-colors hover:underline"
              >
                {conversation.title}
              </button>
            )}
            <div className="text-muted-foreground text-[11px]">
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
              {primaryTeam ? ` · ${primaryTeam}` : ''}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Toggle members"
          data-testid={TEST_IDS.philharmonic.membersToggle}
          onClick={onToggleMembers}
          className={cn(
            'no-drag text-muted-foreground hover:text-foreground shrink-0 rounded-full',
            membersOpen && 'bg-accent text-foreground'
          )}
        >
          <UsersIcon />
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {plan && plan.steps.length > 0 && (
          <div className="mx-auto max-w-2xl">
            <PlanCard plan={plan} agentsById={agentsById} />
          </div>
        )}
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
              // Use null when createdAt is absent (e.g. live streaming bubble) so
              // the day divider is skipped rather than using an unstable new Date().
              const curDate = b.createdAt ? new Date(b.createdAt) : null
              const prevDate = prev?.createdAt ? new Date(prev.createdAt) : null
              const showDay =
                curDate !== null && (!prevDate || !isSameDay(curDate, prevDate))
              return (
                <div key={b.messageId}>
                  {showDay && curDate && (
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
          <div className="text-destructive bg-destructive/10 mx-auto mt-2 flex max-w-2xl items-center gap-2 rounded-lg px-3 py-2 text-xs">
            <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {askUser && (
          <div className="border-border bg-muted mx-auto my-3 max-w-2xl rounded-xl border p-3">
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
                className="border-border bg-card rounded-lg"
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
        onSend={(text, attachments) =>
          sendConversationMessage(conversationId, text, attachments)
        }
        busy={pmRunning}
        onStop={() => {
          interruptConversation(conversationId).catch(() => {})
        }}
      />
    </div>
  )
}
