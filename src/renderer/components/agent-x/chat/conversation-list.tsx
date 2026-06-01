// src/renderer/components/agent-x/chat/conversation-list.tsx
import { formatDistanceToNowStrict } from 'date-fns'
import { MessageSquarePlus, PlusIcon, SearchIcon, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

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
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AgentData, ConversationData } from '@/stores/agent-x'

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: false })
  } catch {
    return ''
  }
}

function previewLine(
  latest: ConversationData['latestMessage'],
  agentsById: Record<string, AgentData>
): string {
  if (!latest) return ''
  const text = latest.content.replace(/\s+/g, ' ').trim()
  if (latest.role === 'system') return text
  const senderLabel =
    latest.role === 'user'
      ? 'You'
      : latest.role === 'pm'
        ? 'PM'
        : latest.agentId
          ? (agentsById[latest.agentId]?.name ?? 'Employee')
          : 'Employee'
  return `${senderLabel}: ${text}`
}

export function ConversationList({
  conversations,
  agentsById,
  activeId,
  onSelect,
  onCreate,
  onDelete
}: {
  conversations: ConversationData[]
  agentsById: Record<string, AgentData>
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void | Promise<void>
}) {
  const [confirming, setConfirming] = useState<ConversationData | null>(null)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations
    const q = query.trim().toLowerCase()
    return conversations.filter((c) => {
      const inTitle = c.title.toLowerCase().includes(q)
      const inPreview =
        c.latestMessage?.content?.toLowerCase().includes(q) ?? false
      return inTitle || inPreview
    })
  }, [conversations, query])

  return (
    <div className="bg-sidebar/40 flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <span className="text-foreground text-sm font-semibold tracking-tight">
          Groups
        </span>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onCreate}
          aria-label="New group"
        >
          <PlusIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups"
            className="h-8 pl-7 text-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <MessageSquarePlus className="h-8 w-8 opacity-40" />
            <div className="text-sm">No groups yet</div>
            <div className="text-xs">
              Create one and message your virtual team.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
            No groups match "{query}"
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const isActive = c.id === activeId
              const preview = previewLine(c.latestMessage, agentsById)
              return (
                <li key={c.id}>
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <button
                        onClick={() => onSelect(c.id)}
                        className={cn(
                          'group flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors',
                          isActive
                            ? 'bg-accent text-accent-foreground'
                            : 'hover:bg-accent/40'
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg',
                            isActive ? 'bg-background/60' : 'bg-muted'
                          )}
                        >
                          {c.icon ?? '💬'}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium">
                              {c.title}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                              {relativeTime(c.lastMessageAt)}
                            </span>
                          </span>
                          <span
                            className={cn(
                              'truncate text-xs',
                              isActive
                                ? 'text-foreground/70'
                                : 'text-muted-foreground'
                            )}
                          >
                            {preview || 'New group · no messages yet'}
                          </span>
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        variant="destructive"
                        onSelect={() => setConfirming(c)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Delete
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </li>
              )
            })}
          </ul>
        )}
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
