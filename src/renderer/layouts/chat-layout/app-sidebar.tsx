import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { useSetAtom } from 'jotai'
import { SearchIcon, SquarePenIcon } from 'lucide-react'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger
} from '@/components/ui/sidebar'
import { WorkspaceSwitcher } from '@/components/workspace-switcher'
import { useIsFullscreen } from '@/hooks/use-is-full-screen'
import { MOD_KEY } from '@/hooks/use-keyboard-shortcuts'
import { cn } from '@/lib/utils'
import { isFullTextSearchVisibleAtom } from '@/stores/chat'

import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { t } = useTranslation('chat')
  const isFullscreen = useIsFullscreen()
  const navigate = useNavigate()
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
      <SidebarHeader className="draggable gap-2 pt-2">
        {/* The title bar's row: the sidebar toggle to the right of the traffic
            lights, where Notes and ChatGPT keep it — at the same spot it takes
            in the content header once the sidebar is away, so it does not
            jump; in fullscreen the lights are gone and it moves to the edge. */}
        <div
          className={cn(
            'flex h-7 items-center transition-[padding] duration-200 ease-out mt-px',
            isFullscreen ? 'pl-2' : 'pl-21'
          )}
        >
          <SidebarTrigger className="no-drag text-muted-foreground hover:text-foreground" />
        </div>
        <div className="flex items-center px-1">
          <WorkspaceSwitcher />
        </div>
        <SidebarMenu className="no-drag gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton
              data-testid={TEST_IDS.chatLayout.newChat}
              onClick={() => navigate('/')}
            >
              <SquarePenIcon />
              <span>{t('sidebar.newChat')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              data-testid={TEST_IDS.chatLayout.searchButton}
              onClick={() => setIsFullTextSearchVisible(true)}
            >
              <SearchIcon />
              <span className="flex-1">{t('sidebar.searchChats')}</span>
              <span className="text-muted-foreground text-xs tracking-wide">
                {MOD_KEY}⇧F
              </span>
            </SidebarMenuButton>
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
