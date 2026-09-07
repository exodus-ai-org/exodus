import { TEST_IDS } from '@shared/constants/test-ids'
import { useSetAtom } from 'jotai'
import { SearchIcon, SquarePenIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
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
        className={cn('draggable gap-1 pt-11 transition-all', {
          ['pt-2']: isFullscreen
        })}
      >
        <div className="flex items-center justify-between gap-1 px-1 pb-1">
          <WorkspaceSwitcher />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Search chats"
            data-testid={TEST_IDS.chatLayout.searchButton}
            onClick={() => setIsFullTextSearchVisible(true)}
            className="no-drag text-muted-foreground hover:bg-sidebar-accent hover:text-foreground rounded-full"
          >
            <SearchIcon />
          </Button>
        </div>
        <SidebarMenu className="gap-1">
          <SidebarMenuItem
            className="no-drag hover:bg-sidebar-accent flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150"
            onClick={() => (window.location.href = '/')}
          >
            <SquarePenIcon size={16} />
            New chat
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
