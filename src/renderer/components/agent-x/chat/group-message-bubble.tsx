// src/renderer/components/agent-x/chat/group-message-bubble.tsx
import { Markdown } from '@/components/markdown'
import { cn } from '@/lib/utils'
import type { AgentData } from '@/stores/agent-x'

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
  agentsById
}: {
  bubble: BubbleModel
  agentsById: Record<string, AgentData>
}) {
  const isUser = bubble.role === 'user'
  const isSystem = bubble.role === 'system'
  const agent = bubble.agentId ? agentsById[bubble.agentId] : undefined
  const name = isUser
    ? 'You'
    : bubble.role === 'pm'
      ? 'PM'
      : (agent?.name ?? 'Employee')

  if (isSystem) {
    return (
      <div className="text-muted-foreground my-2 text-center text-xs">
        {bubble.text}
      </div>
    )
  }

  return (
    <div className={cn('flex gap-3 py-2', isUser && 'flex-row-reverse')}>
      {bubble.role === 'pm' ? (
        <div className="bg-primary text-primary-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          PM
        </div>
      ) : isUser ? (
        <div className="bg-secondary flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs">
          You
        </div>
      ) : (
        <EmployeeAvatar
          seed={agent?.avatarSeed ?? null}
          style={agent?.avatarStyle ?? null}
        />
      )}
      <div
        className={cn('min-w-0 max-w-[80%]', isUser && 'items-end text-right')}
      >
        <div className="text-muted-foreground mb-0.5 flex items-center gap-1.5 text-xs">
          <span className="font-medium">{name}</span>
          {agent?.team && (
            <span className="bg-muted rounded px-1 py-px">{agent.team}</span>
          )}
        </div>
        <div className="bg-muted/50 rounded-lg px-3 py-2 text-sm">
          <Markdown src={bubble.text} />
          {bubble.toolCards?.map((card, i) => (
            <div key={i} className="text-muted-foreground mt-1 text-xs">
              🔧 {card.toolName} {card.phase === 'end' ? '✓' : '…'}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
