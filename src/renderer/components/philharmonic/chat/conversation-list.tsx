// src/renderer/components/philharmonic/chat/conversation-list.tsx
import {
  differenceInCalendarDays,
  format,
  isToday,
  isYesterday
} from 'date-fns'
import {
  ArrowLeftIcon,
  BookOpenIcon,
  LayoutDashboardIcon,
  PlusIcon,
  SearchIcon,
  Trash2,
  UsersIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import { PhilharmonicEmptyState } from '@/components/philharmonic/empty-state'
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@/components/ui/context-menu'
import { Input } from '@/components/ui/input'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import type { AgentData, ConversationData } from '@/stores/philharmonic'

import { hueStyle, pickHue } from '../lib/hue'

export type ConfigPage = 'workforce' | 'knowledge' | 'dashboard'

const CONFIG_NAV: Array<{
  page: ConfigPage
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { page: 'workforce', label: 'Workforce', icon: UsersIcon },
  { page: 'knowledge', label: 'Knowledge Base', icon: BookOpenIcon },
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon }
]

/** Smart timestamp: HH:mm today, 'Yesterday', day name within the week, otherwise MM/dd. */
function smartTime(iso: string): string {
  try {
    const d = new Date(iso)
    if (isToday(d)) return format(d, 'HH:mm')
    if (isYesterday(d)) return 'Yesterday'
    const diff = differenceInCalendarDays(new Date(), d)
    if (diff < 7) return format(d, 'EEE')
    return format(d, 'MM/dd')
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
  activePage,
  onSelect,
  onCreate,
  onDelete,
  onNavigateConfig
}: {
  conversations: ConversationData[]
  agentsById: Record<string, AgentData>
  activeId: string | null
  activePage: 'chat' | ConfigPage
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void | Promise<void>
  onNavigateConfig: (page: ConfigPage) => void
}) {
  const [confirming, setConfirming] = useState<ConversationData | null>(null)
  const [query, setQuery] = useState('')
  const isFullscreen = useIsFullscreen()
  const navigate = useNavigate()

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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div
        className={cn(
          'draggable flex h-13 shrink-0 items-center justify-between gap-2 border-b border-[var(--ph-border)] pr-3',
          isFullscreen ? 'pl-4' : 'pl-21'
        )}
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ph-text)]">
          Groups
          <span className="rounded-full bg-[var(--ph-canvas)] px-2 py-0.5 text-[10px] font-normal text-[var(--ph-text-muted)]">
            {conversations.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onCreate}
          aria-label="New group"
          className="no-drag flex h-8 w-8 items-center justify-center rounded-[var(--ph-radius-md)] text-white transition-opacity hover:opacity-90"
          style={{ background: 'var(--ph-primary)' }}
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--ph-text-muted)]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups"
            className="h-9 rounded-[var(--ph-radius-md)] border-transparent bg-[var(--ph-canvas)] pl-8 text-sm shadow-none focus-visible:border-[var(--ph-primary)] focus-visible:bg-[var(--ph-surface)] focus-visible:ring-[3px] focus-visible:ring-[var(--ph-primary-soft)]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {conversations.length === 0 ? (
          <PhilharmonicEmptyState
            avatars={[{ hue: 'lilac' }, { hue: 'mint' }, { hue: 'peach' }]}
            title="No groups yet"
            description="Create one to message your virtual team."
            action={{ label: '+ New group', onClick: onCreate }}
          />
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[var(--ph-text-muted)]">
            No groups match &ldquo;{query}&rdquo;
          </div>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const isActive = activePage === 'chat' && c.id === activeId
              const preview = previewLine(c.latestMessage, agentsById)
              return (
                <li key={c.id}>
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className={cn(
                          'group flex w-full items-start gap-2.5 rounded-[var(--ph-radius-md)] px-2 py-2 text-left transition-all'
                        )}
                        style={
                          isActive
                            ? { background: 'var(--ph-primary-faint)' }
                            : undefined
                        }
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background =
                              'var(--ph-canvas)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = ''
                          }
                        }}
                      >
                        <span
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
                          style={hueStyle(pickHue(c.id))}
                        >
                          {c.icon ?? '💬'}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13.5px] font-semibold text-[var(--ph-text)]">
                              {c.title}
                            </span>
                            <span className="shrink-0 text-[10px] text-[var(--ph-text-muted)] tabular-nums">
                              {smartTime(c.lastMessageAt)}
                            </span>
                          </span>
                          <span className="truncate text-xs text-[var(--ph-text-muted)]">
                            {preview || 'New group · no messages yet'}
                          </span>
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() => setConfirming(c)}
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

      {/* Segmented config nav */}
      <nav className="shrink-0 border-t border-[var(--ph-border)] p-2">
        <div className="flex gap-1">
          {CONFIG_NAV.map((item) => {
            const Icon = item.icon
            const isActive = activePage === item.page
            return (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigateConfig(item.page)}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  'flex h-9 items-center justify-center gap-1.5 rounded-[var(--ph-radius-md)] text-xs font-medium transition-all',
                  isActive
                    ? 'flex-1 px-2.5 text-[var(--ph-primary-ink)]'
                    : 'w-9 text-[var(--ph-text-muted)] hover:bg-[var(--ph-canvas)]'
                )}
                style={
                  isActive
                    ? { background: 'var(--ph-primary-soft)' }
                    : undefined
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {isActive && <span className="truncate">{item.label}</span>}
              </button>
            )
          })}
        </div>
      </nav>

      {/* Back to chat */}
      <div className="shrink-0 border-t border-[var(--ph-border)] p-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex w-full items-center gap-2.5 rounded-[var(--ph-radius-md)] px-2 py-2 text-left text-sm text-[var(--ph-text-muted)] transition-colors hover:bg-[var(--ph-canvas)] hover:text-[var(--ph-text)]"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span className="truncate">Back to chat</span>
        </button>
      </div>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <AlertDialogContent className="rounded-[var(--ph-radius-2xl)] border-[var(--ph-border)] bg-[var(--ph-surface)] shadow-[var(--ph-shadow-card)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming ? (
                <>
                  <span className="rounded-[var(--ph-radius-sm)] bg-[var(--ph-canvas)] px-1.5 py-0.5 font-mono text-xs">
                    {confirming.title}
                  </span>{' '}
                  and all its messages, tasks, and executions will be
                  permanently removed.
                </>
              ) : (
                ''
              )}
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
              className="bg-[var(--ph-danger)] text-white hover:opacity-90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
