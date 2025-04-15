import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import { Bot, Plus } from 'lucide-react'
import * as React from 'react'
import { NavHistories } from './nav-histories'
import { NavSecondary } from './nav-secondary'
import { SearchForm } from './search-form'

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Bot className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Exodus</span>
                  <span className="truncate text-xs">v1.0.0</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="flex items-center justify-between">
          <SearchForm />
          <Button
            size="icon"
            variant="ghost"
            onClick={() => {
              window.location.href = '/'
            }}
          >
            <Plus />
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent className="no-scrollbar">
        <NavHistories />
      </SidebarContent>
      <SidebarFooter>
        <NavSecondary className="mt-auto" />
      </SidebarFooter>
    </Sidebar>
  )
}
