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
import { MessageCirclePlus, Search } from 'lucide-react'
import * as React from 'react'
import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar {...props} className="!border-r-0">
      <SidebarHeader className="draggable">
        <SidebarMenu
          className={cn({ ['mt-8']: !isFullscreen }, 'no-draggable')}
        >
          <SidebarMenuItem>
            <div
              className="text-accent-foreground hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 font-medium"
              onClick={() => {
                window.location.href = '/'
              }}
            >
              <MessageCirclePlus strokeWidth={2.5} size={18} /> New Chat
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <div
              className="text-accent-foreground hover:bg-accent flex cursor-pointer items-center gap-2 rounded-sm p-2 font-medium"
              onClick={() => setIsFullTextSearchVisible(true)}
            >
              <Search strokeWidth={2.5} size={18} /> Search Chat History
            </div>
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
