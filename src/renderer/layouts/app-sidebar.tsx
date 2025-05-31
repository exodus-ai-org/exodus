import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { isFullTextSearchVisibleAtom } from '@/stores/chat'
import { useSetAtom } from 'jotai'
import { Bot, Plus, Search } from 'lucide-react'
import * as React from 'react'
import { version } from '../../../package.json'
import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar {...props} className="!border-r-0">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center justify-between p-2">
              <div className="flex gap-2">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Exodus</span>
                  <span className="truncate text-xs">v{version}</span>
                </div>
              </div>

              <div className="flex gap-1">
                <span
                  className="text-accent-foreground hover:bg-accent cursor-pointer rounded-sm p-2"
                  onClick={() => setIsFullTextSearchVisible(true)}
                >
                  <Search strokeWidth={2.5} size={20} />
                </span>
                <span
                  className="text-accent-foreground hover:bg-accent cursor-pointer rounded-sm p-2"
                  onClick={() => {
                    window.location.hash = '#/'
                  }}
                >
                  <Plus strokeWidth={2.5} size={20} />
                </span>
              </div>
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
