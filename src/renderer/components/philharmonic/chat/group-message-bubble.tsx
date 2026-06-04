// src/renderer/components/philharmonic/chat/group-message-bubble.tsx
import { CheckIcon, Loader2Icon, WrenchIcon } from 'lucide-react'

import { Markdown } from '@/components/markdown'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AgentData, TeamData } from '@/stores/philharmonic'

import { EmployeeAvatar } from '../employees/employee-avatar'

export interface BubbleModel {
  messageId: string
  role: string // 'user' | 'pm' | 'employee' | 'system'
  agentId?: string | null
  text: string
  toolCards?: Array<{
    toolName: string
    phase: 'start' | 'end'
    result?: unknown
  }>
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
        <span className="text-muted-foreground bg-muted/40 rounded-full px-3 py-0.5 text-xs">
          {bubble.text}
        </span>
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3 px-1 py-1.5', isUser && 'flex-row-reverse')}>
      {isPm ? (
        <div className="bg-primary text-primary-foreground ring-background flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-2">
          PM
        </div>
      ) : isUser ? (
        <div className="bg-secondary text-secondary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium">
          You
        </div>
      ) : (
        <EmployeeAvatar
          seed={agent?.avatarSeed ?? null}
          style={agent?.avatarStyle ?? null}
        />
      )}
      <div
        className={cn(
          'flex min-w-0 max-w-[78%] flex-col gap-1',
          isUser && 'items-end'
        )}
      >
        <div className="text-muted-foreground flex items-center gap-1.5 px-0.5 text-xs">
          <span className="text-foreground/80 font-medium">{name}</span>
          {team && (
            <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
              {team.icon ? `${team.icon} ` : ''}
              {team.name}
            </Badge>
          )}
        </div>
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : isPm
                ? 'bg-card border-border/60 rounded-bl-md border'
                : 'bg-muted/60 rounded-bl-md'
          )}
        >
          <Markdown src={bubble.text} />
        </div>
        {bubble.toolCards && bubble.toolCards.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bubble.toolCards.map((card, i) => (
              <Badge key={i} variant="outline" className="font-normal">
                {card.phase === 'end' ? (
                  <CheckIcon className="text-emerald-500" />
                ) : (
                  <Loader2Icon className="animate-spin" />
                )}
                <WrenchIcon />
                {card.toolName}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
