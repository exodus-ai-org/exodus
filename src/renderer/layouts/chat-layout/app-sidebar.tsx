import { useAtom, useSetAtom } from 'jotai'
import {
  FolderIcon,
  MessageSquareIcon,
  SearchIcon,
  SquarePenIcon
} from 'lucide-react'
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
import { sidebarTabAtom, type SidebarTab } from '@/stores/project'

import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'
import { NavProjects } from './nav-projects'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)
  const [sidebarTab, setSidebarTab] = useAtom(sidebarTabAtom)

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

        {/* Tab switcher */}
        <div className="bg-muted flex gap-1 rounded-lg p-0.5">
          {(
            [
              { key: 'chats', label: 'Chats', icon: MessageSquareIcon },
              { key: 'projects', label: 'Projects', icon: FolderIcon }
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSidebarTab(key as SidebarTab)}
              className={cn(
                'no-drag flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors',
                sidebarTab === key
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        {sidebarTab === 'chats' ? <NavHistories /> : <NavProjects />}
      </SidebarContent>
      <SidebarFooter>
        <NavFooter className="mt-auto" />
      </SidebarFooter>
    </Sidebar>
  )
}
