// src/renderer/components/philharmonic/chat/group-members-panel.tsx
import { UsersIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AgentData, TeamData } from '@/stores/philharmonic'

import { EmployeeAvatar } from '../employees/employee-avatar'

export function GroupMembersPanel({
  members,
  teamsById,
  busyAgentIds
}: {
  members: AgentData[]
  teamsById: Record<string, TeamData>
  busyAgentIds: Set<string>
}) {
  return (
    <div className="bg-sidebar/40 flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-foreground text-sm font-semibold tracking-tight">
          Members
        </span>
        <Badge variant="secondary" className="h-5 px-1.5">
          {members.length}
        </Badge>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {members.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <UsersIcon className="h-8 w-8 opacity-40" />
            <div className="text-xs">
              The PM will recruit teammates as needed.
            </div>
          </div>
        ) : (
          <ul className="space-y-0.5">
            {members.map((m) => {
              const team = m.teamId ? teamsById[m.teamId] : undefined
              const busy = busyAgentIds.has(m.id)
              return (
                <li
                  key={m.id}
                  className="hover:bg-accent/40 flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors"
                >
                  <div className="relative">
                    <EmployeeAvatar
                      seed={m.avatarSeed}
                      style={m.avatarStyle}
                      size={32}
                    />
                    <span
                      className={cn(
                        'border-sidebar absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2',
                        busy ? 'animate-pulse bg-amber-500' : 'bg-emerald-500'
                      )}
                      aria-label={busy ? 'busy' : 'idle'}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-foreground truncate text-sm">
                      {m.name}
                    </div>
                    {team && (
                      <div className="text-muted-foreground truncate text-xs">
                        {team.icon ? `${team.icon} ` : ''}
                        {team.name}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
