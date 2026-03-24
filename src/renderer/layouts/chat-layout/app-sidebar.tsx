import { useSetAtom } from 'jotai'
import { SearchIcon, SquarePenIcon } from 'lucide-react'
import * as React from 'react'

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

import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar
      collapsible="offcanvas"
      className="border-none [--sidebar-border:transparent]"
      sidebarInnerClx="bg-transparent text-foreground"
      {...props}
    >
      <SidebarHeader
        className={cn('draggable gap-1 pt-11 transition-all', {
          ['pt-2']: isFullscreen
        })}
      >
        <SidebarMenu className="gap-1">
          <SidebarMenuItem
            className="no-drag hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
            onClick={() => (window.location.href = '/')}
          >
            <SquarePenIcon size={16} />
            New chat
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem
            className="no-drag hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
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
