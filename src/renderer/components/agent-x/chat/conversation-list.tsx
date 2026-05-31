// src/renderer/components/agent-x/chat/conversation-list.tsx
import { Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ConversationData } from '@/stores/agent-x'

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate
}: {
  conversations: ConversationData[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <span className="text-sm font-medium">Groups</span>
        <Button size="icon-sm" variant="ghost" onClick={onCreate}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={cn(
              'hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
              c.id === activeId && 'bg-muted'
            )}
          >
            <span>{c.icon ?? '💬'}</span>
            <span className="truncate">{c.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
