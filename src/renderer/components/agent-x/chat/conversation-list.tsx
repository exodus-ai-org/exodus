// src/renderer/components/agent-x/chat/conversation-list.tsx
import { Plus } from 'lucide-react'
import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import type { ConversationData } from '@/stores/agent-x'

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete
}: {
  conversations: ConversationData[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void | Promise<void>
}) {
  const [confirming, setConfirming] = useState<ConversationData | null>(null)

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
          <ContextMenu key={c.id}>
            <ContextMenuTrigger>
              <button
                onClick={() => onSelect(c.id)}
                className={cn(
                  'hover:bg-muted/50 flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                  c.id === activeId && 'bg-muted'
                )}
              >
                <span>{c.icon ?? '💬'}</span>
                <span className="truncate">{c.title}</span>
              </button>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem
                variant="destructive"
                onSelect={() => setConfirming(c)}
              >
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </div>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming
                ? `"${confirming.title}" and all its messages, tasks, and executions will be permanently removed.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirming) return
                const id = confirming.id
                setConfirming(null)
                await onDelete(id)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
