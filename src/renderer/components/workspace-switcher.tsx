import { TEST_IDS } from '@shared/constants/test-ids'
import { CheckIcon, ChevronDownIcon, MessageSquareIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { MusicConductor } from '@/components/icons/music-conductor'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const WORKSPACES = [
  { id: 'chat', label: 'Chat', icon: MessageSquareIcon, path: '/' },
  {
    id: 'philharmonic',
    label: 'Philharmonic',
    icon: MusicConductor,
    path: '/philharmonic'
  }
] as const

/**
 * ChatGPT-style workspace picker pinned to the top-left of the sidebar. Shows
 * the current surface (Chat / Philharmonic) and switches between them.
 */
export function WorkspaceSwitcher() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const active =
    WORKSPACES.find((w) => w.id !== 'chat' && pathname.includes(w.id)) ??
    WORKSPACES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-testid={TEST_IDS.chatLayout.workspaceSwitcher}
        className={cn(
          'no-drag -ml-1 flex w-fit items-center gap-1 rounded-lg px-2 py-1',
          'text-lg transition-colors',
          'hover:bg-sidebar-accent focus-visible:outline-hidden data-popup-open:bg-sidebar-accent'
        )}
      >
        <span className="font-semibold">{active.label}</span>
        <ChevronDownIcon className="text-muted-foreground size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="no-drag w-48 rounded-lg">
        {WORKSPACES.map((w) => (
          <DropdownMenuItem
            key={w.id}
            className="gap-2"
            onClick={() => navigate(w.path)}
          >
            <w.icon className="text-muted-foreground size-4" />
            <span className="flex-1">{w.label}</span>
            {w.id === active.id && <CheckIcon className="size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
