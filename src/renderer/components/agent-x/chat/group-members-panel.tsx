// src/renderer/components/agent-x/chat/group-members-panel.tsx
import type { AgentData } from '@/stores/agent-x'

import { EmployeeAvatar } from '../employees/employee-avatar'

export function GroupMembersPanel({
  members,
  busyAgentIds
}: {
  members: AgentData[]
  busyAgentIds: Set<string>
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-3 text-sm font-medium">
        群成员 ({members.length})
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-md p-2">
            <EmployeeAvatar
              seed={m.avatarSeed}
              style={m.avatarStyle}
              size={32}
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm">{m.name}</div>
              {m.team && (
                <div className="text-muted-foreground truncate text-xs">
                  {m.team}
                </div>
              )}
            </div>
            <span
              className={
                busyAgentIds.has(m.id) ? 'text-amber-500' : 'text-emerald-500'
              }
            >
              ●
            </span>
          </div>
        ))}
        {members.length === 0 && (
          <div className="text-muted-foreground p-4 text-center text-xs">
            PM 会按需拉人入群
          </div>
        )}
      </div>
    </div>
  )
}
