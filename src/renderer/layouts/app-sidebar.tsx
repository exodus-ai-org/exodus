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
import { Search, SquarePen } from 'lucide-react'
import * as React from 'react'
import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar {...props}>
      <SidebarHeader className={cn('mt-13 gap-1', { ['mt-1']: isFullscreen })}>
        <SidebarMenu>
          <SidebarMenuItem
            className="hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsFullTextSearchVisible(true)
            }}
          >
            <SquarePen size={16} />
            New chat
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          <SidebarMenuItem
            className="hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm"
            onClick={() => setIsFullTextSearchVisible(true)}
          >
            <Search size={16} />
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
