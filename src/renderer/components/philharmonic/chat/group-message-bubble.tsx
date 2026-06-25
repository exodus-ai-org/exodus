// src/renderer/components/philharmonic/chat/group-message-bubble.tsx
import { format } from 'date-fns'
import { CheckIcon, Loader2Icon, WrenchIcon } from 'lucide-react'

import { ArtifactCard } from '@/components/calling-tools/artifact/artifact-card'
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/utils'
import type { AgentData, TeamData } from '@/stores/philharmonic'

import { EmployeeAvatar } from '../employees/employee-avatar'

interface ArtifactPart {
  artifactId: string
  title: string
  code: string
}

export interface BubbleModel {
  conversationId?: string
  messageId: string
  role: string // 'user' | 'pm' | 'employee' | 'system'
  agentId?: string | null
  text: string
  createdAt?: string
  toolCards?: Array<{
    toolName: string
    phase: 'start' | 'end'
    result?: unknown
  }>
  /** Image attachments displayed alongside the message body (user bubbles). */
  attachments?: Array<{
    name: string
    url: string
    contentType: string
  }>
  /** P1-7: rendered ArtifactCard(s) for the PM's final deliverable. */
  artifacts?: ArtifactPart[]
}

export function GroupMessageBubble({
  bubble,
  agentsById,
  teamsById
}: {
  bubble: BubbleModel
  agentsById: Record<string, AgentData>
  teamsById: Record<string, TeamData>
}) {
  const isUser = bubble.role === 'user'
  const isSystem = bubble.role === 'system'
  const isPm = bubble.role === 'pm'
  const agent = bubble.agentId ? agentsById[bubble.agentId] : undefined
  const team = agent?.teamId ? teamsById[agent.teamId] : undefined
  const name = isUser ? 'You' : isPm ? 'PM' : (agent?.name ?? 'Employee')

  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <span
          className="rounded-full px-3 py-0.5 text-xs text-[var(--ph-text-muted)]"
          style={{ background: 'var(--ph-canvas)' }}
        >
          {bubble.text}
        </span>
      </div>
    )
  }

  const time = bubble.createdAt
    ? (() => {
        try {
          return format(new Date(bubble.createdAt), 'HH:mm')
        } catch {
          return ''
        }
      })()
    : ''

  const headerLine = (
    <span className="flex items-baseline gap-1.5 px-0.5 text-[11px] text-[var(--ph-text-muted)]">
      <span className="font-medium text-[var(--ph-text)]">{name}</span>
      {team && (
        <span className="text-[var(--ph-text-muted)]">
          · {team.icon ? `${team.icon} ` : ''}
          {team.name}
        </span>
      )}
      {time && <span>· {time}</span>}
    </span>
  )

  return (
    <div
      className={cn('flex gap-2.5 px-1 py-1.5', isUser && 'flex-row-reverse')}
    >
      {isPm ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{
            background: 'var(--ph-primary)',
            boxShadow:
              '0 0 0 2px var(--ph-surface), 0 0 0 3.5px var(--ph-primary-soft)'
          }}
        >
          PM
        </div>
      ) : isUser ? (
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
          style={{
            background: 'var(--ph-primary-soft)',
            color: 'var(--ph-primary-ink)'
          }}
        >
          You
        </div>
      ) : (
        <EmployeeAvatar
          seed={agent?.avatarSeed ?? null}
          style={agent?.avatarStyle ?? null}
          size={36}
        />
      )}
      <div
        className={cn(
          'flex min-w-0 max-w-[78%] flex-col gap-1',
          isUser && 'items-end'
        )}
      >
        {headerLine}
        {bubble.attachments && bubble.attachments.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-2',
              isUser ? 'justify-end' : 'justify-start'
            )}
          >
            {bubble.attachments
              .filter((a) => a.contentType.startsWith('image/'))
              .map((a, i) => (
                <a
                  key={`${a.url}-${i}`}
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={a.url}
                    alt={a.name}
                    className="max-h-48 max-w-[12rem] rounded-[var(--ph-radius-md)] object-cover"
                    style={{ background: 'var(--ph-canvas)' }}
                  />
                </a>
              ))}
          </div>
        )}
        {bubble.text.length > 0 && (
          <div
            className={cn(
              'px-3.5 py-2.5 text-sm leading-relaxed',
              isUser ? 'text-white' : 'text-[var(--ph-text)]'
            )}
            style={{
              background: isUser ? 'var(--ph-primary)' : 'var(--ph-canvas)',
              borderRadius: isUser
                ? 'var(--ph-radius-xl) 6px var(--ph-radius-xl) var(--ph-radius-xl)'
                : '6px var(--ph-radius-xl) var(--ph-radius-xl) var(--ph-radius-xl)'
            }}
          >
            <Markdown src={bubble.text} />
          </div>
        )}
        {bubble.artifacts &&
          bubble.artifacts.length > 0 &&
          bubble.conversationId && (
            <div className="flex flex-col gap-2">
              {bubble.artifacts.map((a) => (
                <ArtifactCard
                  key={a.artifactId}
                  chatId={bubble.conversationId!}
                  toolResult={{
                    type: 'artifact',
                    title: a.title,
                    code: a.code,
                    artifactId: a.artifactId
                  }}
                />
              ))}
            </div>
          )}
        {bubble.toolCards && bubble.toolCards.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {bubble.toolCards.map((card, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 border border-[var(--ph-border)] bg-[var(--ph-surface)] px-3 py-2"
                style={{
                  borderRadius:
                    '6px var(--ph-radius-lg) var(--ph-radius-lg) var(--ph-radius-lg)'
                }}
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-[var(--ph-radius-sm)]"
                  style={{ background: 'var(--ph-primary-soft)' }}
                >
                  <WrenchIcon
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--ph-primary-ink)' }}
                  />
                </div>
                <div className="min-w-0 flex-1 text-xs font-semibold text-[var(--ph-text)]">
                  {card.toolName}
                </div>
                {card.phase === 'start' ? (
                  <Loader2Icon
                    className="h-3.5 w-3.5 animate-spin"
                    style={{ color: 'var(--ph-primary)' }}
                  />
                ) : (
                  <CheckIcon
                    className="h-3.5 w-3.5"
                    style={{ color: 'var(--ph-primary)' }}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
