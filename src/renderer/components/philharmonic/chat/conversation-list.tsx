// src/renderer/components/philharmonic/chat/conversation-list.tsx
import { TEST_IDS } from '@shared/constants/test-ids'
import {
  differenceInCalendarDays,
  format,
  isToday,
  isYesterday
} from 'date-fns'
import {
  LayoutDashboardIcon,
  SearchIcon,
  SquarePenIcon,
  Trash2,
  UsersIcon
} from 'lucide-react'
import { useMemo, useState } from 'react'

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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from '@/components/ui/input-group'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import type { AgentData, ConversationData } from '@/stores/philharmonic'

import { hueStyle, pickHue } from '../lib/hue'

export type ConfigPage = 'workforce' | 'dashboard'

const CONFIG_NAV: Array<{
  page: ConfigPage
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { page: 'workforce', label: 'Workforce', icon: UsersIcon },
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
    <Sidebar
      collapsible="none"
      className={cn(
        'text-foreground h-full w-full border-none bg-transparent',
        '[--sidebar-accent:rgb(0_0_0/0.05)] dark:[--sidebar-accent:rgb(255_255_255/0.07)]'
      )}
    >
      <SidebarHeader
        className={cn('draggable gap-1 pt-11 transition-all', {
          ['pt-2']: isFullscreen
        })}
      >
        <div className="flex items-center px-1 pb-1">
          <WorkspaceSwitcher />
        </div>

        <div className="no-drag px-1">
          <InputGroup className="has-[[data-slot=input-group-control]:focus-visible]:border-transparent has-[[data-slot=input-group-control]:focus-visible]:ring-0">
            <InputGroupInput
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups"
            />
            <InputGroupAddon align="inline-start">
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <SidebarMenu className="gap-1">
          <SidebarMenuItem
            className="no-drag hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
            onClick={onCreate}
            data-testid={TEST_IDS.philharmonic.newGroup}
          >
            <SquarePenIcon size={16} />
            New group
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar px-1">
        {conversations.length === 0 ? (
          <PhilharmonicEmptyState
            avatars={[{ hue: 'lilac' }, { hue: 'mint' }, { hue: 'peach' }]}
            title="No groups yet"
            description="Create one to message your virtual team."
            action={{ label: '+ New group', onClick: onCreate }}
          />
        ) : filtered.length === 0 ? (
          <div className="text-muted-foreground flex h-full items-center justify-center px-4 text-center text-xs">
            No groups match &ldquo;{query}&rdquo;
          </div>
        ) : (
          <SidebarMenu className="gap-0.5">
            {filtered.map((c) => {
              const isActive = activePage === 'chat' && c.id === activeId
              const preview = previewLine(c.latestMessage, agentsById)
              return (
                <SidebarMenuItem key={c.id}>
                  <ContextMenu>
                    <ContextMenuTrigger>
                      <button
                        type="button"
                        onClick={() => onSelect(c.id)}
                        className={cn(
                          'flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors',
                          isActive
                            ? 'bg-sidebar-accent'
                            : 'hover:bg-sidebar-accent/60'
                        )}
                      >
                        <span
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
                          style={hueStyle(pickHue(c.id))}
                        >
                          {c.icon ?? '💬'}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-medium">
                              {c.title}
                            </span>
                            <span className="text-muted-foreground shrink-0 text-[10px] tabular-nums">
                              {smartTime(c.lastMessageAt)}
                            </span>
                          </span>
                          <span className="text-muted-foreground truncate text-xs">
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
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu className="gap-0.5">
          {CONFIG_NAV.map((item) => {
            const Icon = item.icon
            return (
              <SidebarMenuItem key={item.page}>
                <SidebarMenuButton
                  isActive={activePage === item.page}
                  onClick={() => onNavigateConfig(item.page)}
                >
                  <Icon />
                  {item.label}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarFooter>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this group?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirming ? (
                <>
                  <span className="bg-muted rounded-sm px-1.5 py-0.5 font-mono text-xs">
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
              variant="destructive"
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
    </Sidebar>
  )
}
