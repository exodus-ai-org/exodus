import { TEST_IDS } from '@shared/constants/test-ids'
import { useSetAtom } from 'jotai'
import { SearchIcon, SquarePenIcon } from 'lucide-react'
import * as React from 'react'

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
import { MOD_KEY } from '@/hooks/use-keyboard-shortcuts'
import { cn } from '@/lib/utils'
import { isFullTextSearchVisibleAtom } from '@/stores/chat'

import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'
import { NavProjects } from './nav-projects'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar
      collapsible="none"
      className={cn(
        'text-foreground h-full w-full border-none bg-transparent',
        '[--sidebar-accent:rgb(0_0_0/0.05)] dark:[--sidebar-accent:rgb(255_255_255/0.07)]'
      )}
      {...props}
    >
      <SidebarHeader
        className={cn('draggable gap-2 pt-11 transition-[padding]', {
          ['pt-2']: isFullscreen
        })}
      >
        <div className="flex items-center px-1">
          <WorkspaceSwitcher />
        </div>
        <SidebarMenu className="no-drag gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              data-testid={TEST_IDS.chatLayout.newChat}
              onClick={() => (window.location.href = '/')}
            >
              <SquarePenIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              data-testid={TEST_IDS.chatLayout.searchButton}
              onClick={() => setIsFullTextSearchVisible(true)}
            >
              <SearchIcon />
              <span className="flex-1">Search chats</span>
              <span className="text-muted-foreground text-xs tracking-wide">
                {MOD_KEY}⇧F
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        <NavProjects />
        <NavHistories />
      </SidebarContent>
      <SidebarFooter>
        <NavFooter className="mt-auto" />
      </SidebarFooter>
    </Sidebar>
  )
}
