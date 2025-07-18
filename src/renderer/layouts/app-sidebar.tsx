import { Input } from '@/components/ui/input'
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
import { Search } from 'lucide-react'
import * as React from 'react'
import { NavFooter } from './nav-footer'
import { NavHistories } from './nav-histories'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const isFullscreen = useIsFullscreen()
  const setIsFullTextSearchVisible = useSetAtom(isFullTextSearchVisibleAtom)

  return (
    <Sidebar {...props} className="!border-r-0">
      <SidebarHeader className="mt-4">
        <SidebarMenu className={cn({ ['mt-8']: !isFullscreen })}>
          <SidebarMenuItem
            className="relative"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsFullTextSearchVisible(true)
            }}
          >
            <Search size={16} className="absolute top-2.5 left-2" />
            <Input className="pl-8 shadow-none" placeholder="Search chat..." />
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
