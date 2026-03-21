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
      className="border-none [--sidebar-accent-foreground:oklch(0.2_0_0)] [--sidebar-accent:oklch(0_0_0/_8%)] [--sidebar-border:transparent] [--sidebar-foreground:oklch(0.2_0_0)] dark:[--sidebar-accent-foreground:oklch(0.92_0_0)] dark:[--sidebar-accent:oklch(1_0_0/_12%)] dark:[--sidebar-foreground:oklch(0.92_0_0)]"
      sidebarInnerClx="bg-transparent text-foreground"
      {...props}
    >
      <SidebarHeader
        className={cn('draggable gap-1 pt-13 transition-all', {
          ['pt-2']: isFullscreen
        })}
      >
        <SidebarMenu className="gap-1">
          <SidebarMenuItem
            className="no-drag hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            onClick={() => (window.location.href = '/')}
          >
            <SquarePenIcon size={16} />
            New chat
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem
            className="no-drag hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm"
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
