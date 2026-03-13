import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { cn } from '@/lib/utils'
import { isFullTextSearchVisibleAtom } from '@/stores/chat'
import { useSetAtom } from 'jotai'
import { SearchIcon, SquarePenIcon } from 'lucide-react'
import * as React from 'react'
import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar {...props}>
      {/* Draggable zone covering the macOS traffic-light area */}
      <div
        className={cn('draggable absolute inset-x-0 top-0 z-10 h-13', {
          ['h-2']: isFullscreen
        })}
      />
      <SidebarHeader
        className={cn('gap-1 pt-13 transition-all', { ['pt-2']: isFullscreen })}
      >
        <SidebarMenu>
          <SidebarMenuItem
            className="no-draggable hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            onClick={() => (window.location.href = '/')}
          >
            <SquarePenIcon size={16} />
            New chat
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem
            className="no-draggable hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            onClick={() => setIsFullTextSearchVisible(true)}
          >
            <SearchIcon size={16} />
            Search chats
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        <NavHistories />
      </SidebarContent>
      <SidebarFooter>
        <NavFooter className="mt-auto" />
      </SidebarFooter>
    </Sidebar>
  )
}
